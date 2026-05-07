// Reorder a PDF's pages. The newOrder argument must be a permutation of
// [0, total-1] — every original page index appears exactly once.

import { z } from "zod";
import { PDFDocument } from "pdf-lib";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { loadPdf } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";

export const ReorderPagesSchema = z.array(z.number().int().nonnegative()).min(1);

export async function reorderPages(input: PDFInput, newOrder: number[]): Promise<PDFOutput> {
  if (!Array.isArray(newOrder) || newOrder.length === 0) {
    throw new OperationError("INVALID_INPUT", "reorderPages requires a non-empty page order.");
  }

  const source = await loadPdf(input);
  const total = source.getPageCount();

  if (newOrder.length !== total) {
    throw new OperationError(
      "INVALID_INPUT",
      `reorderPages requires exactly ${total} indices for a ${total}-page PDF, got ${newOrder.length}.`,
    );
  }

  const seen = new Set<number>();
  for (const i of newOrder) {
    if (!Number.isInteger(i) || i < 0 || i >= total) {
      throw new OperationError(
        "INVALID_INPUT",
        `Page index ${i} is out of bounds for a ${total}-page PDF.`,
      );
    }
    if (seen.has(i)) {
      throw new OperationError(
        "INVALID_INPUT",
        `Page index ${i} appears more than once. reorderPages requires a permutation.`,
      );
    }
    seen.add(i);
  }

  const out = await PDFDocument.create();
  const copied = await out.copyPages(source, newOrder);
  for (const page of copied) out.addPage(page);

  return savePdf(out, { operation: "reorder" });
}
