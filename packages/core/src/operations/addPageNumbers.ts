// Stamp page numbers on each page using a format string with {n} and {total}
// substitutions. skipFirst lets cover pages stay unnumbered; startAt offsets
// the displayed number (so chapter PDFs can begin at 5, etc.).

import { z } from "zod";
import { StandardFonts, rgb } from "pdf-lib";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { loadPdf } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";
import { PositionSchema, type Position } from "./addWatermark.js";

export const PageNumberOptionsSchema = z.object({
  format: z.string().min(1).default("{n}"),
  font: z.enum(["Helvetica", "TimesRoman", "Courier"]).optional(),
  size: z.number().positive().optional(),
  position: PositionSchema.optional(),
  skipFirst: z.number().int().nonnegative().optional(),
  startAt: z.number().int().positive().optional(),
  color: z
    .tuple([
      z.number().min(0).max(1),
      z.number().min(0).max(1),
      z.number().min(0).max(1),
    ])
    .optional(),
});

export type PageNumberOptions = z.infer<typeof PageNumberOptionsSchema>;

const FONT_MAP: Record<string, StandardFonts> = {
  Helvetica: StandardFonts.Helvetica,
  TimesRoman: StandardFonts.TimesRoman,
  Courier: StandardFonts.Courier,
};

const MARGIN = 36;

function resolvePosition(
  position: Position,
  pw: number,
  ph: number,
  w: number,
  h: number,
): { x: number; y: number } {
  if (typeof position !== "string") return position;
  const left = MARGIN;
  const right = pw - MARGIN - w;
  const middleX = (pw - w) / 2;
  const top = ph - MARGIN - h;
  const middleY = (ph - h) / 2;
  const bottom = MARGIN;
  switch (position) {
    case "top-left":
      return { x: left, y: top };
    case "top-center":
      return { x: middleX, y: top };
    case "top-right":
      return { x: right, y: top };
    case "middle-left":
      return { x: left, y: middleY };
    case "center":
      return { x: middleX, y: middleY };
    case "middle-right":
      return { x: right, y: middleY };
    case "bottom-left":
      return { x: left, y: bottom };
    case "bottom-center":
      return { x: middleX, y: bottom };
    case "bottom-right":
      return { x: right, y: bottom };
  }
}

export async function addPageNumbers(
  input: PDFInput,
  options: PageNumberOptions = { format: "{n}" },
): Promise<PDFOutput> {
  const doc = await loadPdf(input);
  const skipFirst = options.skipFirst ?? 0;
  const startAt = options.startAt ?? 1;
  const format = options.format ?? "{n}";
  const size = options.size ?? 12;
  const position: Position = options.position ?? "bottom-right";
  const [r, g, b] = options.color ?? [0.4, 0.4, 0.4];

  const standard = FONT_MAP[options.font ?? "Helvetica"] ?? StandardFonts.Helvetica;
  const font = await doc.embedFont(standard);

  const pages = doc.getPages();
  const total = pages.length;
  for (let i = skipFirst; i < pages.length; i++) {
    const page = pages[i]!;
    const n = startAt + (i - skipFirst);
    const text = format.replaceAll("{n}", String(n)).replaceAll("{total}", String(total));
    const textWidth = font.widthOfTextAtSize(text, size);
    const textHeight = font.heightAtSize(size);
    const { width: pw, height: ph } = page.getSize();
    const { x, y } = resolvePosition(position, pw, ph, textWidth, textHeight);
    page.drawText(text, { x, y, size, font, color: rgb(r, g, b) });
  }

  return savePdf(doc, { operation: "page-numbers" });
}
