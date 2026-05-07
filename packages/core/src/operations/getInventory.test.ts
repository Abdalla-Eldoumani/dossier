import { describe, it, expect } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { getInventory } from "./getInventory.js";

const PNG_1X1_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const png1x1 = Uint8Array.from(atob(PNG_1X1_BASE64), (c) => c.charCodeAt(0));

async function blankPdfBytes(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

async function pdfWithFontAndImage(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const png = await doc.embedPng(png1x1);
  const page = doc.addPage([612, 792]);
  page.drawText("Hello", { x: 100, y: 700, font, size: 12 });
  page.drawImage(png, { x: 100, y: 100, width: 50, height: 50 });
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("getInventory", () => {
  it("reports an empty inventory for a blank PDF", async () => {
    const input = await blankPdfBytes();
    const out = await getInventory(input);
    expect(out.fonts).toEqual([]);
    expect(out.images).toEqual([]);
    expect(out.javascript).toBe(false);
    expect(out.attachments).toBe(false);
  });

  it("reports embedded fonts and images", async () => {
    const input = await pdfWithFontAndImage();
    const out = await getInventory(input);
    expect(out.fonts.length).toBeGreaterThan(0);
    expect(out.fonts[0]?.baseFont).toContain("Helvetica");
    expect(out.images.length).toBeGreaterThan(0);
    expect(out.images[0]?.width).toBeGreaterThan(0);
  });

  it("flags javascript=false and attachments=false on a plain PDF", async () => {
    const input = await pdfWithFontAndImage();
    const out = await getInventory(input);
    expect(out.javascript).toBe(false);
    expect(out.attachments).toBe(false);
  });

  it("rejects clearly invalid input", async () => {
    const garbage = new TextEncoder().encode("not a pdf");
    await expect(getInventory(garbage)).rejects.toThrow();
  });
});
