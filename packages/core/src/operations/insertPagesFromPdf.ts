// Copy pages from a source PDF into a target PDF at a chosen position.
// When sourceIndices is omitted, every page from the source is inserted.

import { z } from "zod";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { loadPdf } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";

export const InsertPagesFromPdfSchema = z.object({
  atIndex: z.number().int().nonnegative(),
  sourceIndices: z.array(z.number().int().nonnegative()).optional(),
});

export async function insertPagesFromPdf(
  target: PDFInput,
  source: PDFInput,
  atIndex: number,
  sourceIndices?: number[],
): Promise<PDFOutput> {
  if (!Number.isInteger(atIndex) || atIndex < 0) {
    throw new OperationError(
      "INVALID_INPUT",
      "insertPagesFromPdf requires a non-negative integer atIndex.",
    );
  }

  const targetDoc = await loadPdf(target);
  const sourceDoc = await loadPdf(source);
  const targetTotal = targetDoc.getPageCount();
  const sourceTotal = sourceDoc.getPageCount();

  if (atIndex > targetTotal) {
    throw new OperationError(
      "INVALID_INPUT",
      `atIndex ${atIndex} is past the end of the ${targetTotal}-page target PDF.`,
    );
  }

  const indices = sourceIndices ?? sourceDoc.getPageIndices();
  if (indices.length === 0) {
    throw new OperationError("INVALID_INPUT", "Source has no pages to insert.");
  }

  for (const i of indices) {
    if (!Number.isInteger(i) || i < 0 || i >= sourceTotal) {
      throw new OperationError(
        "INVALID_INPUT",
        `Source page index ${i} is out of bounds for a ${sourceTotal}-page PDF.`,
      );
    }
  }

  const copied = await targetDoc.copyPages(sourceDoc, indices);
  // Insert in reverse so each insertion lands at the correct visual position.
  for (let i = copied.length - 1; i >= 0; i--) {
    targetDoc.insertPage(atIndex, copied[i]!);
  }

  return savePdf(targetDoc, { operation: "insert-from-pdf" });
}
