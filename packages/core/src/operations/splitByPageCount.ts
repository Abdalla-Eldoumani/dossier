// Split a PDF into chunks of N pages each. The last chunk holds the remainder.
// Returns raw bytes — splits typically feed straight into a download list.

import { z } from "zod";
import { PDFDocument } from "pdf-lib";
import type { PDFInput } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { loadPdf } from "../internal/loadPdf.js";

export const SplitByPageCountSchema = z.number().int().positive();

export async function splitByPageCount(input: PDFInput, n: number): Promise<Uint8Array[]> {
  if (!Number.isInteger(n) || n <= 0) {
    throw new OperationError(
      "INVALID_INPUT",
      "splitByPageCount requires a positive integer page count.",
    );
  }

  const source = await loadPdf(input);
  const total = source.getPageCount();

  const outputs: Uint8Array[] = [];
  for (let start = 0; start < total; start += n) {
    const end = Math.min(start + n, total);
    const chunk = await PDFDocument.create();
    const indices = Array.from({ length: end - start }, (_, i) => start + i);
    const copied = await chunk.copyPages(source, indices);
    for (const page of copied) chunk.addPage(page);
    const bytes = await chunk.save();
    outputs.push(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  }

  return outputs;
}
