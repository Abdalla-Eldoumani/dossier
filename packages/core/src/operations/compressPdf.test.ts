import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { compressPdf } from "./compressPdf.js";

async function blankPdfBytes(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("compressPdf", () => {
  it("returns a PDFOutput tagged with the compress operation", async () => {
    const input = await blankPdfBytes(3);
    const out = await compressPdf(input);
    expect(out.meta.operation).toBe("compress");
    expect(out.meta.pageCount).toBe(3);
    expect(out.bytes.length).toBeGreaterThan(0);
  });

  it("always attaches notes describing the implementation scope", async () => {
    const input = await blankPdfBytes(1);
    const out = await compressPdf(input);
    expect(out.meta.notes).toBeDefined();
    expect(out.meta.notes!.length).toBeGreaterThan(0);
  });

  it("accepts low, medium, and high levels", async () => {
    const input = await blankPdfBytes(2);
    for (const level of ["low", "medium", "high"] as const) {
      const out = await compressPdf(input, level);
      expect(out.meta.operation).toBe("compress");
    }
  });

  it("returns the input unchanged when the output would not be smaller", async () => {
    // A blank pdf-lib doc round-trips to roughly the same size, so the guard fires.
    const input = await blankPdfBytes(1);
    const out = await compressPdf(input);
    if (out.bytes.byteLength === input.byteLength) {
      expect(out.meta.notes?.some((n) => /already optimised/i.test(n))).toBe(true);
    } else {
      expect(out.bytes.byteLength).toBeLessThan(input.byteLength);
    }
  });
});
