// Split a PDF into one output per user-supplied range. Ranges are 0-indexed,
// `from` inclusive, `to` exclusive. Ranges may not overlap and must be in bounds.

import { z } from "zod";
import { PDFDocument } from "pdf-lib";
import type { PDFInput } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { loadPdf } from "../internal/loadPdf.js";

export const PageRangeSchema = z.object({
  from: z.number().int().nonnegative(),
  to: z.number().int().positive(),
});

export const SplitByRangesSchema = z.array(PageRangeSchema).min(1);

export type PageRange = z.infer<typeof PageRangeSchema>;

export async function splitByRanges(input: PDFInput, ranges: PageRange[]): Promise<Uint8Array[]> {
  if (!Array.isArray(ranges) || ranges.length === 0) {
    throw new OperationError("INVALID_INPUT", "splitByRanges requires at least one range.");
  }

  const source = await loadPdf(input);
  const total = source.getPageCount();

  // Sort a copy by `from` to detect overlaps in linear time without mutating the caller's input.
  const sorted = [...ranges].sort((a, b) => a.from - b.from);
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i]!;
    if (r.from < 0 || r.to > total || r.from >= r.to) {
      throw new OperationError(
        "INVALID_INPUT",
        `Range { from: ${r.from}, to: ${r.to} } is out of bounds or empty for a ${total}-page PDF.`,
      );
    }
    if (i > 0) {
      const prev = sorted[i - 1]!;
      if (r.from < prev.to) {
        throw new OperationError(
          "INVALID_INPUT",
          `Ranges overlap: { ${prev.from}, ${prev.to} } and { ${r.from}, ${r.to} }.`,
        );
      }
    }
  }

  // Emit outputs in the caller's original order, not the sorted order.
  const outputs: Uint8Array[] = [];
  for (const range of ranges) {
    const chunk = await PDFDocument.create();
    const indices = Array.from({ length: range.to - range.from }, (_, i) => range.from + i);
    const copied = await chunk.copyPages(source, indices);
    for (const page of copied) chunk.addPage(page);
    const bytes = await chunk.save();
    outputs.push(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  }

  return outputs;
}
