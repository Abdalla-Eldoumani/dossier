// Extract text from a PDF using pdfjs-dist. The legacy build runs in Node
// without a worker for text extraction (no rendering, no DOMMatrix needed).
//
// Two modes:
//   - default: text items joined by single spaces, in pdf.js source order
//   - layoutPreserve: items grouped into lines by their baseline y, lines
//     emitted top-to-bottom. Doesn't reconstruct columns or tables — that's
//     pdfToMarkdown's territory.

import { z } from "zod";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFInput } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { toBytes } from "../internal/loadPdf.js";

export const PdfToTextSchema = z.object({
  pages: z.array(z.number().int().nonnegative()).optional(),
  layoutPreserve: z.boolean().optional(),
});

export type PdfToTextOptions = z.infer<typeof PdfToTextSchema>;

export interface PdfToTextResult {
  text: string;
  pages: string[];
  pageCount: number;
}

export async function pdfToText(
  input: PDFInput,
  options: PdfToTextOptions = {},
): Promise<PdfToTextResult> {
  const bytes = toBytes(input);

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
    throw new OperationError("INVALID_PDF", `Failed to parse PDF for text extraction: ${message}`);
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

  const pageTexts: string[] = [];
  for (const i of pageIndices) {
    const page = await doc.getPage(i + 1);
    const content = await page.getTextContent();

    if (options.layoutPreserve) {
      const lines = new Map<number, string[]>();
      for (const item of content.items) {
        if ("str" in item && typeof item.str === "string") {
          const y = Math.round(item.transform[5] as number);
          let bucket = lines.get(y);
          if (!bucket) {
            bucket = [];
            lines.set(y, bucket);
          }
          bucket.push(item.str);
        }
      }
      const sortedYs = Array.from(lines.keys()).sort((a, b) => b - a);
      const text = sortedYs
        .map((y) => (lines.get(y) ?? []).join(" "))
        .join("\n")
        .trim();
      pageTexts.push(text);
    } else {
      const text = content.items
        .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
        .join(" ")
        .trim();
      pageTexts.push(text);
    }

    page.cleanup();
  }

  await doc.destroy();

  return {
    text: pageTexts.join("\n\n"),
    pages: pageTexts,
    pageCount: totalPages,
  };
}
