// Build a PDF from a list of PNG/JPEG byte arrays. Each image becomes one or
// more page slots depending on the layout. `fit` controls how the image fills
// its slot — "contain" letterboxes inside the slot keeping aspect, "cover"
// fills the slot and may overflow.
//
// Layouts:
//   one-per-page  - 1 slot, fills the whole page
//   two-per-page  - 2 slots stacked vertically (top, bottom)
//   four-per-page - 2x2 grid
//
// Cover-mode overflow is not clipped; pick a layout that fits the image
// aspect, or use "contain" to be safe.

import { z } from "zod";
import type { PDFDocument, PDFImage } from "pdf-lib";
import { PDFDocument as PDFDocumentClass } from "pdf-lib";
import type { PDFOutput, PageSize } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { savePdf } from "../internal/savePdf.js";
import { PageSizeSchema } from "./insertBlankPage.js";

export const ImagesToPdfSchema = z.object({
  layout: z.enum(["one-per-page", "two-per-page", "four-per-page"]).optional(),
  pageSize: PageSizeSchema.optional(),
  fit: z.enum(["contain", "cover"]).optional(),
});

export type ImagesToPdfOptions = z.infer<typeof ImagesToPdfSchema>;

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

async function embedImage(doc: PDFDocument, bytes: Uint8Array): Promise<PDFImage> {
  if (bytes.length < 4) {
    throw new OperationError("INVALID_INPUT", "Image is too small to identify.");
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return doc.embedPng(bytes);
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return doc.embedJpg(bytes);
  }
  throw new OperationError("INVALID_INPUT", "Image must be PNG or JPEG.");
}

const SLOTS_PER_LAYOUT = {
  "one-per-page": 1,
  "two-per-page": 2,
  "four-per-page": 4,
} as const;

type Layout = keyof typeof SLOTS_PER_LAYOUT;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function slotRect(layout: Layout, slot: number, pw: number, ph: number): Rect {
  if (layout === "one-per-page") {
    return { x: 0, y: 0, width: pw, height: ph };
  }
  if (layout === "two-per-page") {
    const halfH = ph / 2;
    return slot === 0
      ? { x: 0, y: halfH, width: pw, height: halfH }
      : { x: 0, y: 0, width: pw, height: halfH };
  }
  // four-per-page: top-left, top-right, bottom-left, bottom-right
  const halfW = pw / 2;
  const halfH = ph / 2;
  if (slot === 0) return { x: 0, y: halfH, width: halfW, height: halfH };
  if (slot === 1) return { x: halfW, y: halfH, width: halfW, height: halfH };
  if (slot === 2) return { x: 0, y: 0, width: halfW, height: halfH };
  return { x: halfW, y: 0, width: halfW, height: halfH };
}

function fitImage(
  imgW: number,
  imgH: number,
  slotW: number,
  slotH: number,
  fit: "contain" | "cover",
): { width: number; height: number; offsetX: number; offsetY: number } {
  const imgAspect = imgW / imgH;
  const slotAspect = slotW / slotH;
  let width: number;
  let height: number;
  if (fit === "contain") {
    if (imgAspect > slotAspect) {
      width = slotW;
      height = slotW / imgAspect;
    } else {
      height = slotH;
      width = slotH * imgAspect;
    }
  } else {
    if (imgAspect > slotAspect) {
      height = slotH;
      width = slotH * imgAspect;
    } else {
      width = slotW;
      height = slotW / imgAspect;
    }
  }
  return { width, height, offsetX: (slotW - width) / 2, offsetY: (slotH - height) / 2 };
}

export async function imagesToPdf(
  images: Uint8Array[],
  options: ImagesToPdfOptions = {},
): Promise<PDFOutput> {
  if (!Array.isArray(images) || images.length === 0) {
    throw new OperationError("INVALID_INPUT", "imagesToPdf requires at least one image.");
  }

  const layout: Layout = options.layout ?? "one-per-page";
  const pageSize: PageSize = options.pageSize ?? { name: "Letter" };
  const fit = options.fit ?? "contain";
  const [pw, ph] = dimensionsOf(pageSize);
  const slotsPerPage = SLOTS_PER_LAYOUT[layout];

  const doc = await PDFDocumentClass.create();
  let page = doc.addPage([pw, ph]);
  let slotInPage = 0;

  for (const bytes of images) {
    if (slotInPage >= slotsPerPage) {
      page = doc.addPage([pw, ph]);
      slotInPage = 0;
    }
    const image = await embedImage(doc, bytes);
    const slot = slotRect(layout, slotInPage, pw, ph);
    const placement = fitImage(image.width, image.height, slot.width, slot.height, fit);
    page.drawImage(image, {
      x: slot.x + placement.offsetX,
      y: slot.y + placement.offsetY,
      width: placement.width,
      height: placement.height,
    });
    slotInPage++;
  }

  return savePdf(doc, { operation: "images-to-pdf" });
}
