import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { rotatePages } from "./rotatePages.js";

async function blankPdfBytes(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("rotatePages", () => {
  it("rotates the requested pages and leaves the others alone", async () => {
    const input = await blankPdfBytes(3);
    const out = await rotatePages(input, [0, 2], 90);
    const doc = await PDFDocument.load(out.bytes);
    expect(doc.getPage(0).getRotation().angle).toBe(90);
    expect(doc.getPage(1).getRotation().angle).toBe(0);
    expect(doc.getPage(2).getRotation().angle).toBe(90);
  });

  it("normalises a negative rotation into [0, 360)", async () => {
    const input = await blankPdfBytes(1);
    const out = await rotatePages(input, [0], -90);
    const doc = await PDFDocument.load(out.bytes);
    expect(doc.getPage(0).getRotation().angle).toBe(270);
  });

  it("rejects unsupported degrees", async () => {
    const input = await blankPdfBytes(1);
    await expect(rotatePages(input, [0], 45)).rejects.toThrow(/must be/i);
  });

  it("rejects out-of-bounds indices", async () => {
    const input = await blankPdfBytes(2);
    await expect(rotatePages(input, [5], 90)).rejects.toThrow(/out of bounds/i);
  });
});
