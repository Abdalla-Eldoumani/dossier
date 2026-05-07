import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { splitByPageCount } from "./splitByPageCount.js";

async function blankPdfBytes(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([612, 792]);
  }
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

async function pageCountOf(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPageCount();
}

describe("splitByPageCount", () => {
  it("splits a 10-page PDF by 3 into chunks of 3, 3, 3, 1", async () => {
    const input = await blankPdfBytes(10);
    const outputs = await splitByPageCount(input, 3);
    const counts = await Promise.all(outputs.map(pageCountOf));
    expect(counts).toEqual([3, 3, 3, 1]);
  });

  it("returns a single chunk when N exceeds the page count", async () => {
    const input = await blankPdfBytes(2);
    const outputs = await splitByPageCount(input, 10);
    expect(outputs).toHaveLength(1);
    expect(await pageCountOf(outputs[0]!)).toBe(2);
  });

  it("rejects a non-positive page count", async () => {
    const input = await blankPdfBytes(2);
    await expect(splitByPageCount(input, 0)).rejects.toThrow(/positive/i);
    await expect(splitByPageCount(input, -1)).rejects.toThrow(/positive/i);
  });
});
