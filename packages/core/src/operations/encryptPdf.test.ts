import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { encryptPdf, type PdfSecurity } from "./encryptPdf.js";
import { UnsupportedFeatureError } from "../types/errors.js";

async function blankPdfBytes(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

function fakeSecurity(): { calls: Array<{ method: string; args: unknown }>; security: PdfSecurity } {
  const calls: Array<{ method: string; args: unknown }> = [];
  const security: PdfSecurity = {
    async encrypt(bytes, options) {
      calls.push({ method: "encrypt", args: options });
      const out = new Uint8Array(bytes.byteLength + 4);
      out.set(bytes);
      out.set([0xde, 0xad, 0xbe, 0xef], bytes.byteLength);
      return out;
    },
    async decrypt(bytes) {
      calls.push({ method: "decrypt", args: undefined });
      return bytes.subarray(0, bytes.byteLength - 4);
    },
    async setPermissions(bytes, options) {
      calls.push({ method: "setPermissions", args: options });
      return bytes;
    },
  };
  return { calls, security };
}

describe("encryptPdf", () => {
  it("delegates to the injected PdfSecurity provider", async () => {
    const input = await blankPdfBytes();
    const { calls, security } = fakeSecurity();
    const out = await encryptPdf(
      input,
      { userPassword: "open-sesame", permissions: { print: true } },
      security,
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]!.method).toBe("encrypt");
    expect(out.meta.operation).toBe("encrypt");
    expect(out.bytes.byteLength).toBe(input.byteLength + 4);
  });

  it("defaults the algorithm to AES-256 when not specified", async () => {
    const input = await blankPdfBytes();
    const { calls, security } = fakeSecurity();
    await encryptPdf(input, { userPassword: "x" }, security);
    expect((calls[0]!.args as { algorithm: string }).algorithm).toBe("AES-256");
  });

  it("respects an explicit algorithm choice", async () => {
    const input = await blankPdfBytes();
    const { calls, security } = fakeSecurity();
    await encryptPdf(input, { userPassword: "x", algorithm: "AES-128" }, security);
    expect((calls[0]!.args as { algorithm: string }).algorithm).toBe("AES-128");
  });

  it("throws UnsupportedFeatureError when no provider is supplied", async () => {
    const input = await blankPdfBytes();
    await expect(
      encryptPdf(input, { userPassword: "x" }),
    ).rejects.toThrow(UnsupportedFeatureError);
  });

  it("rejects an empty user password", async () => {
    const input = await blankPdfBytes();
    const { security } = fakeSecurity();
    await expect(
      encryptPdf(input, { userPassword: "" }, security),
    ).rejects.toThrow(/userPassword/);
  });

  it("wraps provider errors as OPERATION_FAILED", async () => {
    const input = await blankPdfBytes();
    const security: PdfSecurity = {
      async encrypt() {
        throw new Error("provider exploded");
      },
      async decrypt(b) {
        return b;
      },
      async setPermissions(b) {
        return b;
      },
    };
    await expect(
      encryptPdf(input, { userPassword: "x" }, security),
    ).rejects.toThrow(/provider exploded/);
  });
});
