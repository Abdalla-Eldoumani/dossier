import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { duplicatePages } from "./duplicatePages.js";

async function blankPdfBytes(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("duplicatePages", () => {
  it("duplicates the requested pages in place", async () => {
    const input = await blankPdfBytes(5);
    const out = await duplicatePages(input, [1, 3]);
    expect(out.meta.pageCount).toBe(7);
    expect(out.meta.operation).toBe("duplicate");
  });

  it("dedupes the request when the same index is given twice", async () => {
    const input = await blankPdfBytes(3);
    const out = await duplicatePages(input, [1, 1]);
    expect(out.meta.pageCount).toBe(4);
  });

  it("rejects out-of-bounds indices", async () => {
    const input = await blankPdfBytes(2);
    await expect(duplicatePages(input, [5])).rejects.toThrow(/out of bounds/i);
  });

  it("rejects an empty index list", async () => {
    const input = await blankPdfBytes(2);
    await expect(duplicatePages(input, [])).rejects.toThrow(/at least one/i);
  });
});
