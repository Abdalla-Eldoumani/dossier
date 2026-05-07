import { describe, it, expect } from "vitest";
import { isPdf, assertPdf } from "./validatePdf.js";
import { InvalidPdfError } from "../types/errors.js";

describe("validatePdf", () => {
  it("accepts a minimal PDF header", () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\n...");
    expect(isPdf(bytes)).toBe(true);
  });

  it("accepts a PDF with leading whitespace before the header", () => {
    const bytes = new TextEncoder().encode("   \n%PDF-1.4\n...");
    expect(isPdf(bytes)).toBe(true);
  });

  it("rejects a clearly non-PDF byte string", () => {
    const bytes = new TextEncoder().encode("This is not a PDF.");
    expect(isPdf(bytes)).toBe(false);
  });

  it("rejects an empty buffer", () => {
    expect(isPdf(new Uint8Array(0))).toBe(false);
  });

  it("assertPdf throws InvalidPdfError on empty input", () => {
    expect(() => assertPdf(new Uint8Array(0))).toThrow(InvalidPdfError);
  });

  it("assertPdf throws InvalidPdfError on non-PDF input", () => {
    const bytes = new TextEncoder().encode("not a pdf");
    expect(() => assertPdf(bytes)).toThrow(InvalidPdfError);
  });
});
