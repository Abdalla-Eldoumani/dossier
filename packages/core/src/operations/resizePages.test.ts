import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { resizePages } from "./resizePages.js";

async function blankPdfBytes(pageCount: number, w = 612, h = 792): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([w, h]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("resizePages", () => {
  it("resizes to a named size", async () => {
    const input = await blankPdfBytes(2);
    const out = await resizePages(input, [0], { name: "A4" }, false);
    const doc = await PDFDocument.load(out.bytes);
    const { width, height } = doc.getPage(0).getSize();
    expect(Math.round(width)).toBe(595);
    expect(Math.round(height)).toBe(842);
  });

  it("resizes to a custom size", async () => {
    const input = await blankPdfBytes(1);
    const out = await resizePages(input, [0], { custom: { width: 200, height: 300 } }, false);
    const doc = await PDFDocument.load(out.bytes);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBe(200);
    expect(height).toBe(300);
  });

  it("leaves untouched pages alone", async () => {
    const input = await blankPdfBytes(2);
    const out = await resizePages(input, [0], { custom: { width: 200, height: 300 } }, false);
    const doc = await PDFDocument.load(out.bytes);
    expect(doc.getPage(1).getSize().width).toBe(612);
  });

  it("scales content when requested", async () => {
    const input = await blankPdfBytes(1);
    const out = await resizePages(input, [0], { custom: { width: 100, height: 100 } }, true);
    const doc = await PDFDocument.load(out.bytes);
    expect(doc.getPage(0).getSize().width).toBe(100);
    expect(doc.getPage(0).getSize().height).toBe(100);
  });

  it("rejects out-of-bounds indices", async () => {
    const input = await blankPdfBytes(1);
    await expect(resizePages(input, [5], { name: "Letter" }, false)).rejects.toThrow(
      /out of bounds/i,
    );
  });
});
