// Stamp the page with a built-in label (Approved, Confidential, etc.) or a
// custom image. Stamps are drawn directly to the page content rather than as
// /Stamp annotations: the user-visible result is identical, the bytes are
// immediately part of the page (so flattenAnnotations doesn't need to touch
// them), and we don't need to construct an appearance stream.

import { z } from "zod";
import { StandardFonts, degrees, rgb } from "pdf-lib";
import type { PDFDocument, PDFImage } from "pdf-lib";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { loadPdf } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";

export const BUILTIN_STAMPS = [
  "Approved",
  "Confidential",
  "Draft",
  "Final",
  "ForComment",
  "ForPublicRelease",
  "NotApproved",
  "Sold",
  "TopSecret",
] as const;
export type BuiltinStampName = (typeof BUILTIN_STAMPS)[number];

const STAMP_DEFAULT_COLOR: Record<BuiltinStampName, [number, number, number]> = {
  Approved: [0.18, 0.55, 0.22],
  Confidential: [0.7, 0.05, 0.05],
  Draft: [0.4, 0.4, 0.4],
  Final: [0.15, 0.2, 0.5],
  ForComment: [0.85, 0.4, 0.05],
  ForPublicRelease: [0.15, 0.5, 0.65],
  NotApproved: [0.7, 0.05, 0.05],
  Sold: [0.7, 0.3, 0.05],
  TopSecret: [0.7, 0.05, 0.05],
};

const STAMP_LABEL: Record<BuiltinStampName, string> = {
  Approved: "APPROVED",
  Confidential: "CONFIDENTIAL",
  Draft: "DRAFT",
  Final: "FINAL",
  ForComment: "FOR COMMENT",
  ForPublicRelease: "FOR PUBLIC RELEASE",
  NotApproved: "NOT APPROVED",
  Sold: "SOLD",
  TopSecret: "TOP SECRET",
};

export const StampSchema = z.union([
  z.object({
    kind: z.literal("builtin"),
    name: z.enum(BUILTIN_STAMPS),
    color: z
      .tuple([
        z.number().min(0).max(1),
        z.number().min(0).max(1),
        z.number().min(0).max(1),
      ])
      .optional(),
  }),
  z.object({
    kind: z.literal("image"),
    image: z.instanceof(Uint8Array),
  }),
]);

export const StampOptionsSchema = z.object({
  size: z.number().positive().optional(),
  rotation: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
});

export const AddStampSchema = z.object({
  pageIndex: z.number().int().nonnegative(),
  position: z.object({ x: z.number().nonnegative(), y: z.number().nonnegative() }),
  stamp: StampSchema,
  options: StampOptionsSchema.optional(),
});

export type Stamp = z.infer<typeof StampSchema>;
export type StampOptions = z.infer<typeof StampOptionsSchema>;

async function embedStampImage(doc: PDFDocument, bytes: Uint8Array): Promise<PDFImage> {
  if (bytes.length < 4) {
    throw new OperationError("INVALID_INPUT", "Stamp image is too small to identify.");
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return doc.embedPng(bytes);
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return doc.embedJpg(bytes);
  }
  throw new OperationError("INVALID_INPUT", "Stamp image must be PNG or JPEG.");
}

export async function addStamp(
  input: PDFInput,
  pageIndex: number,
  position: { x: number; y: number },
  stamp: Stamp,
  options: StampOptions = {},
): Promise<PDFOutput> {
  if (!Number.isInteger(pageIndex) || pageIndex < 0) {
    throw new OperationError(
      "INVALID_INPUT",
      "addStamp requires a non-negative integer pageIndex.",
    );
  }
  if (position.x < 0 || position.y < 0) {
    throw new OperationError("INVALID_INPUT", "addStamp requires a non-negative position.");
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
  const opacity = options.opacity ?? 0.85;
  const rotation = options.rotation ?? 0;

  if (stamp.kind === "builtin") {
    const label = STAMP_LABEL[stamp.name];
    const [r, g, b] = stamp.color ?? STAMP_DEFAULT_COLOR[stamp.name];
    const size = options.size ?? 48;
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const textWidth = font.widthOfTextAtSize(label, size);
    const textHeight = font.heightAtSize(size);
    const pdfX = position.x;
    const pdfY = pageHeight - position.y - textHeight;
    page.drawText(label, {
      x: pdfX,
      y: pdfY,
      size,
      font,
      color: rgb(r, g, b),
      opacity,
      rotate: degrees(rotation),
    });
    return savePdf(doc, {
      operation: "stamp",
      notes: [`Stamped page ${pageIndex} with "${label}".`],
    });
  }

  const image = await embedStampImage(doc, stamp.image);
  const targetWidth = options.size ?? Math.min(image.width, 240);
  const aspect = image.height / image.width;
  const drawWidth = targetWidth;
  const drawHeight = targetWidth * aspect;
  const pdfX = position.x;
  const pdfY = pageHeight - position.y - drawHeight;
  page.drawImage(image, {
    x: pdfX,
    y: pdfY,
    width: drawWidth,
    height: drawHeight,
    opacity,
    rotate: degrees(rotation),
  });

  return savePdf(doc, {
    operation: "stamp",
    notes: [`Stamped page ${pageIndex} with image (${image.width}x${image.height}).`],
  });
}
