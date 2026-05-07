import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { imagesToPdf } from "./imagesToPdf.js";

// 1x1 transparent RGBA PNG, base64-decoded.
const PNG_1X1_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const png1x1 = Uint8Array.from(atob(PNG_1X1_BASE64), (c) => c.charCodeAt(0));

describe("imagesToPdf", () => {
  it("creates one PDF page per image with the default layout", async () => {
    const out = await imagesToPdf([png1x1, png1x1, png1x1]);
    expect(out.meta.operation).toBe("images-to-pdf");
    expect(out.meta.pageCount).toBe(3);
  });

  it("packs two images per page with two-per-page layout", async () => {
    const out = await imagesToPdf([png1x1, png1x1, png1x1, png1x1, png1x1], {
      layout: "two-per-page",
    });
    // 5 images / 2 per page = 3 pages (2 + 2 + 1)
    expect(out.meta.pageCount).toBe(3);
  });

  it("packs four images per page with four-per-page layout", async () => {
    const out = await imagesToPdf(Array(9).fill(png1x1), { layout: "four-per-page" });
    // 9 / 4 = 3 pages (4 + 4 + 1)
    expect(out.meta.pageCount).toBe(3);
  });

  it("respects a custom page size", async () => {
    const out = await imagesToPdf([png1x1], {
      pageSize: { custom: { width: 300, height: 400 } },
    });
    const doc = await PDFDocument.load(out.bytes);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBe(300);
    expect(height).toBe(400);
  });

  it("rejects an empty image list", async () => {
    await expect(imagesToPdf([])).rejects.toThrow(/at least one image/i);
  });

  it("rejects bytes that are neither PNG nor JPEG", async () => {
    const garbage = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    await expect(imagesToPdf([garbage])).rejects.toThrow(/PNG or JPEG/);
  });
});
