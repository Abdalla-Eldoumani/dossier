// Best-effort PDF to Markdown. Real semantic structure (Tagged PDF / PDF/UA)
// is rare; this implementation works on visual cues:
//   1. Group text items by baseline y into lines.
//   2. Compute the modal font size across the document — that's "body".
//   3. Lines whose max font size is materially larger than body become
//      headings: H1 at >= 1.5x body, H2 at >= 1.25x, H3 at >= 1.1x.
//   4. Pages are separated by horizontal rules.
//
// Limits: no list detection, no table reconstruction, no link inlining. Run
// pdfToText if you just want the words.

import { z } from "zod";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFInput } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { toBytes } from "../internal/loadPdf.js";

export const PdfToMarkdownSchema = z.object({
  pages: z.array(z.number().int().nonnegative()).optional(),
});

export type PdfToMarkdownOptions = z.infer<typeof PdfToMarkdownSchema>;

export interface PdfToMarkdownResult {
  markdown: string;
  pageCount: number;
}

interface TextSpan {
  text: string;
  size: number;
  y: number;
}

function modalSize(spans: TextSpan[]): number {
  if (spans.length === 0) return 12;
  const counts = new Map<number, number>();
  for (const s of spans) counts.set(s.size, (counts.get(s.size) ?? 0) + 1);
  let mode = spans[0]!.size;
  let max = 0;
  for (const [size, count] of counts) {
    if (count > max) {
      mode = size;
      max = count;
    }
  }
  return mode;
}

function headingPrefix(lineSize: number, body: number): string {
  if (lineSize >= body * 1.5) return "# ";
  if (lineSize >= body * 1.25) return "## ";
  if (lineSize >= body * 1.1) return "### ";
  return "";
}

export async function pdfToMarkdown(
  input: PDFInput,
  options: PdfToMarkdownOptions = {},
): Promise<PdfToMarkdownResult> {
  const bytes = toBytes(input);

  const loadingTask = getDocument({ data: bytes });

  let doc;
  try {
    doc = await loadingTask.promise;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new OperationError(
      "INVALID_PDF",
      `Failed to parse PDF for markdown extraction: ${message}`,
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

  const pageSpans: TextSpan[][] = [];
  try {
    for (const i of pageIndices) {
      const page = await doc.getPage(i + 1);
      const content = await page.getTextContent();
      const spans: TextSpan[] = [];
      for (const item of content.items) {
        if ("str" in item && typeof item.str === "string" && item.str.trim().length > 0) {
          const transform = item.transform as number[];
          const size = Math.round(Math.abs(transform[3] ?? 12));
          const y = Math.round(transform[5] ?? 0);
          spans.push({ text: item.str, size, y });
        }
      }
      pageSpans.push(spans);
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }

  const allSpans = pageSpans.flat();
  if (allSpans.length === 0) {
    return { markdown: "", pageCount: totalPages };
  }
  const body = modalSize(allSpans);

  const pageMarkdowns: string[] = [];
  for (const spans of pageSpans) {
    const lineMap = new Map<number, TextSpan[]>();
    for (const span of spans) {
      let bucket = lineMap.get(span.y);
      if (!bucket) {
        bucket = [];
        lineMap.set(span.y, bucket);
      }
      bucket.push(span);
    }
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);

    const lines: string[] = [];
    for (const y of sortedYs) {
      const line = lineMap.get(y) ?? [];
      const text = line
        .map((s) => s.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (!text) continue;
      const maxSize = Math.max(...line.map((s) => s.size));
      lines.push(headingPrefix(maxSize, body) + text);
    }
    pageMarkdowns.push(lines.join("\n\n"));
  }

  const nonEmpty = pageMarkdowns.filter((p) => p.length > 0);
  return {
    markdown: nonEmpty.join("\n\n---\n\n"),
    pageCount: totalPages,
  };
}
