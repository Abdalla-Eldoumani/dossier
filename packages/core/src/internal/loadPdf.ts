// Loads any supported PDFInput shape into a pdf-lib PDFDocument.
// Detects encryption and surfaces it as a typed error so callers can prompt for a password.

import { PDFDocument } from "pdf-lib";
import type { PDFInput } from "../types/index.js";
import {
  CorruptPdfError,
  InvalidPdfError,
  PasswordRequiredError,
  InvalidPasswordError,
} from "../types/errors.js";
import { assertPdf } from "./validatePdf.js";

export function toBytes(input: PDFInput): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (typeof input === "string") {
    // Treat as base64. Reject anything that's clearly not.
    const trimmed = input.trim();
    try {
      // atob is available in Node >= 16 and all modern browsers.
      const binary = atob(trimmed);
      const out = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
      return out;
    } catch {
      throw new InvalidPdfError("String input is not valid base64.");
    }
  }
  throw new InvalidPdfError("Unsupported input type.");
}

export interface LoadOptions {
  password?: string;
  // ignoreEncryption: only used when the caller explicitly wants to bypass owner-password restrictions
  // and the user has confirmed. Don't set this without an explicit user-facing confirmation upstream.
  ignoreEncryption?: boolean;
}

export async function loadPdf(input: PDFInput, options: LoadOptions = {}): Promise<PDFDocument> {
  const bytes = toBytes(input);
  assertPdf(bytes);

  try {
    return await PDFDocument.load(bytes, {
      ignoreEncryption: options.ignoreEncryption ?? false,
      // pdf-lib's password handling is limited; for full encryption support callers may need
      // to fall back to PDFium for decryption first. Document this in EDGE_CASES.
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/encrypt/i.test(msg)) {
      if (options.password !== undefined) {
        throw new InvalidPasswordError();
      }
      throw new PasswordRequiredError();
    }
    throw new CorruptPdfError("Failed to parse PDF.", msg);
  }
}
