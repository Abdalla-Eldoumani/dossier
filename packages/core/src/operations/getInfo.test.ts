import { describe, it, expect } from "vitest";
import { PDFDocument, degrees } from "pdf-lib";
import { getInfo } from "./getInfo.js";

async function multiPagePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]); // Letter
  const a4 = doc.addPage([595, 842]);
  a4.setRotation(degrees(90));
  doc.addPage([420, 595]); // A5
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("getInfo", () => {
  it("reports page count and per-page dimensions", async () => {
    const input = await multiPagePdf();
    const info = await getInfo(input);
    expect(info.pageCount).toBe(3);
    expect(info.pages[0]).toEqual({ width: 612, height: 792, rotation: 0 });
    expect(info.pages[1]).toEqual({ width: 595, height: 842, rotation: 90 });
    expect(info.pages[2]?.width).toBe(420);
  });

  it("reports the PDF version from the header", async () => {
    const input = await multiPagePdf();
    const info = await getInfo(input);
    expect(info.pdfVersion).toMatch(/^\d+\.\d+$/);
  });

  it("reports the file size", async () => {
    const input = await multiPagePdf();
    const info = await getInfo(input);
    expect(info.fileSize).toBe(input.byteLength);
  });

  it("flags encrypted=false on a fresh PDF", async () => {
    const input = await multiPagePdf();
    const info = await getInfo(input);
    expect(info.encrypted).toBe(false);
  });

  it("rejects clearly invalid input", async () => {
    const garbage = new TextEncoder().encode("not a pdf");
    await expect(getInfo(garbage)).rejects.toThrow();
  });
});
