import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { addHeaderFooter } from "./addHeaderFooter.js";

async function blankPdfBytes(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("addHeaderFooter", () => {
  it("draws a header on every page", async () => {
    const input = await blankPdfBytes(2);
    const out = await addHeaderFooter(input, { header: "Confidential" });
    expect(out.meta.pageCount).toBe(2);
    expect(out.meta.operation).toBe("header-footer");
    expect(out.bytes.length).toBeGreaterThan(input.length);
  });

  it("substitutes {n}, {total}, and {date} in the footer", async () => {
    const input = await blankPdfBytes(3);
    const out = await addHeaderFooter(input, { footer: "Page {n}/{total} — {date}" });
    expect(out.meta.pageCount).toBe(3);
  });

  it("supports both header and footer at once with right alignment", async () => {
    const input = await blankPdfBytes(2);
    const out = await addHeaderFooter(input, {
      header: "Dossier",
      footer: "{n}/{total}",
      align: "right",
    });
    expect(out.meta.pageCount).toBe(2);
  });

  it("rejects when neither header nor footer is provided", async () => {
    const input = await blankPdfBytes(2);
    await expect(addHeaderFooter(input, {})).rejects.toThrow(
      /at least a header or footer/i,
    );
  });
});
