import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { cropPages } from "./cropPages.js";

async function blankPdfBytes(
  pageCount: number,
  width = 612,
  height = 792,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([width, height]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("cropPages", () => {
  it("trims the requested pages to the region", async () => {
    const input = await blankPdfBytes(2);
    const out = await cropPages(input, [0], { x: 50, y: 50, width: 200, height: 300 });
    const doc = await PDFDocument.load(out.bytes);
    const cropped = doc.getPage(0);
    expect(cropped.getSize().width).toBe(200);
    expect(cropped.getSize().height).toBe(300);
  });

  it("leaves untouched pages alone", async () => {
    const input = await blankPdfBytes(2);
    const out = await cropPages(input, [0], { x: 0, y: 0, width: 100, height: 100 });
    const doc = await PDFDocument.load(out.bytes);
    expect(doc.getPage(1).getSize().width).toBe(612);
  });

  it("rejects a region that exceeds the page bounds", async () => {
    const input = await blankPdfBytes(1);
    await expect(
      cropPages(input, [0], { x: 0, y: 0, width: 1000, height: 1000 }),
    ).rejects.toThrow(/exceeds/i);
  });

  it("rejects out-of-bounds page indices", async () => {
    const input = await blankPdfBytes(1);
    await expect(cropPages(input, [5], { x: 0, y: 0, width: 100, height: 100 })).rejects.toThrow(
      /out of bounds/i,
    );
  });
});
