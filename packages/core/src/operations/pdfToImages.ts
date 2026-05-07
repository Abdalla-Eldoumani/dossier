// Rasterize PDF pages to PNG/JPEG/WebP. The actual canvas-and-encode step is
// runtime-specific (OffscreenCanvas in browsers, sharp or @napi-rs/canvas in
// Node), so the operation accepts a PageRenderer injection. The operation
// owns: pdfjs-dist load, viewport math, page indexing, and validation. The
// renderer owns: canvas allocation, the page.render call, and image encoding.

import { z } from "zod";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFPageProxy, PageViewport } from "pdfjs-dist";
import type { PDFInput } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { toBytes } from "../internal/loadPdf.js";

export const PdfToImagesSchema = z.object({
  format: z.enum(["png", "jpeg", "webp"]).optional(),
  dpi: z.number().positive().optional(),
  pages: z.array(z.number().int().nonnegative()).optional(),
  jpegQuality: z.number().min(1).max(100).optional(),
});

export type PdfToImagesOptions = z.infer<typeof PdfToImagesSchema>;

export type ImageFormat = "png" | "jpeg" | "webp";

export interface PageRenderInput {
  page: PDFPageProxy;
  viewport: PageViewport;
  dpi: number;
  format: ImageFormat;
  jpegQuality?: number;
}

export interface PageRenderer {
  render(input: PageRenderInput): Promise<Uint8Array>;
}

export interface PdfToImagesResult {
  images: Uint8Array[];
  pageCount: number;
  format: ImageFormat;
}

const POINTS_PER_INCH = 72;

export async function pdfToImages(
  input: PDFInput,
  renderer: PageRenderer,
  options: PdfToImagesOptions = {},
): Promise<PdfToImagesResult> {
  if (!renderer || typeof renderer.render !== "function") {
    throw new OperationError(
      "INVALID_INPUT",
      "pdfToImages requires a PageRenderer with a render() method.",
    );
  }

  const bytes = toBytes(input);
  const format: ImageFormat = options.format ?? "png";
  const dpi = options.dpi ?? 150;
  const scale = dpi / POINTS_PER_INCH;

  const loadingTask = getDocument({
    data: bytes,
    isEvalSupported: false,
    useSystemFonts: false,
  });

  let doc;
  try {
    doc = await loadingTask.promise;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new OperationError(
      "INVALID_PDF",
      `Failed to parse PDF for rendering: ${message}`,
    );
  }

  const totalPages = doc.numPages;
  const pageIndices =
    options.pages ?? Array.from({ length: totalPages }, (_, i) => i);

  for (const i of pageIndices) {
    if (!Number.isInteger(i) || i < 0 || i >= totalPages) {
      await doc.destroy();
      throw new OperationError(
        "INVALID_INPUT",
        `Page index ${i} is out of bounds for a ${totalPages}-page PDF.`,
      );
    }
  }

  const images: Uint8Array[] = [];
  try {
    for (const i of pageIndices) {
      const page = await doc.getPage(i + 1);
      const viewport = page.getViewport({ scale });
      const imageBytes = await renderer.render({
        page,
        viewport,
        dpi,
        format,
        jpegQuality: options.jpegQuality,
      });
      images.push(imageBytes);
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }

  return { images, pageCount: totalPages, format };
}
