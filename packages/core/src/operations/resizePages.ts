// Resize the specified pages to a target size. When scaleContent is true,
// existing content is scaled to fit the new dimensions; otherwise the page
// boundary changes but the content keeps its absolute positions.

import { z } from "zod";
import type { PDFInput, PDFOutput, PageSize } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { loadPdf } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";
import { PageSizeSchema } from "./insertBlankPage.js";

export const ResizePagesSchema = z.object({
  indices: z.array(z.number().int().nonnegative()).min(1),
  size: PageSizeSchema,
  scaleContent: z.boolean().default(false),
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

export async function resizePages(
  input: PDFInput,
  indices: number[],
  size: PageSize,
  scaleContent: boolean,
): Promise<PDFOutput> {
  if (!Array.isArray(indices) || indices.length === 0) {
    throw new OperationError("INVALID_INPUT", "resizePages requires at least one page index.");
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

  const [newWidth, newHeight] = dimensionsOf(size);

  for (const i of indices) {
    const page = doc.getPage(i);
    if (scaleContent) {
      const { width: oldWidth, height: oldHeight } = page.getSize();
      page.scaleContent(newWidth / oldWidth, newHeight / oldHeight);
    }
    page.setSize(newWidth, newHeight);
  }

  return savePdf(doc, { operation: "resize" });
}
