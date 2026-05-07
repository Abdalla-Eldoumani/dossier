// Pull a set of pages out of a PDF as a new document. Order in the output
// matches the order of the indices argument; duplicates are allowed.

import { z } from "zod";
import { PDFDocument } from "pdf-lib";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { loadPdf } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";

export const ExtractPagesSchema = z.array(z.number().int().nonnegative()).min(1);

export async function extractPages(input: PDFInput, indices: number[]): Promise<PDFOutput> {
  if (!Array.isArray(indices) || indices.length === 0) {
    throw new OperationError("INVALID_INPUT", "extractPages requires at least one page index.");
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

  const out = await PDFDocument.create();
  const copied = await out.copyPages(source, indices);
  for (const page of copied) out.addPage(page);

  return savePdf(out, { operation: "extract" });
}
