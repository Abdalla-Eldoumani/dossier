// Basic compression. pdf-lib's save() with object streams enabled trims the
// cross-reference table and metadata; image re-encoding (the part that would
// actually shrink scan-heavy documents) needs PDFium and is a follow-up.
//
// If the resulting bytes aren't smaller than the input, the input is returned
// unchanged with a notes flag — overpromising would lie to the user.

import { z } from "zod";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { loadPdf, toBytes } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";

export const CompressPdfSchema = z.object({
  level: z.enum(["low", "medium", "high"]).optional(),
});

export type CompressLevel = "low" | "medium" | "high";

export async function compressPdf(
  input: PDFInput,
  _level: CompressLevel = "medium",
): Promise<PDFOutput> {
  const inputBytes = toBytes(input);
  const inputSize = inputBytes.byteLength;

  const doc = await loadPdf(input);
  const result = await savePdf(doc, {
    operation: "compress",
    useObjectStreams: true,
    notes: [
      "Basic compression: cross-reference table and object streams only. " +
        "Image re-encoding is not yet wired up.",
    ],
  });

  if (result.bytes.byteLength >= inputSize) {
    return {
      bytes: inputBytes,
      meta: {
        pageCount: doc.getPageCount(),
        fileSize: inputSize,
        operation: "compress",
        notes: ["Already optimised — input returned unchanged."],
      },
    };
  }

  return result;
}
