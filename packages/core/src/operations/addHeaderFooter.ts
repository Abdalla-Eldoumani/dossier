// Stamp a header and/or footer across every page. Templates support {n},
// {total}, and {date} (local YYYY-MM-DD) substitutions. Alignment is left,
// center, or right; vertical position is fixed at the page margin.

import { z } from "zod";
import { StandardFonts, rgb } from "pdf-lib";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { loadPdf } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";

export const HeaderFooterOptionsSchema = z
  .object({
    header: z.string().optional(),
    footer: z.string().optional(),
    font: z.enum(["Helvetica", "TimesRoman", "Courier"]).optional(),
    size: z.number().positive().optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    color: z
      .tuple([
        z.number().min(0).max(1),
        z.number().min(0).max(1),
        z.number().min(0).max(1),
      ])
      .optional(),
  })
  .refine((v) => v.header || v.footer, {
    message: "addHeaderFooter requires at least a header or footer string.",
  });

export type HeaderFooterOptions = z.infer<typeof HeaderFooterOptionsSchema>;

const FONT_MAP: Record<string, StandardFonts> = {
  Helvetica: StandardFonts.Helvetica,
  TimesRoman: StandardFonts.TimesRoman,
  Courier: StandardFonts.Courier,
};

const MARGIN = 36;

function localDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function substitute(template: string, n: number, total: number, date: string): string {
  return template
    .replaceAll("{n}", String(n))
    .replaceAll("{total}", String(total))
    .replaceAll("{date}", date);
}

export async function addHeaderFooter(
  input: PDFInput,
  options: HeaderFooterOptions,
): Promise<PDFOutput> {
  if (!options.header && !options.footer) {
    throw new OperationError(
      "INVALID_INPUT",
      "addHeaderFooter requires at least a header or footer string.",
    );
  }

  const doc = await loadPdf(input);
  const size = options.size ?? 10;
  const align = options.align ?? "center";
  const [r, g, b] = options.color ?? [0.4, 0.4, 0.4];
  const standard = FONT_MAP[options.font ?? "Helvetica"] ?? StandardFonts.Helvetica;
  const font = await doc.embedFont(standard);

  const isoDate = localDate();
  const pages = doc.getPages();
  const total = pages.length;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    const { width: pw, height: ph } = page.getSize();

    const drawAligned = (text: string, yPosition: number) => {
      const textWidth = font.widthOfTextAtSize(text, size);
      const x =
        align === "left"
          ? MARGIN
          : align === "right"
            ? pw - MARGIN - textWidth
            : (pw - textWidth) / 2;
      page.drawText(text, { x, y: yPosition, size, font, color: rgb(r, g, b) });
    };

    if (options.header) {
      drawAligned(substitute(options.header, i + 1, total, isoDate), ph - MARGIN);
    }
    if (options.footer) {
      drawAligned(substitute(options.footer, i + 1, total, isoDate), MARGIN);
    }
  }

  return savePdf(doc, { operation: "header-footer" });
}
