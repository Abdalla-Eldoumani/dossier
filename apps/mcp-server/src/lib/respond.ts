// Shared response helpers for MCP tool handlers. Each tool registers its own Zod
// schema and calls into @dossier/core; these helpers wrap the success and error
// paths so the per-tool file stays focused on the inputs it accepts.

import type { PDFOutput } from "@dossier/core";
import { OperationError } from "@dossier/core";

interface McpToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
}

export function pdfResponse(result: PDFOutput, summary: string): McpToolResult {
  const base64 = Buffer.from(result.bytes).toString("base64");
  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: base64 },
    ],
    structuredContent: {
      pageCount: result.meta.pageCount,
      fileSize: result.meta.fileSize,
      operation: result.meta.operation,
      notes: result.meta.notes,
      base64,
    },
  };
}

export function multiPdfResponse(parts: Uint8Array[], summary: string): McpToolResult {
  const base64s = parts.map((p) => Buffer.from(p).toString("base64"));
  return {
    content: [
      { type: "text", text: summary },
      ...base64s.map((b64) => ({ type: "text" as const, text: b64 })),
    ],
    structuredContent: {
      count: parts.length,
      base64s,
    },
  };
}

export function jsonResponse<T>(data: T, summary: string): McpToolResult {
  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(data, null, 2) },
    ],
    structuredContent: { data: data as unknown } as Record<string, unknown>,
  };
}

export function rethrow(err: unknown): never {
  if (err instanceof OperationError) {
    throw new Error(`${err.code}: ${err.message}`);
  }
  throw err;
}
