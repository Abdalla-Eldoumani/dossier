// Duplicate the specified pages in place — each appears twice in the output,
// once at its original position and once immediately after.

import { z } from "zod";
import { PDFDocument } from "pdf-lib";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { loadPdf } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";

export const DuplicatePagesSchema = z.array(z.number().int().nonnegative()).min(1);

export async function duplicatePages(input: PDFInput, indices: number[]): Promise<PDFOutput> {
  if (!Array.isArray(indices) || indices.length === 0) {
    throw new OperationError("INVALID_INPUT", "duplicatePages requires at least one page index.");
  }

  const source = await loadPdf(input);
  const total = source.getPageCount();

  for (const i of indices) {
    if (!Number.isInteger(i) || i < 0 || i >= total) {
      throw new OperationError(
        "INVALID_INPUT",
        `Page index ${i} is out of bounds for a ${total}-page PDF.`,
      );
    }
  }

  const toDuplicate = new Set(indices);

  const newOrder: number[] = [];
  for (let i = 0; i < total; i++) {
    newOrder.push(i);
    if (toDuplicate.has(i)) newOrder.push(i);
  }

  const out = await PDFDocument.create();
  const copied = await out.copyPages(source, newOrder);
  for (const page of copied) out.addPage(page);

  return savePdf(out, { operation: "duplicate" });
}
