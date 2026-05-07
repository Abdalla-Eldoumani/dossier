// Update permission flags on an encrypted PDF without changing passwords.
// Requires the owner password and the same PdfSecurity provider as the
// encrypt/decrypt operations — pdf-lib v1 cannot rewrite permissions.

import { z } from "zod";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { OperationError, UnsupportedFeatureError } from "../types/errors.js";
import { toBytes } from "../internal/loadPdf.js";
import { PdfPermissionsSchema, type PdfPermissions, type PdfSecurity } from "./encryptPdf.js";

export const SetPermissionsOptionsSchema = z.object({
  ownerPassword: z.string().min(1),
  permissions: PdfPermissionsSchema,
});

export type SetPermissionsOptions = z.infer<typeof SetPermissionsOptionsSchema>;

export const SetPermissionsSchema = SetPermissionsOptionsSchema;

export async function setPermissions(
  input: PDFInput,
  options: SetPermissionsOptions,
  security?: PdfSecurity,
): Promise<PDFOutput> {
  if (!options || !options.ownerPassword) {
    throw new OperationError(
      "INVALID_INPUT",
      "setPermissions requires options.ownerPassword.",
    );
  }
  if (!options.permissions || typeof options.permissions !== "object") {
    throw new OperationError(
      "INVALID_INPUT",
      "setPermissions requires options.permissions.",
    );
  }
  if (!security || typeof security.setPermissions !== "function") {
    throw new UnsupportedFeatureError(
      "setPermissions requires a PdfSecurity provider. The web app and MCP server " +
        "should inject one (qpdf-wasm, mupdf, etc.); pdf-lib v1 cannot rewrite permission flags.",
    );
  }

  const bytes = toBytes(input);
  let result: Uint8Array;
  try {
    result = await security.setPermissions(bytes, {
      ownerPassword: options.ownerPassword,
      permissions: options.permissions as PdfPermissions,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/password|invalid/i.test(message)) {
      throw new OperationError(
        "INVALID_PASSWORD",
        "The owner password is incorrect.",
      );
    }
    throw new OperationError(
      "OPERATION_FAILED",
      `Permission update failed: ${message}`,
    );
  }

  return {
    bytes: result,
    meta: {
      pageCount: 0,
      fileSize: result.byteLength,
      operation: "set-permissions",
      notes: ["Permission flags updated; passwords unchanged."],
    },
  };
}
