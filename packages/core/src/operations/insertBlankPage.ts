// Insert a blank page at a chosen position. Size accepts either a named preset
// (A4, Letter, etc.) or a custom { width, height } in PDF points.

import { z } from "zod";
import type { PDFInput, PDFOutput, PageSize } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { loadPdf } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";

export const PageSizeSchema = z.union([
  z.object({ name: z.enum(["A4", "A3", "A5", "Letter", "Legal", "Tabloid"]) }),
  z.object({
    custom: z.object({ width: z.number().positive(), height: z.number().positive() }),
  }),
]);

export const InsertBlankPageSchema = z.object({
  atIndex: z.number().int().nonnegative(),
  size: PageSizeSchema,
});

function dimensionsOf(size: PageSize): [number, number] {
  if ("custom" in size) return [size.custom.width, size.custom.height];
  switch (size.name) {
    case "A4":
      return [595, 842];
    case "A3":
      return [842, 1191];
    case "A5":
      return [420, 595];
    case "Letter":
      return [612, 792];
    case "Legal":
      return [612, 1008];
    case "Tabloid":
      return [792, 1224];
  }
}

export async function insertBlankPage(
  input: PDFInput,
  atIndex: number,
  size: PageSize,
): Promise<PDFOutput> {
  if (!Number.isInteger(atIndex) || atIndex < 0) {
    throw new OperationError(
      "INVALID_INPUT",
      "insertBlankPage requires a non-negative integer atIndex.",
    );
  }

  const doc = await loadPdf(input);
  const total = doc.getPageCount();
  if (atIndex > total) {
    throw new OperationError(
      "INVALID_INPUT",
      `atIndex ${atIndex} is past the end of a ${total}-page PDF.`,
    );
  }

  const [width, height] = dimensionsOf(size);
  doc.insertPage(atIndex, [width, height]);

  return savePdf(doc, { operation: "insert-blank" });
}
