// Add a /Text annotation (sticky note) at a chosen position. The position
// uses a top-left origin (matching how UIs draw selections); we flip to
// PDF's bottom-left for the annotation Rect.

import { z } from "zod";
import { PDFString } from "pdf-lib";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { loadPdf } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";
import { appendAnnotation } from "../internal/annotations.js";

const ICON_NAMES = [
  "Comment",
  "Help",
  "Insert",
  "Key",
  "NewParagraph",
  "Note",
  "Paragraph",
] as const;

export const TextAnnotationOptionsSchema = z.object({
  iconName: z.enum(ICON_NAMES).optional(),
  open: z.boolean().optional(),
  author: z.string().optional(),
});

export const AddTextAnnotationSchema = z.object({
  pageIndex: z.number().int().nonnegative(),
  position: z.object({ x: z.number().nonnegative(), y: z.number().nonnegative() }),
  text: z.string().min(1),
  options: TextAnnotationOptionsSchema.optional(),
});

export type TextAnnotationOptions = z.infer<typeof TextAnnotationOptionsSchema>;

const ICON_SIZE = 24;

export async function addTextAnnotation(
  input: PDFInput,
  pageIndex: number,
  position: { x: number; y: number },
  text: string,
  options: TextAnnotationOptions = {},
): Promise<PDFOutput> {
  if (!Number.isInteger(pageIndex) || pageIndex < 0) {
    throw new OperationError(
      "INVALID_INPUT",
      "addTextAnnotation requires a non-negative integer pageIndex.",
    );
  }
  if (typeof text !== "string" || text.length === 0) {
    throw new OperationError("INVALID_INPUT", "addTextAnnotation requires non-empty text.");
  }
  if (position.x < 0 || position.y < 0) {
    throw new OperationError(
      "INVALID_INPUT",
      "addTextAnnotation requires a non-negative position.",
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
  const { height: pageHeight } = page.getSize();
  const pdfY = pageHeight - position.y - ICON_SIZE;

  const annotDict = doc.context.obj({
    Type: "Annot",
    Subtype: "Text",
    Rect: [position.x, pdfY, position.x + ICON_SIZE, pdfY + ICON_SIZE],
    Contents: PDFString.of(text),
    Name: options.iconName ?? "Note",
    Open: options.open ?? false,
    ...(options.author ? { T: PDFString.of(options.author) } : {}),
  });
  const annotRef = doc.context.register(annotDict);

  appendAnnotation(page, annotRef, doc);

  return savePdf(doc, { operation: "text-annotation" });
}
