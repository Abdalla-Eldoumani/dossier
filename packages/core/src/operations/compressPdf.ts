// Compress a PDF.
//
// Two passes run in order:
//  1. Image re-encoding. Every Image XObject with a DCTDecode (JPEG) filter
//     is found, its bytes handed to the caller-supplied JpegRecompressor at a
//     quality controlled by the `level` argument, and the smaller of (old,
//     new) is kept. Skipped if no recompressor is provided — image work is
//     environment-specific (sharp on Node, OffscreenCanvas in browsers) so we
//     accept it as injection rather than picking a runtime here.
//  2. Object-stream save. pdf-lib's save() with `useObjectStreams: true`
//     packs the cross-reference table and metadata into an object stream,
//     which always shaves bytes for non-trivial documents.
//
// If the resulting bytes aren't smaller than the input, the input is returned
// unchanged with a notes flag — overpromising would lie to the user.

import { z } from "zod";
import { PDFArray, PDFName, PDFNumber, PDFRawStream } from "pdf-lib";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { loadPdf, toBytes } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";

export const CompressPdfSchema = z.object({
  level: z.enum(["low", "medium", "high"]).optional(),
});

export type CompressLevel = "low" | "medium" | "high";

export interface JpegRecompressor {
  /**
   * Re-encode a JPEG byte buffer at the given quality (1-100, higher is better).
   * Implementations may decode and re-encode (sharp, OffscreenCanvas, etc.).
   * Should return the re-encoded JPEG bytes; throw on failure.
   */
  recompress(bytes: Uint8Array, quality: number): Promise<Uint8Array>;
}

export interface CompressOptions {
  level?: CompressLevel;
  jpegRecompressor?: JpegRecompressor;
}

const QUALITY_BY_LEVEL: Record<CompressLevel, number> = {
  low: 90,
  medium: 75,
  high: 55,
};

function isImageStream(stream: PDFRawStream): boolean {
  const subtype = stream.dict.get(PDFName.of("Subtype"));
  return subtype instanceof PDFName && subtype.asString() === "/Image";
}

function hasDctFilter(stream: PDFRawStream): boolean {
  const filter = stream.dict.get(PDFName.of("Filter"));
  if (filter instanceof PDFName) return filter.asString() === "/DCTDecode";
  if (filter instanceof PDFArray) {
    for (let i = 0; i < filter.size(); i++) {
      const item = filter.get(i);
      if (item instanceof PDFName && item.asString() === "/DCTDecode") return true;
    }
  }
  return false;
}

async function recompressJpegStreams(
  doc: Awaited<ReturnType<typeof loadPdf>>,
  recompressor: JpegRecompressor,
  quality: number,
): Promise<{ scanned: number; rewritten: number; bytesSaved: number }> {
  let scanned = 0;
  let rewritten = 0;
  let bytesSaved = 0;

  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    if (!isImageStream(object)) continue;
    scanned++;
    if (!hasDctFilter(object)) continue;

    const original = object.contents;
    let candidate: Uint8Array;
    try {
      candidate = await recompressor.recompress(original, quality);
    } catch {
      continue;
    }
    if (candidate.byteLength >= original.byteLength) continue;

    // pdf-lib marks `contents` readonly; mutate via cast and refresh the
    // Length entry so the serializer emits the right byte count.
    (object as { contents: Uint8Array }).contents = candidate;
    object.dict.set(PDFName.of("Length"), PDFNumber.of(candidate.byteLength));

    rewritten++;
    bytesSaved += original.byteLength - candidate.byteLength;
  }

  return { scanned, rewritten, bytesSaved };
}

export async function compressPdf(
  input: PDFInput,
  optionsOrLevel: CompressOptions | CompressLevel = "medium",
): Promise<PDFOutput> {
  const options: CompressOptions =
    typeof optionsOrLevel === "string" ? { level: optionsOrLevel } : optionsOrLevel;
  const level: CompressLevel = options.level ?? "medium";

  const inputBytes = toBytes(input);
  const inputSize = inputBytes.byteLength;
  const doc = await loadPdf(input);

  const notes: string[] = [];

  if (options.jpegRecompressor) {
    const stats = await recompressJpegStreams(
      doc,
      options.jpegRecompressor,
      QUALITY_BY_LEVEL[level],
    );
    notes.push(
      `JPEG re-encoding: scanned ${stats.scanned} image stream(s), rewrote ${stats.rewritten}, saved ${stats.bytesSaved} bytes.`,
    );
  } else {
    notes.push(
      "No JpegRecompressor provided — image re-encoding skipped. Pass options.jpegRecompressor to enable.",
    );
  }

  const result = await savePdf(doc, {
    operation: "compress",
    useObjectStreams: true,
    notes,
  });

  if (result.bytes.byteLength >= inputSize) {
    return {
      bytes: inputBytes,
      meta: {
        pageCount: doc.getPageCount(),
        fileSize: inputSize,
        operation: "compress",
        notes: [...notes, "Already optimised — input returned unchanged."],
      },
    };
  }

  return result;
}
