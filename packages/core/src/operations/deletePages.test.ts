import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { deletePages } from "./deletePages.js";

async function blankPdfBytes(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("deletePages", () => {
  it("removes the requested pages", async () => {
    const input = await blankPdfBytes(5);
    const out = await deletePages(input, [1, 3]);
    expect(out.meta.pageCount).toBe(3);
    expect(out.meta.operation).toBe("delete");
  });

  it("dedupes overlapping requests", async () => {
    const input = await blankPdfBytes(5);
    const out = await deletePages(input, [1, 1, 3]);
    expect(out.meta.pageCount).toBe(3);
  });

  it("refuses to delete every page", async () => {
    const input = await blankPdfBytes(3);
    await expect(deletePages(input, [0, 1, 2])).rejects.toThrow(/at least one page/i);
  });

  it("rejects out-of-bounds indices", async () => {
    const input = await blankPdfBytes(2);
    await expect(deletePages(input, [5])).rejects.toThrow(/out of bounds/i);
  });
});
