import { describe, it, expect } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { searchText } from "./searchText.js";

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

describe("searchText", () => {
  it("returns hits with pageIndex, snippet, and position", async () => {
    const input = await pdfWithText([
      ["The quick brown fox", "jumps over the lazy dog"],
    ]);
    const hits = await searchText(input, "quick");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.pageIndex).toBe(0);
    expect(hits[0]?.snippet).toContain("quick");
    expect(hits[0]?.position.x).toBeGreaterThan(0);
  });

  it("matches case-insensitively by default", async () => {
    const input = await pdfWithText([["Hello WORLD"]]);
    const hits = await searchText(input, "world");
    expect(hits).toHaveLength(1);
  });

  it("respects caseSensitive=true", async () => {
    const input = await pdfWithText([["Hello WORLD"]]);
    const hits = await searchText(input, "world", { caseSensitive: true });
    expect(hits).toHaveLength(0);
  });

  it("returns multiple hits across pages", async () => {
    const input = await pdfWithText([["needle in haystack"], ["another needle here"]]);
    const hits = await searchText(input, "needle");
    expect(hits).toHaveLength(2);
    expect(hits[0]?.pageIndex).toBe(0);
    expect(hits[1]?.pageIndex).toBe(1);
  });

  it("respects the pages option", async () => {
    const input = await pdfWithText([["needle one"], ["needle two"], ["needle three"]]);
    const hits = await searchText(input, "needle", { pages: [1] });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.pageIndex).toBe(1);
  });

  it("rejects an empty query", async () => {
    const input = await pdfWithText([["x"]]);
    await expect(searchText(input, "")).rejects.toThrow(/non-empty query/);
  });

  it("returns no hits when nothing matches", async () => {
    const input = await pdfWithText([["nothing to see"]]);
    const hits = await searchText(input, "missing");
    expect(hits).toHaveLength(0);
  });
});
