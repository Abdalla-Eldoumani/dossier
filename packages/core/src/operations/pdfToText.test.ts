import { describe, it, expect } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { pdfToText } from "./pdfToText.js";

async function pdfWithText(linesPerPage: string[][]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const lines of linesPerPage) {
    const page = doc.addPage([612, 792]);
    let y = 740;
    for (const line of lines) {
      page.drawText(line, { x: 72, y, font, size: 12 });
      y -= 20;
    }
  }
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("pdfToText", () => {
  it("extracts text from every page", async () => {
    const input = await pdfWithText([["Hello world"], ["Goodbye moon"]]);
    const out = await pdfToText(input);
    expect(out.pageCount).toBe(2);
    expect(out.pages).toHaveLength(2);
    expect(out.pages[0]).toContain("Hello world");
    expect(out.pages[1]).toContain("Goodbye moon");
    expect(out.text).toContain("Hello world");
    expect(out.text).toContain("Goodbye moon");
  });

  it("respects the pages option", async () => {
    const input = await pdfWithText([["Page one"], ["Page two"], ["Page three"]]);
    const out = await pdfToText(input, { pages: [0, 2] });
    expect(out.pages).toHaveLength(2);
    expect(out.pages[0]).toContain("Page one");
    expect(out.pages[1]).toContain("Page three");
  });

  it("preserves line order with layoutPreserve", async () => {
    const input = await pdfWithText([["First line", "Second line", "Third line"]]);
    const out = await pdfToText(input, { layoutPreserve: true });
    const lines = (out.pages[0] ?? "").split("\n").filter((l) => l.length > 0);
    expect(lines[0]).toContain("First");
    expect(lines[lines.length - 1]).toContain("Third");
  });

  it("rejects out-of-bounds page indices", async () => {
    const input = await pdfWithText([["Single page"]]);
    await expect(pdfToText(input, { pages: [99] })).rejects.toThrow(/out of bounds/i);
  });

  it("rejects invalid PDF input", async () => {
    const garbage = new TextEncoder().encode("definitely not a pdf");
    await expect(pdfToText(garbage)).rejects.toThrow();
  });
});
