import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { linearizePdf, type PdfLinearizer } from "./linearizePdf.js";
import { UnsupportedFeatureError } from "../types/errors.js";

async function blankPdfBytes(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("linearizePdf", () => {
  it("delegates to the injected provider", async () => {
    const input = await blankPdfBytes();
    const calls: Uint8Array[] = [];
    const linearizer: PdfLinearizer = {
      async linearize(bytes) {
        calls.push(bytes);
        const out = new Uint8Array(bytes.byteLength + 1);
        out.set(bytes);
        return out;
      },
    };
    const out = await linearizePdf(input, linearizer);
    expect(calls).toHaveLength(1);
    expect(out.meta.operation).toBe("linearize");
    expect(out.bytes.byteLength).toBe(input.byteLength + 1);
  });

  it("throws UnsupportedFeatureError without a provider", async () => {
    const input = await blankPdfBytes();
    await expect(linearizePdf(input)).rejects.toThrow(UnsupportedFeatureError);
  });

  it("wraps provider errors as OPERATION_FAILED", async () => {
    const input = await blankPdfBytes();
    const linearizer: PdfLinearizer = {
      async linearize() {
        throw new Error("provider failed");
      },
    };
    await expect(linearizePdf(input, linearizer)).rejects.toThrow(/provider failed/);
  });

  it("notes when output size matches input", async () => {
    const input = await blankPdfBytes();
    const linearizer: PdfLinearizer = {
      async linearize(bytes) {
        return bytes;
      },
    };
    const out = await linearizePdf(input, linearizer);
    expect(out.meta.notes?.some((n) => /same size/.test(n))).toBe(true);
  });
});
