// Linearise (Fast Web View) a PDF — restructure the file so a viewer can
// stream-render the first page while the rest is still downloading. The byte
// surgery this requires (placing the catalog and the first page near the
// start, emitting hint streams, recomputing offsets) is far beyond pdf-lib's
// surface, so the operation accepts an injected PdfLinearizer provider —
// typically PDFium-WASM in the browser or mupdf in Node.

import { z } from "zod";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { OperationError, UnsupportedFeatureError } from "../types/errors.js";
import { toBytes } from "../internal/loadPdf.js";

export const LinearizePdfSchema = z.object({});

export interface PdfLinearizer {
  linearize(bytes: Uint8Array): Promise<Uint8Array>;
}

export async function linearizePdf(
  input: PDFInput,
  linearizer?: PdfLinearizer,
): Promise<PDFOutput> {
  if (!linearizer || typeof linearizer.linearize !== "function") {
    throw new UnsupportedFeatureError(
      "linearizePdf requires a PdfLinearizer provider. The web app and MCP server " +
        "should inject one (PDFium-WASM, mupdf, etc.); pdf-lib v1 cannot rewrite the " +
        "file structure for Fast Web View.",
    );
  }

  const inputBytes = toBytes(input);
  let result: Uint8Array;
  try {
    result = await linearizer.linearize(inputBytes);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new OperationError("OPERATION_FAILED", `Linearisation failed: ${message}`);
  }

  return {
    bytes: result,
    meta: {
      pageCount: 0,
      fileSize: result.byteLength,
      operation: "linearize",
      notes: [
        result.byteLength === inputBytes.byteLength
          ? "Linearised; output is the same size as the input."
          : `Linearised; output is ${result.byteLength} bytes (input was ${inputBytes.byteLength}).`,
      ],
    },
  };
}
