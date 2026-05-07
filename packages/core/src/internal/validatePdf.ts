// Magic-number sniff. Don't trust MIME types, file extensions, or user claims.
// Real PDF files start with %PDF- followed by a version (e.g. 1.7, 2.0).
// Some PDFs have leading whitespace or a UTF-8 BOM before the header — tolerate up to 1024 bytes of slack.

import { InvalidPdfError } from "../types/errors.js";

const MAX_HEADER_OFFSET = 1024;
const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"

export function isPdf(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_MAGIC.length) return false;
  const limit = Math.min(bytes.length - PDF_MAGIC.length, MAX_HEADER_OFFSET);
  for (let i = 0; i <= limit; i++) {
    let match = true;
    for (let j = 0; j < PDF_MAGIC.length; j++) {
      if (bytes[i + j] !== PDF_MAGIC[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

export function assertPdf(bytes: Uint8Array): void {
  if (bytes.length === 0) {
    throw new InvalidPdfError("The file is empty.");
  }
  if (!isPdf(bytes)) {
    throw new InvalidPdfError("The file does not begin with a PDF header.");
  }
}
