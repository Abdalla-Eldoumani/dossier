import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { insertBlankPage } from "./insertBlankPage.js";

async function blankPdfBytes(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("insertBlankPage", () => {
  it("inserts an A4 page at the start", async () => {
    const input = await blankPdfBytes(3);
    const out = await insertBlankPage(input, 0, { name: "A4" });
    expect(out.meta.pageCount).toBe(4);
    const doc = await PDFDocument.load(out.bytes);
    const { width, height } = doc.getPage(0).getSize();
    expect(Math.round(width)).toBe(595);
    expect(Math.round(height)).toBe(842);
  });

  it("inserts at the end when atIndex equals page count", async () => {
    const input = await blankPdfBytes(2);
    const out = await insertBlankPage(input, 2, { custom: { width: 100, height: 200 } });
    expect(out.meta.pageCount).toBe(3);
    const doc = await PDFDocument.load(out.bytes);
    const { width, height } = doc.getPage(2).getSize();
    expect(width).toBe(100);
    expect(height).toBe(200);
  });

  it("rejects atIndex past the end", async () => {
    const input = await blankPdfBytes(2);
    await expect(insertBlankPage(input, 10, { name: "Letter" })).rejects.toThrow(/past the end/i);
  });
});
