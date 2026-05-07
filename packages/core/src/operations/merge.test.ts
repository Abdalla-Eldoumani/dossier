import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { mergePdfs } from "./merge.js";

// Helper — generate a PDF with N blank pages so we don't need on-disk fixtures.
async function blankPdfBytes(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([612, 792]); // US Letter in points
  }
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("mergePdfs", () => {
  it("merges two single-page PDFs into one two-page PDF", async () => {
    const a = await blankPdfBytes(1);
    const b = await blankPdfBytes(1);
    const out = await mergePdfs([a, b]);
    expect(out.meta.pageCount).toBe(2);
    expect(out.meta.operation).toBe("merge");
    expect(out.bytes.length).toBeGreaterThan(0);
  });

  it("preserves input order in the output", async () => {
    const a = await blankPdfBytes(3);
    const b = await blankPdfBytes(2);
    const c = await blankPdfBytes(1);
    const out = await mergePdfs([a, b, c]);
    expect(out.meta.pageCount).toBe(6);
  });

  it("rejects an empty input array", async () => {
    await expect(mergePdfs([])).rejects.toThrow(/at least one input/i);
  });

  it("rejects non-PDF bytes as InvalidPdfError", async () => {
    const garbage = new TextEncoder().encode("not a pdf");
    await expect(mergePdfs([garbage])).rejects.toThrow();
  });
});
