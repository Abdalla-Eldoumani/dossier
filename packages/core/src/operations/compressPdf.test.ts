import { describe, it, expect } from "vitest";
import { PDFArray, PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { compressPdf, type JpegRecompressor } from "./compressPdf.js";

async function blankPdfBytes(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

// Build a tiny JPEG-bearing PDF by hand. We don't need the JPEG to be valid
// for compress-time scanning; the operation only inspects the stream's
// dictionary (Subtype=/Image, Filter=/DCTDecode) and substitutes the bytes
// the recompressor returns. The substituted bytes also don't need to be
// valid JPEG — we just verify the substitution happens.
async function pdfWithFakeJpegImage(payload: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([100, 100]);
  const stream = doc.context.stream(payload, {
    Type: "XObject",
    Subtype: "Image",
    Width: 1,
    Height: 1,
    ColorSpace: "DeviceRGB",
    BitsPerComponent: 8,
    Filter: "DCTDecode",
    Length: payload.byteLength,
  });
  doc.context.register(stream);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

async function findImageStreamBytes(pdf: Uint8Array): Promise<Uint8Array | null> {
  const doc = await PDFDocument.load(pdf);
  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    const subtype = object.dict.get(PDFName.of("Subtype"));
    if (!(subtype instanceof PDFName) || subtype.asString() !== "/Image") continue;
    const filter = object.dict.get(PDFName.of("Filter"));
    let dct = false;
    if (filter instanceof PDFName && filter.asString() === "/DCTDecode") dct = true;
    if (filter instanceof PDFArray) {
      for (let i = 0; i < filter.size(); i++) {
        const item = filter.get(i);
        if (item instanceof PDFName && item.asString() === "/DCTDecode") dct = true;
      }
    }
    if (!dct) continue;
    return object.contents;
  }
  return null;
}

describe("compressPdf", () => {
  it("returns a PDFOutput tagged with the compress operation", async () => {
    const input = await blankPdfBytes(3);
    const out = await compressPdf(input);
    expect(out.meta.operation).toBe("compress");
    expect(out.meta.pageCount).toBe(3);
    expect(out.bytes.length).toBeGreaterThan(0);
  });

  it("attaches notes describing what ran when no recompressor is provided", async () => {
    const input = await blankPdfBytes(1);
    const out = await compressPdf(input);
    expect(out.meta.notes?.some((n) => /No JpegRecompressor/.test(n))).toBe(true);
  });

  it("invokes the recompressor on JPEG image streams", async () => {
    const fakeOriginal = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const input = await pdfWithFakeJpegImage(fakeOriginal);

    const calls: { bytes: Uint8Array; quality: number }[] = [];
    const recompressor: JpegRecompressor = {
      async recompress(bytes, quality) {
        calls.push({ bytes, quality });
        // Return shorter bytes to trigger replacement.
        return new Uint8Array([99, 99]);
      },
    };

    const out = await compressPdf(input, { level: "high", jpegRecompressor: recompressor });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.quality).toBe(55);

    const newImageBytes = await findImageStreamBytes(out.bytes);
    expect(newImageBytes).toEqual(new Uint8Array([99, 99]));
    expect(out.meta.notes?.some((n) => /rewrote 1/.test(n))).toBe(true);
  });

  it("keeps the original image bytes when the recompressor returns larger output", async () => {
    const original = new Uint8Array(100).fill(7);
    const input = await pdfWithFakeJpegImage(original);

    const recompressor: JpegRecompressor = {
      async recompress() {
        // Larger than the original.
        return new Uint8Array(200).fill(8);
      },
    };

    const out = await compressPdf(input, { jpegRecompressor: recompressor });
    const after = await findImageStreamBytes(out.bytes);
    expect(after).toEqual(original);
    expect(out.meta.notes?.some((n) => /rewrote 0/.test(n))).toBe(true);
  });

  it("uses the level argument to pick a quality target", async () => {
    const original = new Uint8Array([1, 2, 3, 4]);
    const input = await pdfWithFakeJpegImage(original);
    const seen: number[] = [];
    const recompressor: JpegRecompressor = {
      async recompress(_bytes, quality) {
        seen.push(quality);
        return original;
      },
    };

    await compressPdf(input, { level: "low", jpegRecompressor: recompressor });
    await compressPdf(input, { level: "medium", jpegRecompressor: recompressor });
    await compressPdf(input, { level: "high", jpegRecompressor: recompressor });

    expect(seen).toEqual([90, 75, 55]);
  });

  it("accepts a level string for backward compatibility", async () => {
    const input = await blankPdfBytes(2);
    const out = await compressPdf(input, "high");
    expect(out.meta.operation).toBe("compress");
  });

  it("returns the input unchanged when the output would not be smaller", async () => {
    const input = await blankPdfBytes(1);
    const out = await compressPdf(input);
    if (out.bytes.byteLength === input.byteLength) {
      expect(out.meta.notes?.some((n) => /already optimised/i.test(n))).toBe(true);
    } else {
      expect(out.bytes.byteLength).toBeLessThan(input.byteLength);
    }
  });
});
