import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { subsetFonts, type FontSubsetter } from "./subsetFonts.js";
import { UnsupportedFeatureError } from "../types/errors.js";

async function blankPdfBytes(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("subsetFonts", () => {
  it("delegates to the injected provider and reports stats", async () => {
    const input = await blankPdfBytes();
    const subsetter: FontSubsetter = {
      async subset(bytes) {
        const out = bytes.subarray(0, Math.max(1, bytes.byteLength - 50));
        return {
          bytes: out,
          report: { fontsScanned: 3, fontsSubsetted: 2, bytesSaved: 50 },
        };
      },
    };
    const out = await subsetFonts(input, subsetter);
    expect(out.meta.operation).toBe("subset-fonts");
    expect(out.meta.notes?.[0]).toMatch(/Scanned 3 font\(s\); subsetted 2; saved 50/);
  });

  it("throws UnsupportedFeatureError without a provider", async () => {
    const input = await blankPdfBytes();
    await expect(subsetFonts(input)).rejects.toThrow(UnsupportedFeatureError);
  });

  it("falls back to byte-difference when the provider omits a report", async () => {
    const input = await blankPdfBytes();
    const subsetter: FontSubsetter = {
      async subset(bytes) {
        return { bytes: bytes.subarray(0, bytes.byteLength - 10) };
      },
    };
    const out = await subsetFonts(input, subsetter);
    expect(out.meta.notes?.[0]).toMatch(/saved 10 bytes/);
  });

  it("wraps provider errors as OPERATION_FAILED", async () => {
    const input = await blankPdfBytes();
    const subsetter: FontSubsetter = {
      async subset() {
        throw new Error("font tables corrupt");
      },
    };
    await expect(subsetFonts(input, subsetter)).rejects.toThrow(/font tables corrupt/);
  });
});
