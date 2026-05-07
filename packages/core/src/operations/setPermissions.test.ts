import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { setPermissions } from "./setPermissions.js";
import { type PdfSecurity } from "./encryptPdf.js";
import { UnsupportedFeatureError } from "../types/errors.js";

async function blankPdfBytes(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

function fakeSecurity(): {
  calls: Array<{ ownerPassword: string; permissions: unknown }>;
  security: PdfSecurity;
} {
  const calls: Array<{ ownerPassword: string; permissions: unknown }> = [];
  return {
    calls,
    security: {
      async encrypt(b) {
        return b;
      },
      async decrypt(b) {
        return b;
      },
      async setPermissions(bytes, options) {
        calls.push(options);
        return bytes;
      },
    },
  };
}

describe("setPermissions", () => {
  it("delegates to the security provider with the owner password and permissions", async () => {
    const input = await blankPdfBytes();
    const { calls, security } = fakeSecurity();
    const out = await setPermissions(
      input,
      {
        ownerPassword: "owner",
        permissions: { print: true, copy: false, modify: false },
      },
      security,
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]!.ownerPassword).toBe("owner");
    expect((calls[0]!.permissions as { print: boolean }).print).toBe(true);
    expect(out.meta.operation).toBe("set-permissions");
  });

  it("throws UnsupportedFeatureError without a provider", async () => {
    const input = await blankPdfBytes();
    await expect(
      setPermissions(input, {
        ownerPassword: "owner",
        permissions: { print: true },
      }),
    ).rejects.toThrow(UnsupportedFeatureError);
  });

  it("rejects an empty owner password", async () => {
    const input = await blankPdfBytes();
    const { security } = fakeSecurity();
    await expect(
      setPermissions(
        input,
        { ownerPassword: "", permissions: { print: true } },
        security,
      ),
    ).rejects.toThrow(/ownerPassword/);
  });

  it("maps password errors from the provider to INVALID_PASSWORD", async () => {
    const input = await blankPdfBytes();
    const security: PdfSecurity = {
      async encrypt(b) {
        return b;
      },
      async decrypt(b) {
        return b;
      },
      async setPermissions() {
        throw new Error("invalid owner password");
      },
    };
    await expect(
      setPermissions(
        input,
        { ownerPassword: "wrong", permissions: { print: true } },
        security,
      ),
    ).rejects.toMatchObject({ code: "INVALID_PASSWORD" });
  });
});
