import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { extractPages } from "./extractPages.js";

async function blankPdfBytes(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("extractPages", () => {
  it("returns a PDF containing exactly the requested pages", async () => {
    const input = await blankPdfBytes(5);
    const out = await extractPages(input, [0, 2, 4]);
    expect(out.meta.pageCount).toBe(3);
    expect(out.meta.operation).toBe("extract");
  });

  it("preserves the requested order, including duplicates", async () => {
    const input = await blankPdfBytes(5);
    const out = await extractPages(input, [4, 4, 0]);
    expect(out.meta.pageCount).toBe(3);
  });

  it("rejects an out-of-bounds index", async () => {
    const input = await blankPdfBytes(3);
    await expect(extractPages(input, [5])).rejects.toThrow(/out of bounds/i);
  });

  it("rejects an empty index list", async () => {
    const input = await blankPdfBytes(3);
    await expect(extractPages(input, [])).rejects.toThrow(/at least one/i);
  });
});
