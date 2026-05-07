import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { insertPagesFromPdf } from "./insertPagesFromPdf.js";

async function blankPdfBytes(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("insertPagesFromPdf", () => {
  it("inserts every page of the source when no indices are given", async () => {
    const target = await blankPdfBytes(3);
    const source = await blankPdfBytes(2);
    const out = await insertPagesFromPdf(target, source, 1);
    expect(out.meta.pageCount).toBe(5);
    expect(out.meta.operation).toBe("insert-from-pdf");
  });

  it("respects sourceIndices when provided", async () => {
    const target = await blankPdfBytes(2);
    const source = await blankPdfBytes(5);
    const out = await insertPagesFromPdf(target, source, 0, [0, 2]);
    expect(out.meta.pageCount).toBe(4);
  });

  it("rejects atIndex past the end of the target", async () => {
    const target = await blankPdfBytes(2);
    const source = await blankPdfBytes(1);
    await expect(insertPagesFromPdf(target, source, 99)).rejects.toThrow(/past the end/i);
  });

  it("rejects out-of-bounds source indices", async () => {
    const target = await blankPdfBytes(2);
    const source = await blankPdfBytes(2);
    await expect(insertPagesFromPdf(target, source, 0, [5])).rejects.toThrow(/out of bounds/i);
  });
});
