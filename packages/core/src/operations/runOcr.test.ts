import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { runOcr, type OcrEngine, type OcrResult } from "./runOcr.js";
import { UnsupportedFeatureError } from "../types/errors.js";

async function blankPdfBytes(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

function fakeEngine(result: OcrResult): {
  calls: Array<{ pageIndices?: number[]; languages: string[]; addTextLayer: boolean }>;
  engine: OcrEngine;
} {
  const calls: Array<{ pageIndices?: number[]; languages: string[]; addTextLayer: boolean }> = [];
  return {
    calls,
    engine: {
      async recognize({ pageIndices, languages, addTextLayer }) {
        calls.push({ pageIndices, languages, addTextLayer });
        return result;
      },
    },
  };
}

describe("runOcr", () => {
  it("delegates to the OCR engine and returns its result", async () => {
    const input = await blankPdfBytes();
    const { calls, engine } = fakeEngine({
      pages: [{ pageIndex: 0, text: "Hello world" }],
    });
    const out = await runOcr(input, {}, engine);
    expect(calls).toHaveLength(1);
    expect(out.pages[0]?.text).toBe("Hello world");
  });

  it("defaults the language to eng", async () => {
    const input = await blankPdfBytes();
    const { calls, engine } = fakeEngine({ pages: [] });
    await runOcr(input, {}, engine);
    expect(calls[0]!.languages).toEqual(["eng"]);
  });

  it("forwards pages and addTextLayer", async () => {
    const input = await blankPdfBytes();
    const { calls, engine } = fakeEngine({
      pages: [],
      pdfBytes: new Uint8Array([1, 2, 3]),
    });
    const out = await runOcr(
      input,
      { pages: [0, 2], addTextLayer: true, languages: ["eng", "deu"] },
      engine,
    );
    expect(calls[0]!.pageIndices).toEqual([0, 2]);
    expect(calls[0]!.addTextLayer).toBe(true);
    expect(calls[0]!.languages).toEqual(["eng", "deu"]);
    expect(out.pdfBytes).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("throws UnsupportedFeatureError without an engine", async () => {
    const input = await blankPdfBytes();
    await expect(runOcr(input)).rejects.toThrow(UnsupportedFeatureError);
  });

  it("wraps engine errors as OPERATION_FAILED", async () => {
    const input = await blankPdfBytes();
    const engine: OcrEngine = {
      async recognize() {
        throw new Error("tesseract crashed");
      },
    };
    await expect(runOcr(input, {}, engine)).rejects.toThrow(/tesseract crashed/);
  });
});
