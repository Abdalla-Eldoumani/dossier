// Add a /Highlight annotation over a region. The region uses a top-left
// origin; we convert to PDF's bottom-left and emit one quad covering the
// rectangle. PDF readers will render the highlight at view time.

import { z } from "zod";
import { PDFString } from "pdf-lib";
import type { PDFInput, PDFOutput, PageRegion } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { loadPdf } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";
import { appendAnnotation } from "../internal/annotations.js";
import { PageRegionSchema } from "./cropPages.js";

export const HighlightOptionsSchema = z.object({
  color: z
    .tuple([
      z.number().min(0).max(1),
      z.number().min(0).max(1),
      z.number().min(0).max(1),
    ])
    .optional(),
  author: z.string().optional(),
  contents: z.string().optional(),
});

export const AddHighlightSchema = z.object({
  pageIndex: z.number().int().nonnegative(),
  region: PageRegionSchema,
  options: HighlightOptionsSchema.optional(),
});

export type HighlightOptions = z.infer<typeof HighlightOptionsSchema>;

export async function addHighlight(
  input: PDFInput,
  pageIndex: number,
  region: PageRegion,
  options: HighlightOptions = {},
): Promise<PDFOutput> {
  if (!Number.isInteger(pageIndex) || pageIndex < 0) {
    throw new OperationError(
      "INVALID_INPUT",
      "addHighlight requires a non-negative integer pageIndex.",
    );
  }
  if (region.width <= 0 || region.height <= 0 || region.x < 0 || region.y < 0) {
    throw new OperationError(
      "INVALID_INPUT",
      "addHighlight requires a positive region with non-negative origin.",
    );
  }

  const doc = await loadPdf(input);
  const total = doc.getPageCount();
  if (pageIndex >= total) {
    throw new OperationError(
      "INVALID_INPUT",
      `pageIndex ${pageIndex} is out of bounds for a ${total}-page PDF.`,
    );
  }

  const page = doc.getPage(pageIndex);
  const { width: pageWidth, height: pageHeight } = page.getSize();
  if (region.x + region.width > pageWidth || region.y + region.height > pageHeight) {
    throw new OperationError(
      "INVALID_INPUT",
      `Region exceeds page bounds (${pageWidth}x${pageHeight}).`,
    );
  }

  const x1 = region.x;
  const x2 = region.x + region.width;
  const y1 = pageHeight - region.y - region.height;
  const y2 = pageHeight - region.y;

  const [r, g, b] = options.color ?? [1, 1, 0];

  const annotDict = doc.context.obj({
    Type: "Annot",
    Subtype: "Highlight",
    Rect: [x1, y1, x2, y2],
    QuadPoints: [x1, y2, x2, y2, x1, y1, x2, y1],
    C: [r, g, b],
    F: 4,
    ...(options.contents ? { Contents: PDFString.of(options.contents) } : {}),
    ...(options.author ? { T: PDFString.of(options.author) } : {}),
  });
  const annotRef = doc.context.register(annotDict);
  appendAnnotation(page, annotRef, doc);

  return savePdf(doc, { operation: "highlight" });
}
