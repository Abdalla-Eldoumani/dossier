// Serialises a pdf-lib PDFDocument to bytes, returning the canonical PDFOutput shape.
// useObjectStreams=true gives smaller output by default. Operations that need different settings
// (e.g. linearize) override.

import type { PDFDocument } from "pdf-lib";
import type { PDFOutput } from "../types/index.js";

export interface SaveOptions {
  useObjectStreams?: boolean;
  operation: string;
  notes?: string[];
}

export async function savePdf(doc: PDFDocument, options: SaveOptions): Promise<PDFOutput> {
  const bytes = await doc.save({ useObjectStreams: options.useObjectStreams ?? true });
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return {
    bytes: u8,
    meta: {
      pageCount: doc.getPageCount(),
      fileSize: u8.byteLength,
      operation: options.operation,
      notes: options.notes,
    },
  };
}
