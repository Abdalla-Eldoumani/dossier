// Stamp every page with a text or image watermark. Position can be one of nine
// named anchors or a custom { x, y } offset (PDF points, bottom-left origin to
// match pdf-lib's drawing API). Opacity and rotation apply uniformly across pages.

import { z } from "zod";
import { degrees, rgb, StandardFonts } from "pdf-lib";
import type { PDFDocument, PDFFont, PDFImage } from "pdf-lib";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { loadPdf } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";
import { resolvePosition } from "../internal/positioning.js";

const NamedAnchor = z.enum([
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
]);

export const PositionSchema = z.union([
  NamedAnchor,
  z.object({ x: z.number(), y: z.number() }),
]);

const ColorTuple = z.tuple([
  z.number().min(0).max(1),
  z.number().min(0).max(1),
  z.number().min(0).max(1),
]);

export const TextWatermarkSchema = z.object({
  kind: z.literal("text"),
  text: z.string().min(1),
  font: z.enum(["Helvetica", "TimesRoman", "Courier"]).optional(),
  size: z.number().positive().optional(),
  color: ColorTuple.optional(),
  opacity: z.number().min(0).max(1).optional(),
  rotation: z.number().optional(),
  position: PositionSchema.optional(),
});

export const ImageWatermarkSchema = z.object({
  kind: z.literal("image"),
  image: z.instanceof(Uint8Array),
  scale: z.number().positive().optional(),
  opacity: z.number().min(0).max(1).optional(),
  rotation: z.number().optional(),
  position: PositionSchema.optional(),
});

export const WatermarkSchema = z.discriminatedUnion("kind", [
  TextWatermarkSchema,
  ImageWatermarkSchema,
]);

export type Watermark = z.infer<typeof WatermarkSchema>;
export type Position = z.infer<typeof PositionSchema>;

async function embedImage(doc: PDFDocument, bytes: Uint8Array): Promise<PDFImage> {
  if (bytes.length < 4) {
    throw new OperationError("INVALID_INPUT", "Watermark image is too small to identify.");
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return doc.embedPng(bytes);
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return doc.embedJpg(bytes);
  }
  throw new OperationError("INVALID_INPUT", "Watermark image must be PNG or JPEG.");
}

const FONT_MAP: Record<string, StandardFonts> = {
  Helvetica: StandardFonts.Helvetica,
  TimesRoman: StandardFonts.TimesRoman,
  Courier: StandardFonts.Courier,
};

async function applyTextWatermark(
  doc: PDFDocument,
  spec: z.infer<typeof TextWatermarkSchema>,
): Promise<void> {
  const standard = FONT_MAP[spec.font ?? "Helvetica"] ?? StandardFonts.Helvetica;
  const font: PDFFont = await doc.embedFont(standard);
  const size = spec.size ?? 48;
  const [r, g, b] = spec.color ?? [0.7, 0.7, 0.7];
  const opacity = spec.opacity ?? 0.3;
  const rotation = spec.rotation ?? 0;
  const textWidth = font.widthOfTextAtSize(spec.text, size);
  const textHeight = font.heightAtSize(size);

  for (const page of doc.getPages()) {
    const { width: pw, height: ph } = page.getSize();
    const { x, y } = resolvePosition(spec.position ?? "center", pw, ph, textWidth, textHeight);
    page.drawText(spec.text, {
      x,
      y,
      size,
      font,
      color: rgb(r, g, b),
      opacity,
      rotate: degrees(rotation),
    });
  }
}

async function applyImageWatermark(
  doc: PDFDocument,
  spec: z.infer<typeof ImageWatermarkSchema>,
): Promise<void> {
  const image = await embedImage(doc, spec.image);
  const scale = spec.scale ?? 0.5;
  const { width: imgW, height: imgH } = image.scale(scale);
  const opacity = spec.opacity ?? 0.3;
  const rotation = spec.rotation ?? 0;

  for (const page of doc.getPages()) {
    const { width: pw, height: ph } = page.getSize();
    const { x, y } = resolvePosition(spec.position ?? "center", pw, ph, imgW, imgH);
    page.drawImage(image, {
      x,
      y,
      width: imgW,
      height: imgH,
      opacity,
      rotate: degrees(rotation),
    });
  }
}

export async function addWatermark(input: PDFInput, watermark: Watermark): Promise<PDFOutput> {
  const doc = await loadPdf(input);

  if (watermark.kind === "text") {
    await applyTextWatermark(doc, watermark);
  } else {
    await applyImageWatermark(doc, watermark);
  }

  return savePdf(doc, { operation: "watermark" });
}
