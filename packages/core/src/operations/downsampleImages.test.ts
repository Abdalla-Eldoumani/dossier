import { describe, it, expect } from "vitest";
import { PDFArray, PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { downsampleImages, type ImageDownsampler } from "./downsampleImages.js";
import { UnsupportedFeatureError } from "../types/errors.js";

async function pdfWithFakeJpeg(payload: Uint8Array, width = 1000, height = 1500): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([100, 100]);
  const stream = doc.context.stream(payload, {
    Type: "XObject",
    Subtype: "Image",
    Width: width,
    Height: height,
    ColorSpace: "DeviceRGB",
    BitsPerComponent: 8,
    Filter: "DCTDecode",
    Length: payload.byteLength,
  });
  doc.context.register(stream);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

async function findImageStream(
  bytes: Uint8Array,
): Promise<{ contents: Uint8Array; width: number; height: number } | null> {
  const doc = await PDFDocument.load(bytes);
  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    const subtype = object.dict.get(PDFName.of("Subtype"));
    if (!(subtype instanceof PDFName) || subtype.asString() !== "/Image") continue;
    const w = object.dict.get(PDFName.of("Width"));
    const h = object.dict.get(PDFName.of("Height"));
    return {
      contents: object.contents,
      width: (w as { asNumber(): number }).asNumber(),
      height: (h as { asNumber(): number }).asNumber(),
    };
  }
  return null;
}

describe("downsampleImages", () => {
  it("hands JPEG image streams to the downsampler with their dimensions and target DPI", async () => {
    const original = new Uint8Array(200).fill(7);
    const input = await pdfWithFakeJpeg(original, 1200, 1800);
    const calls: Array<{ width: number; height: number; targetDpi: number; format: string }> = [];
    const downsampler: ImageDownsampler = {
      async downsample({ width, height, targetDpi, format }) {
        calls.push({ width, height, targetDpi, format });
        const newBytes = new Uint8Array(50).fill(9);
        return { bytes: newBytes, width: 600, height: 900 };
      },
    };

    const out = await downsampleImages(input, 96, downsampler);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.width).toBe(1200);
    expect(calls[0]!.height).toBe(1800);
    expect(calls[0]!.targetDpi).toBe(96);
    expect(calls[0]!.format).toBe("jpeg");
    expect(out.meta.notes?.[0]).toMatch(/rewrote 1/);
  });

  it("updates the stream Width and Height when an image is replaced", async () => {
    const original = new Uint8Array(200).fill(7);
    const input = await pdfWithFakeJpeg(original, 1200, 1800);
    const downsampler: ImageDownsampler = {
      async downsample() {
        return { bytes: new Uint8Array(40).fill(3), width: 400, height: 600 };
      },
    };
    const out = await downsampleImages(input, 96, downsampler);
    const after = await findImageStream(out.bytes);
    expect(after?.width).toBe(400);
    expect(after?.height).toBe(600);
  });

  it("keeps the original bytes when the downsampler returns null", async () => {
    const original = new Uint8Array(200).fill(7);
    const input = await pdfWithFakeJpeg(original);
    const downsampler: ImageDownsampler = {
      async downsample() {
        return null;
      },
    };
    const out = await downsampleImages(input, 72, downsampler);
    const after = await findImageStream(out.bytes);
    expect(after?.contents).toEqual(original);
    // Either branch is fine: no rewrites happened or the resave didn't shrink anything.
    expect(out.meta.notes?.[0]).toMatch(/rewrote 0|no net size improvement/);
  });

  it("keeps the original bytes when the downsampler returns larger output", async () => {
    const original = new Uint8Array(100).fill(1);
    const input = await pdfWithFakeJpeg(original);
    const downsampler: ImageDownsampler = {
      async downsample() {
        return { bytes: new Uint8Array(200).fill(2), width: 100, height: 100 };
      },
    };
    const out = await downsampleImages(input, 72, downsampler);
    const after = await findImageStream(out.bytes);
    expect(after?.contents).toEqual(original);
  });

  it("throws UnsupportedFeatureError without a provider", async () => {
    const input = await pdfWithFakeJpeg(new Uint8Array([1, 2, 3]));
    await expect(downsampleImages(input, 72)).rejects.toThrow(UnsupportedFeatureError);
  });

  it("rejects a non-positive targetDpi", async () => {
    const input = await pdfWithFakeJpeg(new Uint8Array([1, 2, 3]));
    const downsampler: ImageDownsampler = {
      async downsample() {
        return null;
      },
    };
    await expect(downsampleImages(input, 0, downsampler)).rejects.toThrow(/positive targetDpi/);
  });
});
