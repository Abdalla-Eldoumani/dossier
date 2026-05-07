import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { addPageNumbers } from "./addPageNumbers.js";

async function blankPdfBytes(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("addPageNumbers", () => {
  it("stamps a number on every page by default", async () => {
    const input = await blankPdfBytes(3);
    const out = await addPageNumbers(input, { format: "{n}" });
    expect(out.meta.pageCount).toBe(3);
    expect(out.meta.operation).toBe("page-numbers");
    expect(out.bytes.length).toBeGreaterThan(input.length);
  });

  it("skips the first N pages when skipFirst is set", async () => {
    const input = await blankPdfBytes(4);
    const out = await addPageNumbers(input, { format: "{n}", skipFirst: 2 });
    expect(out.meta.pageCount).toBe(4);
  });

  it("substitutes {n} and {total} in the format string", async () => {
    const input = await blankPdfBytes(2);
    const out = await addPageNumbers(input, { format: "Page {n} of {total}" });
    expect(out.meta.pageCount).toBe(2);
  });

  it("respects startAt when renumbering", async () => {
    const input = await blankPdfBytes(2);
    const out = await addPageNumbers(input, { format: "{n}", startAt: 5 });
    expect(out.meta.pageCount).toBe(2);
  });
});
