// Region redaction. For each content stream on the target page, decompresses
// the raw bytes, finds each `q ... Q` graphics-state block, parses any Tm
// (text matrix) operator inside it, and drops the whole block when its text
// origin lies inside the redact region. The remaining bytes are re-emitted as
// a new flate-compressed stream and the page's Contents array is rewritten to
// point at the new streams. A black rectangle is drawn over the region as the
// visual marker.
//
// Why drop whole `q ... Q` blocks: pdf-lib emits each `drawText` as a
// self-contained `q ... Q` group with one BT/ET and one Tm/Tj inside, so
// dropping the block removes a single text fragment cleanly without leaving
// dangling state-change operators. PDFs from other producers may pack
// multiple text fragments per block; for those, this implementation is
// conservative — it drops a block only when its Tm lies in the region. The
// notes flag reports how many blocks were dropped.
//
// Limitations:
//   - Text inside Form XObjects (referenced via the Do operator) is not
//     reached by this pass.
//   - Nested `q ... Q` is not handled (the lazy matcher stops at the first
//     Q). pdf-lib's drawText output never nests.
//   - Text positioned via rotated/skewed text matrices: the check uses the
//     translation component only.
//
// See .agent/EDGE_CASES.md for the broader policy.

import { z } from "zod";
import { PDFArray, PDFName, PDFRawStream, PDFRef, decodePDFRawStream, rgb } from "pdf-lib";
import type { PDFInput, PDFOutput, PageRegion } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { loadPdf } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";
import { PageRegionSchema } from "./cropPages.js";

export const RedactRegionSchema = z.object({
  pageIndex: z.number().int().nonnegative(),
  region: PageRegionSchema,
});

const NUM = "(-?\\d+(?:\\.\\d+)?)";
const WS = "\\s+";
const TM_PATTERN = new RegExp(
  `${NUM}${WS}${NUM}${WS}${NUM}${WS}${NUM}${WS}${NUM}${WS}${NUM}${WS}Tm`,
);
// Matches "q ... Q" where each is at a token boundary.
const Q_BLOCK_PATTERN = /(^|\s)q\s+([\s\S]*?)\s+Q(?=\s|$)/g;

const utf8Encoder = new TextEncoder();
const latin1Decoder = new TextDecoder("latin1");

function inRegion(x: number, y: number, region: PageRegion, pageHeight: number): boolean {
  const pdfBottom = pageHeight - region.y - region.height;
  const pdfTop = pageHeight - region.y;
  return (
    x >= region.x &&
    x <= region.x + region.width &&
    y >= pdfBottom &&
    y <= pdfTop
  );
}

function filterTextBlocks(
  raw: Uint8Array,
  region: PageRegion,
  pageHeight: number,
): { bytes: Uint8Array; dropped: number; touched: boolean } {
  const text = latin1Decoder.decode(raw);
  let dropped = 0;
  let touched = false;

  const filtered = text.replace(Q_BLOCK_PATTERN, (full, lead: string, inner: string) => {
    const tmMatch = inner.match(TM_PATTERN);
    if (!tmMatch) return full;
    const e = parseFloat(tmMatch[5]!);
    const f = parseFloat(tmMatch[6]!);
    if (!Number.isFinite(e) || !Number.isFinite(f)) return full;
    if (!inRegion(e, f, region, pageHeight)) return full;
    dropped++;
    touched = true;
    // Preserve the leading whitespace so adjacent operators remain separated.
    return lead;
  });

  return { bytes: utf8Encoder.encode(filtered), dropped, touched };
}

export async function redactRegion(
  input: PDFInput,
  pageIndex: number,
  region: PageRegion,
): Promise<PDFOutput> {
  if (!Number.isInteger(pageIndex) || pageIndex < 0) {
    throw new OperationError(
      "INVALID_INPUT",
      "redactRegion requires a non-negative integer pageIndex.",
    );
  }
  if (region.width <= 0 || region.height <= 0 || region.x < 0 || region.y < 0) {
    throw new OperationError(
      "INVALID_INPUT",
      "redactRegion requires a positive region with non-negative origin.",
    );
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
  const contentsRef = page.node.Contents();

  if (!contentsRef) {
    page.drawRectangle({
      x: region.x,
      y: pageHeight - region.y - region.height,
      width: region.width,
      height: region.height,
      color: rgb(0, 0, 0),
    });
    return savePdf(doc, {
      operation: "redact",
      notes: ["Page had no content stream — only the redaction rectangle was drawn."],
    });
  }

  type Entry = { ref: PDFRef; stream: PDFRawStream };
  const entries: Entry[] = [];
  const collect = (refMaybe: unknown): void => {
    if (!(refMaybe instanceof PDFRef)) return;
    const resolved = doc.context.lookup(refMaybe);
    if (!(resolved instanceof PDFRawStream)) return;
    entries.push({ ref: refMaybe, stream: resolved });
  };
  if (contentsRef instanceof PDFArray) {
    for (let i = 0; i < contentsRef.size(); i++) collect(contentsRef.get(i));
  } else {
    collect(contentsRef);
  }

  if (entries.length === 0) {
    throw new OperationError(
      "OPERATION_FAILED",
      "Could not resolve any content streams for the target page.",
    );
  }

  let totalDropped = 0;
  const newRefs: PDFRef[] = [];
  for (const entry of entries) {
    const decoded = decodePDFRawStream(entry.stream).decode();
    const result = filterTextBlocks(decoded, region, pageHeight);
    totalDropped += result.dropped;

    if (!result.touched) {
      // Stream unchanged — keep the original ref to avoid churn.
      newRefs.push(entry.ref);
      continue;
    }
    const replacement = doc.context.flateStream(result.bytes);
    const newRef = doc.context.register(replacement);
    newRefs.push(newRef);
  }

  page.node.set(PDFName.of("Contents"), doc.context.obj(newRefs));

  page.drawRectangle({
    x: region.x,
    y: pageHeight - region.y - region.height,
    width: region.width,
    height: region.height,
    color: rgb(0, 0, 0),
  });

  return savePdf(doc, {
    operation: "redact",
    notes: [
      `Dropped ${totalDropped} text block(s) whose Tm origin lay in the redact region.`,
      "Limitations: text inside Form XObjects (Do operator) is not yet sanitised. The block matcher does not handle nested q/Q.",
    ],
  });
}
