// Diagnostic snapshot of a PDF: page count, per-page dimensions, version,
// encryption status, and file size. Loads with ignoreEncryption so encrypted
// PDFs still report their structure even without a password.

import { z } from "zod";
import type { PDFInput } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { loadPdf, toBytes } from "../internal/loadPdf.js";

export const GetInfoSchema = z.object({});

export interface PageInfo {
  width: number;
  height: number;
  rotation: number;
}

export interface PdfInfo {
  pageCount: number;
  pages: PageInfo[];
  pdfVersion: string;
  encrypted: boolean;
  fileSize: number;
}

function readPdfVersion(bytes: Uint8Array): string {
  const header = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(32, bytes.length)));
  const match = header.match(/%PDF-(\d+\.\d+)/);
  return match?.[1] ?? "unknown";
}

export async function getInfo(input: PDFInput): Promise<PdfInfo> {
  const bytes = toBytes(input);

  let doc;
  try {
    doc = await loadPdf(input, { ignoreEncryption: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new OperationError("INVALID_PDF", `Failed to parse PDF: ${message}`);
  }

  const encrypted = doc.context.trailerInfo.Encrypt !== undefined;

  const pages: PageInfo[] = doc.getPages().map((page) => {
    const { width, height } = page.getSize();
    const rotation = page.getRotation().angle;
    return { width, height, rotation };
  });

  return {
    pageCount: pages.length,
    pages,
    pdfVersion: readPdfVersion(bytes),
    encrypted,
    fileSize: bytes.byteLength,
  };
}
