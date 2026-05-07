// Find every occurrence of a query string across the document and return the
// page index, a context-padded snippet, and the position of the matching
// text item. Case-insensitive substring search by default; opt into case
// sensitivity via options.

import { z } from "zod";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFInput } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { toBytes } from "../internal/loadPdf.js";

export const SearchTextOptionsSchema = z.object({
  caseSensitive: z.boolean().optional(),
  pages: z.array(z.number().int().nonnegative()).optional(),
  contextChars: z.number().int().nonnegative().optional(),
});

export type SearchTextOptions = z.infer<typeof SearchTextOptionsSchema>;

export const SearchTextSchema = z.object({
  query: z.string().min(1),
  options: SearchTextOptionsSchema.optional(),
});

export interface SearchHit {
  pageIndex: number;
  snippet: string;
  position: { x: number; y: number };
}

export async function searchText(
  input: PDFInput,
  query: string,
  options: SearchTextOptions = {},
): Promise<SearchHit[]> {
  if (typeof query !== "string" || query.length === 0) {
    throw new OperationError("INVALID_INPUT", "searchText requires a non-empty query string.");
  }

  const bytes = toBytes(input);
  const caseSensitive = options.caseSensitive ?? false;
  const contextChars = options.contextChars ?? 30;
  const needle = caseSensitive ? query : query.toLowerCase();

  const loadingTask = getDocument({ data: bytes });
  let doc;
  try {
    doc = await loadingTask.promise;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new OperationError(
      "INVALID_PDF",
      `Failed to parse PDF for text search: ${message}`,
    );
  }

  const totalPages = doc.numPages;
  const pageIndices = options.pages ?? Array.from({ length: totalPages }, (_, i) => i);

  for (const i of pageIndices) {
    if (!Number.isInteger(i) || i < 0 || i >= totalPages) {
      await doc.destroy();
      throw new OperationError(
        "INVALID_INPUT",
        `Page index ${i} is out of bounds for a ${totalPages}-page PDF.`,
      );
    }
  }

  const hits: SearchHit[] = [];
  try {
    for (const i of pageIndices) {
      const page = await doc.getPage(i + 1);
      const content = await page.getTextContent();

      // Concatenate items with separators, tracking each item's character span
      // so we can recover the position of any match.
      let text = "";
      const segments: Array<{ start: number; end: number; x: number; y: number }> = [];
      for (const item of content.items) {
        if ("str" in item && typeof item.str === "string") {
          const start = text.length;
          text += item.str + " ";
          const end = text.length;
          const t = item.transform as number[];
          segments.push({ start, end, x: t[4] ?? 0, y: t[5] ?? 0 });
        }
      }

      const haystack = caseSensitive ? text : text.toLowerCase();
      let cursor = 0;
      while (cursor <= haystack.length - needle.length) {
        const idx = haystack.indexOf(needle, cursor);
        if (idx === -1) break;
        const segment = segments.find((s) => s.start <= idx && idx < s.end) ?? segments[0];
        const snippetStart = Math.max(0, idx - contextChars);
        const snippetEnd = Math.min(text.length, idx + needle.length + contextChars);
        const snippet = text.slice(snippetStart, snippetEnd).replace(/\s+/g, " ").trim();
        hits.push({
          pageIndex: i,
          snippet,
          position: { x: segment?.x ?? 0, y: segment?.y ?? 0 },
        });
        cursor = idx + needle.length;
      }

      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }

  return hits;
}
