import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { splitByRanges } from "./splitByRanges.js";

async function blankPdfBytes(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

async function pageCountOf(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPageCount();
}

describe("splitByRanges", () => {
  it("produces one output per range, sized correctly", async () => {
    const input = await blankPdfBytes(10);
    const outputs = await splitByRanges(input, [
      { from: 0, to: 2 },
      { from: 5, to: 8 },
    ]);
    expect(outputs).toHaveLength(2);
    expect(await pageCountOf(outputs[0]!)).toBe(2);
    expect(await pageCountOf(outputs[1]!)).toBe(3);
  });

  it("preserves the caller's range order in the output", async () => {
    const input = await blankPdfBytes(10);
    const outputs = await splitByRanges(input, [
      { from: 7, to: 10 },
      { from: 0, to: 3 },
    ]);
    expect(await pageCountOf(outputs[0]!)).toBe(3);
    expect(await pageCountOf(outputs[1]!)).toBe(3);
  });

  it("rejects overlapping ranges", async () => {
    const input = await blankPdfBytes(10);
    await expect(
      splitByRanges(input, [
        { from: 0, to: 5 },
        { from: 3, to: 7 },
      ]),
    ).rejects.toThrow(/overlap/i);
  });

  it("rejects ranges out of bounds", async () => {
    const input = await blankPdfBytes(5);
    await expect(splitByRanges(input, [{ from: 0, to: 10 }])).rejects.toThrow(/out of bounds/i);
  });

  it("rejects an empty range list", async () => {
    const input = await blankPdfBytes(5);
    await expect(splitByRanges(input, [])).rejects.toThrow(/at least one/i);
  });
});
