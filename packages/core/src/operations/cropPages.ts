// Trim the specified pages to a region. The region uses a top-left origin
// (matching how UIs draw selections); pdf-lib's media/crop boxes use a
// bottom-left origin, so we convert. Both media box and crop box are set so
// readers and downstream operations agree on the trimmed bounds.

import { z } from "zod";
import type { PDFInput, PDFOutput, PageRegion } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { loadPdf } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";

export const PageRegionSchema = z.object({
  x: z.number().nonnegative(),
  y: z.number().nonnegative(),
  width: z.number().positive(),
  height: z.number().positive(),
});

export const CropPagesSchema = z.object({
  indices: z.array(z.number().int().nonnegative()).min(1),
  region: PageRegionSchema,
});

export async function cropPages(
  input: PDFInput,
  indices: number[],
  region: PageRegion,
): Promise<PDFOutput> {
  if (!Array.isArray(indices) || indices.length === 0) {
    throw new OperationError("INVALID_INPUT", "cropPages requires at least one page index.");
  }
  if (region.width <= 0 || region.height <= 0 || region.x < 0 || region.y < 0) {
    throw new OperationError(
      "INVALID_INPUT",
      "cropPages requires a positive region with non-negative origin.",
    );
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

  for (const i of indices) {
    const page = doc.getPage(i);
    const { width: pageWidth, height: pageHeight } = page.getSize();

    if (region.x + region.width > pageWidth || region.y + region.height > pageHeight) {
      throw new OperationError(
        "INVALID_INPUT",
        `Region exceeds the bounds of page ${i} (${pageWidth}x${pageHeight}).`,
      );
    }

    const pdfY = pageHeight - region.y - region.height;
    page.setMediaBox(region.x, pdfY, region.width, region.height);
    page.setCropBox(region.x, pdfY, region.width, region.height);
  }

  return savePdf(doc, { operation: "crop" });
}
