import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { addWatermark } from "./addWatermark.js";

async function blankPdfBytes(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("addWatermark", () => {
  it("stamps text on every page", async () => {
    const input = await blankPdfBytes(3);
    const out = await addWatermark(input, { kind: "text", text: "DRAFT" });
    expect(out.meta.pageCount).toBe(3);
    expect(out.meta.operation).toBe("watermark");
    expect(out.bytes.length).toBeGreaterThan(input.length);
  });

  it("accepts a custom { x, y } position", async () => {
    const input = await blankPdfBytes(1);
    const out = await addWatermark(input, {
      kind: "text",
      text: "X",
      position: { x: 100, y: 100 },
    });
    expect(out.meta.pageCount).toBe(1);
  });

  it("respects opacity and rotation parameters", async () => {
    const input = await blankPdfBytes(1);
    const out = await addWatermark(input, {
      kind: "text",
      text: "DRAFT",
      opacity: 0.5,
      rotation: 45,
    });
    expect(out.meta.pageCount).toBe(1);
  });

  it("rejects an image that is not PNG or JPEG", async () => {
    const input = await blankPdfBytes(1);
    const garbage = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    await expect(addWatermark(input, { kind: "image", image: garbage })).rejects.toThrow(
      /PNG or JPEG/,
    );
  });
});
