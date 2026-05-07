import { describe, it, expect } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { pdfToMarkdown } from "./pdfToMarkdown.js";

interface Line {
  text: string;
  size: number;
}

async function pdfWithLines(pages: Line[][]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const lines of pages) {
    const page = doc.addPage([612, 792]);
    let y = 740;
    for (const { text, size } of lines) {
      page.drawText(text, { x: 72, y, font, size });
      y -= size * 1.5 + 8;
    }
  }
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("pdfToMarkdown", () => {
  it("emits H1 for the largest size when body is the modal size", async () => {
    const input = await pdfWithLines([
      [
        { text: "Big Heading", size: 24 },
        { text: "Some body text here", size: 12 },
        { text: "More body text follows", size: 12 },
        { text: "Even more body content", size: 12 },
      ],
    ]);
    const out = await pdfToMarkdown(input);
    expect(out.pageCount).toBe(1);
    expect(out.markdown).toContain("# Big Heading");
    expect(out.markdown).toContain("Some body text here");
    expect(out.markdown).not.toContain("# Some body");
  });

  it("emits H2 for an intermediate size", async () => {
    const input = await pdfWithLines([
      [
        { text: "Subhead", size: 16 },
        { text: "Body line one", size: 12 },
        { text: "Body line two", size: 12 },
        { text: "Body line three", size: 12 },
      ],
    ]);
    const out = await pdfToMarkdown(input);
    expect(out.markdown).toContain("## Subhead");
  });

  it("separates pages with a horizontal rule", async () => {
    const input = await pdfWithLines([
      [{ text: "First page line", size: 12 }],
      [{ text: "Second page line", size: 12 }],
    ]);
    const out = await pdfToMarkdown(input);
    expect(out.markdown).toContain("---");
    expect(out.markdown.indexOf("First page")).toBeLessThan(out.markdown.indexOf("---"));
    expect(out.markdown.indexOf("---")).toBeLessThan(out.markdown.indexOf("Second page"));
  });

  it("respects the pages option", async () => {
    const input = await pdfWithLines([
      [{ text: "Skip me", size: 12 }],
      [{ text: "Keep me", size: 12 }],
    ]);
    const out = await pdfToMarkdown(input, { pages: [1] });
    expect(out.markdown).toContain("Keep me");
    expect(out.markdown).not.toContain("Skip me");
  });

  it("rejects invalid PDF input", async () => {
    const garbage = new TextEncoder().encode("definitely not a pdf");
    await expect(pdfToMarkdown(garbage)).rejects.toThrow();
  });
});
