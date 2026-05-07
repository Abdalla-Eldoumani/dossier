// Run OCR on a PDF and optionally produce a searchable PDF (raster text layer
// added beneath the page content). The actual recognition needs tesseract.js
// or another OCR engine, with worker pools, language data downloads, and
// canvas/ImageBitmap rendering — all environment-specific. The operation
// accepts an injected OcrEngine and validates inputs; the engine does the
// recognition work.

import { z } from "zod";
import type { PDFInput } from "../types/index.js";
import { OperationError, UnsupportedFeatureError } from "../types/errors.js";
import { toBytes } from "../internal/loadPdf.js";

export const RunOcrOptionsSchema = z.object({
  languages: z.array(z.string().min(1)).min(1).optional(),
  pages: z.array(z.number().int().nonnegative()).optional(),
  addTextLayer: z.boolean().optional(),
});

export type RunOcrOptions = z.infer<typeof RunOcrOptionsSchema>;

export interface OcrWord {
  text: string;
  bbox: { x: number; y: number; width: number; height: number };
}

export interface OcrPageResult {
  pageIndex: number;
  text: string;
  words?: OcrWord[];
}

export interface OcrResult {
  pages: OcrPageResult[];
  /** Searchable PDF bytes (text layer added). Present only when addTextLayer is true. */
  pdfBytes?: Uint8Array;
}

export interface OcrEngineInput {
  pdfBytes: Uint8Array;
  pageIndices?: number[];
  languages: string[];
  addTextLayer: boolean;
}

export interface OcrEngine {
  recognize(input: OcrEngineInput): Promise<OcrResult>;
}

export const RunOcrSchema = RunOcrOptionsSchema;

export async function runOcr(
  input: PDFInput,
  options: RunOcrOptions = {},
  engine?: OcrEngine,
): Promise<OcrResult> {
  if (!engine || typeof engine.recognize !== "function") {
    throw new UnsupportedFeatureError(
      "runOcr requires an OcrEngine provider. The web app and MCP server should " +
        "wire one up (tesseract.js with the appropriate worker setup); pdf-lib has no " +
        "OCR capability of its own.",
    );
  }

  const languages = options.languages ?? ["eng"];
  if (languages.length === 0) {
    throw new OperationError("INVALID_INPUT", "runOcr requires at least one language code.");
  }

  const pdfBytes = toBytes(input);

  let result: OcrResult;
  try {
    result = await engine.recognize({
      pdfBytes,
      pageIndices: options.pages,
      languages,
      addTextLayer: options.addTextLayer ?? false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new OperationError("OPERATION_FAILED", `OCR failed: ${message}`);
  }

  return result;
}
