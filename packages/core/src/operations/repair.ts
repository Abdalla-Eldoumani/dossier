// Best-effort repair. Two-stage:
//   1. Try pdf-lib's lenient parse (`throwOnInvalidObject: false`,
//      `ignoreEncryption: true`) and re-save with object streams. Fixes
//      missing xrefs, dangling objects, and similar low-grade corruption.
//   2. If pdf-lib still can't load the bytes, fall back to an injected
//      PdfRepairer (PDFium-WASM, mupdf, etc.) for deeper recovery.
//
// Without a provider, the second stage throws CORRUPT_PDF so callers can
// surface a "we tried, here's the parse error" message.

import { z } from "zod";
import { PDFDocument } from "pdf-lib";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { toBytes } from "../internal/loadPdf.js";

export const RepairSchema = z.object({});

export interface PdfRepairer {
  repair(bytes: Uint8Array): Promise<Uint8Array>;
}

export async function repair(
  input: PDFInput,
  repairer?: PdfRepairer,
): Promise<PDFOutput> {
  const bytes = toBytes(input);

  let doc: PDFDocument | undefined;
  let pdfLibError: Error | undefined;
  try {
    doc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
    });
  } catch (err) {
    pdfLibError = err instanceof Error ? err : new Error(String(err));
  }

  if (doc) {
    const saved = await doc.save({ useObjectStreams: true });
    const out = saved instanceof Uint8Array ? saved : new Uint8Array(saved);
    return {
      bytes: out,
      meta: {
        pageCount: doc.getPageCount(),
        fileSize: out.byteLength,
        operation: "repair",
        notes: ["Repaired via pdf-lib parse + re-save (xref table rebuilt)."],
      },
    };
  }

  if (!repairer || typeof repairer.repair !== "function") {
    throw new OperationError(
      "CORRUPT_PDF",
      `pdf-lib could not parse the PDF: ${pdfLibError?.message ?? "unknown error"}. ` +
        "Provide a PdfRepairer (PDFium-WASM, mupdf, etc.) for deeper recovery.",
    );
  }

  let repaired: Uint8Array;
  try {
    repaired = await repairer.repair(bytes);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new OperationError(
      "CORRUPT_PDF",
      `Both pdf-lib and the PdfRepairer failed: ${message}`,
    );
  }

  return {
    bytes: repaired,
    meta: {
      pageCount: 0,
      fileSize: repaired.byteLength,
      operation: "repair",
      notes: [
        `pdf-lib could not parse the input (${pdfLibError?.message ?? "unknown error"}); ` +
          "recovered via injected PdfRepairer.",
      ],
    },
  };
}
