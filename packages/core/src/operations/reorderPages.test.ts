import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { reorderPages } from "./reorderPages.js";

async function blankPdfBytes(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("reorderPages", () => {
  it("returns a same-size PDF in the requested order", async () => {
    const input = await blankPdfBytes(4);
    const out = await reorderPages(input, [3, 2, 1, 0]);
    expect(out.meta.pageCount).toBe(4);
    expect(out.meta.operation).toBe("reorder");
  });

  it("rejects a list with the wrong length", async () => {
    const input = await blankPdfBytes(4);
    await expect(reorderPages(input, [0, 1])).rejects.toThrow(/exactly 4/);
  });

  it("rejects a duplicate index", async () => {
    const input = await blankPdfBytes(3);
    await expect(reorderPages(input, [0, 0, 1])).rejects.toThrow(/permutation/i);
  });

  it("rejects out-of-bounds indices", async () => {
    const input = await blankPdfBytes(3);
    await expect(reorderPages(input, [0, 1, 5])).rejects.toThrow(/out of bounds/i);
  });
});
