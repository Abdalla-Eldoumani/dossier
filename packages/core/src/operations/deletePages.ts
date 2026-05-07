// Remove the specified pages from a PDF. Refuses if every page would be removed —
// a PDF must have at least one page.

import { z } from "zod";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { loadPdf } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";

export const DeletePagesSchema = z.array(z.number().int().nonnegative()).min(1);

export async function deletePages(input: PDFInput, indices: number[]): Promise<PDFOutput> {
  if (!Array.isArray(indices) || indices.length === 0) {
    throw new OperationError("INVALID_INPUT", "deletePages requires at least one page index.");
  }

  const doc = await loadPdf(input);
  const total = doc.getPageCount();

  for (const i of indices) {
    if (!Number.isInteger(i) || i < 0 || i >= total) {
      throw new OperationError(
        "INVALID_INPUT",
        `Page index ${i} is out of bounds for a ${total}-page PDF.`,
      );
    }
  }

  const unique = Array.from(new Set(indices)).sort((a, b) => b - a);
  if (unique.length >= total) {
    throw new OperationError(
      "INVALID_INPUT",
      "deletePages would remove every page; a PDF must have at least one page.",
    );
  }

  // Remove from the highest index downward so lower indices stay stable.
  for (const i of unique) {
    doc.removePage(i);
  }

  return savePdf(doc, { operation: "delete" });
}
