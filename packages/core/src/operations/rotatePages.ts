// Rotate the specified pages by an additive amount. Existing rotation is
// preserved and incremented; the result is normalised to [0, 360).

import { z } from "zod";
import { degrees } from "pdf-lib";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { loadPdf } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";

const VALID_ROTATIONS = new Set([90, 180, 270, -90, -180, -270]);

export const RotatePagesSchema = z.object({
  indices: z.array(z.number().int().nonnegative()).min(1),
  degrees: z.union([
    z.literal(90),
    z.literal(180),
    z.literal(270),
    z.literal(-90),
    z.literal(-180),
    z.literal(-270),
  ]),
});

export async function rotatePages(
  input: PDFInput,
  indices: number[],
  deg: number,
): Promise<PDFOutput> {
  if (!Array.isArray(indices) || indices.length === 0) {
    throw new OperationError("INVALID_INPUT", "rotatePages requires at least one page index.");
  }
  if (!VALID_ROTATIONS.has(deg)) {
    throw new OperationError(
      "INVALID_INPUT",
      "rotatePages degrees must be one of 90, 180, 270, -90, -180, -270.",
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
    const current = page.getRotation().angle;
    const next = (((current + deg) % 360) + 360) % 360;
    page.setRotation(degrees(next));
  }

  return savePdf(doc, { operation: "rotate" });
}
