// Encrypt a PDF with user/owner passwords and a permissions bitmap. pdf-lib
// (the version we're pinned to) reads encrypted PDFs but cannot write them,
// so the actual encryption work is delegated to an injected PdfSecurity
// provider — the web app and MCP server wire one up for their environment
// (qpdf-wasm in the browser, mupdf in Node, etc.).

import { z } from "zod";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { OperationError, UnsupportedFeatureError } from "../types/errors.js";
import { toBytes } from "../internal/loadPdf.js";

export const PdfPermissionsSchema = z.object({
  print: z.boolean().optional(),
  modify: z.boolean().optional(),
  copy: z.boolean().optional(),
  annotate: z.boolean().optional(),
  fillForms: z.boolean().optional(),
  extract: z.boolean().optional(),
  assemble: z.boolean().optional(),
  printHighRes: z.boolean().optional(),
});

export type PdfPermissions = z.infer<typeof PdfPermissionsSchema>;

export const EncryptOptionsSchema = z.object({
  userPassword: z.string().min(1),
  ownerPassword: z.string().optional(),
  permissions: PdfPermissionsSchema.optional(),
  algorithm: z.enum(["AES-128", "AES-256"]).optional(),
});

export type EncryptOptions = z.infer<typeof EncryptOptionsSchema>;

export interface PdfSecurity {
  encrypt(bytes: Uint8Array, options: EncryptOptions): Promise<Uint8Array>;
  decrypt(bytes: Uint8Array, password: string): Promise<Uint8Array>;
  setPermissions(
    bytes: Uint8Array,
    options: { ownerPassword: string; permissions: PdfPermissions },
  ): Promise<Uint8Array>;
}

export const EncryptPdfSchema = z.object({
  options: EncryptOptionsSchema,
});

export async function encryptPdf(
  input: PDFInput,
  options: EncryptOptions,
  security?: PdfSecurity,
): Promise<PDFOutput> {
  if (!options || !options.userPassword) {
    throw new OperationError(
      "INVALID_INPUT",
      "encryptPdf requires options.userPassword (a non-empty string).",
    );
  }
  if (!security || typeof security.encrypt !== "function") {
    throw new UnsupportedFeatureError(
      "encryptPdf requires a PdfSecurity provider. The web app and MCP server " +
        "should inject one (qpdf-wasm, mupdf, etc.); pdf-lib v1 cannot write encrypted PDFs.",
    );
  }

  const bytes = toBytes(input);
  let encrypted: Uint8Array;
  try {
    encrypted = await security.encrypt(bytes, {
      ...options,
      algorithm: options.algorithm ?? "AES-256",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new OperationError("OPERATION_FAILED", `Encryption failed: ${message}`);
  }

  return {
    bytes: encrypted,
    meta: {
      pageCount: 0,
      fileSize: encrypted.byteLength,
      operation: "encrypt",
      notes: [
        `Encrypted with ${options.algorithm ?? "AES-256"}; user password set${
          options.ownerPassword ? ", owner password set" : ""
        }.`,
      ],
    },
  };
}
