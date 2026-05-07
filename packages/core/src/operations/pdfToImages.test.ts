import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { pdfToImages, type PageRenderer } from "./pdfToImages.js";

async function blankPdfBytes(pageCount: number, w = 612, h = 792): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([w, h]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

function fakeRenderer(seen: Array<{ width: number; height: number; format: string; dpi: number }>): PageRenderer {
  return {
    async render({ viewport, format, dpi }) {
      seen.push({ width: viewport.width, height: viewport.height, format, dpi });
      const tag = `${format}@${dpi}:${Math.round(viewport.width)}x${Math.round(viewport.height)}`;
      return new TextEncoder().encode(tag);
    },
  };
}

describe("pdfToImages", () => {
  it("renders every page once with default 150 dpi PNG", async () => {
    const input = await blankPdfBytes(3);
    const seen: Array<{ width: number; height: number; format: string; dpi: number }> = [];
    const out = await pdfToImages(input, fakeRenderer(seen));
    expect(out.pageCount).toBe(3);
    expect(out.images).toHaveLength(3);
    expect(out.format).toBe("png");
    expect(seen).toHaveLength(3);
    expect(seen.every((s) => s.format === "png" && s.dpi === 150)).toBe(true);
  });

  it("scales viewport with the dpi option", async () => {
    const input = await blankPdfBytes(1, 612, 792); // US Letter at 72 dpi
    const seen: Array<{ width: number; height: number; format: string; dpi: number }> = [];
    await pdfToImages(input, fakeRenderer(seen), { dpi: 300 });
    // 612 points * 300/72 = 2550, 792 * 300/72 = 3300
    expect(Math.round(seen[0]!.width)).toBe(2550);
    expect(Math.round(seen[0]!.height)).toBe(3300);
  });

  it("respects the pages option", async () => {
    const input = await blankPdfBytes(4);
    const seen: Array<{ width: number; height: number; format: string; dpi: number }> = [];
    const out = await pdfToImages(input, fakeRenderer(seen), { pages: [0, 2] });
    expect(out.images).toHaveLength(2);
    expect(seen).toHaveLength(2);
  });

  it("passes the format choice to the renderer", async () => {
    const input = await blankPdfBytes(1);
    const seen: Array<{ width: number; height: number; format: string; dpi: number }> = [];
    const out = await pdfToImages(input, fakeRenderer(seen), { format: "jpeg" });
    expect(out.format).toBe("jpeg");
    expect(seen[0]!.format).toBe("jpeg");
  });

  it("rejects when no renderer is provided", async () => {
    const input = await blankPdfBytes(1);
    await expect(
      pdfToImages(input, undefined as unknown as PageRenderer),
    ).rejects.toThrow(/PageRenderer/);
  });

  it("rejects out-of-bounds page indices", async () => {
    const input = await blankPdfBytes(2);
    const seen: Array<{ width: number; height: number; format: string; dpi: number }> = [];
    await expect(
      pdfToImages(input, fakeRenderer(seen), { pages: [99] }),
    ).rejects.toThrow(/out of bounds/i);
  });
});
