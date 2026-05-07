import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { decryptPdf } from "./decryptPdf.js";
import { type PdfSecurity } from "./encryptPdf.js";
import { UnsupportedFeatureError } from "../types/errors.js";

async function blankPdfBytes(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

const passthrough: PdfSecurity = {
  async encrypt(b) {
    return b;
  },
  async decrypt(bytes, password) {
    if (password !== "open-sesame") {
      throw new Error("invalid password");
    }
    return bytes;
  },
  async setPermissions(b) {
    return b;
  },
};

describe("decryptPdf", () => {
  it("delegates to the security provider with the given password", async () => {
    const input = await blankPdfBytes();
    const out = await decryptPdf(input, "open-sesame", passthrough);
    expect(out.meta.operation).toBe("decrypt");
    expect(out.bytes).toEqual(input);
  });

  it("maps password errors to INVALID_PASSWORD", async () => {
    const input = await blankPdfBytes();
    await expect(decryptPdf(input, "wrong", passthrough)).rejects.toMatchObject({
      code: "INVALID_PASSWORD",
    });
  });

  it("throws UnsupportedFeatureError when no provider is supplied", async () => {
    const input = await blankPdfBytes();
    await expect(decryptPdf(input, "x")).rejects.toThrow(UnsupportedFeatureError);
  });

  it("rejects an empty password", async () => {
    const input = await blankPdfBytes();
    await expect(decryptPdf(input, "", passthrough)).rejects.toThrow(/non-empty password/);
  });
});
