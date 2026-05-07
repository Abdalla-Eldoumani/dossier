import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { redactRegion } from "./redactRegion.js";
import { UnsupportedFeatureError } from "../types/errors.js";

async function blankPdfBytes(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("redactRegion", () => {
  it("throws UnsupportedFeatureError until content-stream sanitisation is wired up", async () => {
    const input = await blankPdfBytes(1);
    await expect(
      redactRegion(input, 0, { x: 0, y: 0, width: 100, height: 100 }),
    ).rejects.toThrow(UnsupportedFeatureError);
  });

  it("rejects out-of-bounds pageIndex before the unsupported-feature error", async () => {
    const input = await blankPdfBytes(2);
    await expect(
      redactRegion(input, 99, { x: 0, y: 0, width: 100, height: 100 }),
    ).rejects.toThrow(/out of bounds/i);
  });

  it("rejects an invalid region", async () => {
    const input = await blankPdfBytes(1);
    await expect(
      redactRegion(input, 0, { x: 0, y: 0, width: 0, height: 100 }),
    ).rejects.toThrow(/positive region/i);
  });
});
