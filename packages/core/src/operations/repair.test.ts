import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { repair, type PdfRepairer } from "./repair.js";

async function blankPdfBytes(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("repair", () => {
  it("re-saves a healthy PDF and reports the basic repair note", async () => {
    const input = await blankPdfBytes();
    const out = await repair(input);
    expect(out.meta.operation).toBe("repair");
    expect(out.meta.pageCount).toBe(1);
    expect(out.meta.notes?.[0]).toMatch(/pdf-lib parse \+ re-save/);
  });

  it("falls back to the injected repairer when pdf-lib cannot parse", async () => {
    const garbage = new TextEncoder().encode("definitely not a pdf");
    const calls: number[] = [];
    const repairer: PdfRepairer = {
      async repair(bytes) {
        calls.push(bytes.byteLength);
        // Pretend the provider produced a valid one-byte PDF.
        return new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
      },
    };
    const out = await repair(garbage, repairer);
    expect(calls).toHaveLength(1);
    expect(out.meta.notes?.[0]).toMatch(/recovered via injected PdfRepairer/);
  });

  it("throws CORRUPT_PDF when pdf-lib fails and no provider is supplied", async () => {
    const garbage = new TextEncoder().encode("definitely not a pdf");
    await expect(repair(garbage)).rejects.toMatchObject({ code: "CORRUPT_PDF" });
  });

  it("throws CORRUPT_PDF when both pdf-lib and the provider fail", async () => {
    const garbage = new TextEncoder().encode("definitely not a pdf");
    const repairer: PdfRepairer = {
      async repair() {
        throw new Error("provider also failed");
      },
    };
    await expect(repair(garbage, repairer)).rejects.toThrow(/provider also failed/);
  });
});
