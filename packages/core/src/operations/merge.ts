// Merge multiple PDFs into one. Pages are appended in input order.
// Reference implementation — every other operation in src/operations/ should follow this shape:
//   1. Zod schema for the public input
//   2. Single async function exporting the operation
//   3. Use loadPdf + savePdf from internal/
//   4. Throw typed errors only

import { z } from "zod";
import { PDFDocument } from "pdf-lib";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { loadPdf } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";

export const MergeOptionsSchema = z.object({
  // Reserved for future options (e.g. normalize page sizes).
}).optional();

export type MergeOptions = z.infer<typeof MergeOptionsSchema>;

export async function mergePdfs(inputs: PDFInput[], _options?: MergeOptions): Promise<PDFOutput> {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new OperationError("INVALID_INPUT", "mergePdfs requires at least one input.");
  }

  const merged = await PDFDocument.create();

  for (const input of inputs) {
    const source = await loadPdf(input);
    const indices = source.getPageIndices();
    const copied = await merged.copyPages(source, indices);
    for (const page of copied) {
      merged.addPage(page);
    }
  }

  return savePdf(merged, { operation: "merge" });
}
