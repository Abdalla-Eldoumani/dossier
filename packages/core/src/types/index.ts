// Shared types used across every operation.
// The web app and the MCP server both consume these.

export type PDFInput = Uint8Array | ArrayBuffer | string;
// string inputs are treated as base64-encoded PDF bytes.
// All operations normalise to Uint8Array internally via internal/loadPdf.

export interface PDFOutput {
  bytes: Uint8Array;
  meta: {
    pageCount: number;
    fileSize: number; // bytes.length, surfaced for convenience
    operation: string; // e.g. "merge", "compress"
    notes?: string[]; // soft warnings, e.g. "Already optimised — no compression applied"
  };
}

export interface PageRegion {
  // Coordinates in PDF points. Origin is top-left of the page (we flip from PDF's bottom-left convention).
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PageSize =
  | { name: "A4" }
  | { name: "A3" }
  | { name: "A5" }
  | { name: "Letter" }
  | { name: "Legal" }
  | { name: "Tabloid" }
  | { custom: { width: number; height: number } }; // points
