// Reduce the resolution of embedded images. The operation iterates Image
// XObjects, hands each one (with current pixel dimensions and the caller's
// target DPI) to an injected ImageDownsampler, and replaces the stream when
// the new bytes are smaller. The downsampler decides what target pixel
// dimensions to use given the requested DPI — pdf doesn't carry an absolute
// "image DPI" field, so the operation can't compute one without parsing the
// content stream's cm matrix.
//
// Supports DCTDecode (JPEG) and FlateDecode (compressed pixel data) image
// streams. Other filter chains (CCITTFaxDecode, JBIG2Decode, etc.) are
// skipped and counted in the notes.

import { z } from "zod";
import { PDFArray, PDFName, PDFNumber, PDFRawStream } from "pdf-lib";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { OperationError, UnsupportedFeatureError } from "../types/errors.js";
import { loadPdf, toBytes } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";

export const DownsampleImagesSchema = z.object({
  targetDpi: z.number().positive(),
});

export type ImageStreamFormat = "jpeg" | "flate-raw";

export interface ImageDownsampler {
  downsample(input: {
    bytes: Uint8Array;
    format: ImageStreamFormat;
    width: number;
    height: number;
    targetDpi: number;
  }): Promise<{ bytes: Uint8Array; width: number; height: number } | null>;
}

function isImageStream(stream: PDFRawStream): boolean {
  const subtype = stream.dict.get(PDFName.of("Subtype"));
  return subtype instanceof PDFName && subtype.asString() === "/Image";
}

function imageFormat(stream: PDFRawStream): ImageStreamFormat | null {
  const filter = stream.dict.get(PDFName.of("Filter"));
  const names: string[] = [];
  if (filter instanceof PDFName) names.push(filter.asString());
  else if (filter instanceof PDFArray) {
    for (let i = 0; i < filter.size(); i++) {
      const item = filter.get(i);
      if (item instanceof PDFName) names.push(item.asString());
    }
  }
  if (names.includes("/DCTDecode")) return "jpeg";
  if (names.includes("/FlateDecode")) return "flate-raw";
  return null;
}

function imageDimensions(stream: PDFRawStream): { width: number; height: number } | null {
  const w = stream.dict.get(PDFName.of("Width"));
  const h = stream.dict.get(PDFName.of("Height"));
  if (w instanceof PDFNumber && h instanceof PDFNumber) {
    return { width: w.asNumber(), height: h.asNumber() };
  }
  return null;
}

export async function downsampleImages(
  input: PDFInput,
  targetDpi: number,
  downsampler?: ImageDownsampler,
): Promise<PDFOutput> {
  if (!Number.isFinite(targetDpi) || targetDpi <= 0) {
    throw new OperationError(
      "INVALID_INPUT",
      "downsampleImages requires a positive targetDpi.",
    );
  }
  if (!downsampler || typeof downsampler.downsample !== "function") {
    throw new UnsupportedFeatureError(
      "downsampleImages requires an ImageDownsampler provider. The web app and " +
        "MCP server should inject one (sharp on Node, OffscreenCanvas in browsers, etc.).",
    );
  }

  const inputBytes = toBytes(input);
  const inputSize = inputBytes.byteLength;
  const doc = await loadPdf(input);

  let scanned = 0;
  let rewritten = 0;
  let skippedFormat = 0;
  let bytesSaved = 0;

  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    if (!isImageStream(object)) continue;
    scanned++;

    const format = imageFormat(object);
    if (!format) {
      skippedFormat++;
      continue;
    }
    const dims = imageDimensions(object);
    if (!dims) {
      skippedFormat++;
      continue;
    }

    const original = object.contents;
    let result: { bytes: Uint8Array; width: number; height: number } | null = null;
    try {
      result = await downsampler.downsample({
        bytes: original,
        format,
        width: dims.width,
        height: dims.height,
        targetDpi,
      });
    } catch {
      continue;
    }
    if (!result || result.bytes.byteLength >= original.byteLength) continue;

    (object as { contents: Uint8Array }).contents = result.bytes;
    object.dict.set(PDFName.of("Length"), PDFNumber.of(result.bytes.byteLength));
    object.dict.set(PDFName.of("Width"), PDFNumber.of(result.width));
    object.dict.set(PDFName.of("Height"), PDFNumber.of(result.height));
    rewritten++;
    bytesSaved += original.byteLength - result.bytes.byteLength;
  }

  const out = await savePdf(doc, {
    operation: "downsample-images",
    useObjectStreams: true,
    notes: [
      `Scanned ${scanned} image stream(s); rewrote ${rewritten}; skipped ${skippedFormat} unsupported format(s); saved ${bytesSaved} bytes in image data.`,
    ],
  });

  if (out.bytes.byteLength >= inputSize) {
    return {
      bytes: inputBytes,
      meta: {
        pageCount: doc.getPageCount(),
        fileSize: inputSize,
        operation: "downsample-images",
        notes: [
          `Scanned ${scanned} image stream(s); no net size improvement — input returned unchanged.`,
        ],
      },
    };
  }
  return out;
}
