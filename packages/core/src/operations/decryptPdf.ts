// Remove encryption from a PDF given the password. Delegates to the same
// PdfSecurity provider that encryptPdf uses; pdf-lib v1 cannot strip
// encryption on its own.

import { z } from "zod";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { OperationError, UnsupportedFeatureError } from "../types/errors.js";
import { toBytes } from "../internal/loadPdf.js";
import type { PdfSecurity } from "./encryptPdf.js";

export const DecryptPdfSchema = z.object({
  password: z.string().min(1),
});

export async function decryptPdf(
  input: PDFInput,
  password: string,
  security?: PdfSecurity,
): Promise<PDFOutput> {
  if (typeof password !== "string" || password.length === 0) {
    throw new OperationError(
      "INVALID_INPUT",
      "decryptPdf requires a non-empty password.",
    );
  }
  if (!security || typeof security.decrypt !== "function") {
    throw new UnsupportedFeatureError(
      "decryptPdf requires a PdfSecurity provider. The web app and MCP server " +
        "should inject one (qpdf-wasm, mupdf, etc.); pdf-lib v1 cannot rewrite encrypted PDFs.",
    );
  }

  const bytes = toBytes(input);
  let decrypted: Uint8Array;
  try {
    decrypted = await security.decrypt(bytes, password);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/password|invalid/i.test(message)) {
      throw new OperationError("INVALID_PASSWORD", "The password is incorrect.");
    }
    throw new OperationError("OPERATION_FAILED", `Decryption failed: ${message}`);
  }

  return {
    bytes: decrypted,
    meta: {
      pageCount: 0,
      fileSize: decrypted.byteLength,
      operation: "decrypt",
      notes: ["Encryption removed; the output PDF is unencrypted."],
    },
  };
}
