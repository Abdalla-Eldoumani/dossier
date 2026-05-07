// Reference MCP tool implementation. Every other tool in this directory follows this shape:
//   1. Zod schema for the input
//   2. registerXxx function that takes the McpServer and calls server.registerTool
//   3. Tool handler validates, calls into @dossier/core, returns base64 + summary
//
// Errors from core are caught and re-thrown so the SDK formats them as JSON-RPC errors
// with the original code intact.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { mergePdfs, OperationError } from "@dossier/core";

const InputSchema = z.object({
  pdfs: z
    .array(z.string().describe("Base64-encoded PDF bytes."))
    .min(1, "Provide at least one PDF.")
    .describe("PDFs to merge, in the order they should appear in the output."),
});

export function registerMergePdfs(server: McpServer): void {
  server.registerTool(
    "merge-pdfs",
    {
      description:
        "Combine multiple PDFs into a single PDF. Pages appear in input order. Returns the merged PDF as base64.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await mergePdfs(parsed.pdfs);
        const base64 = Buffer.from(result.bytes).toString("base64");
        return {
          content: [
            {
              type: "text",
              text:
                `Merged ${parsed.pdfs.length} PDFs into a ${result.meta.pageCount}-page document ` +
                `(${result.meta.fileSize} bytes).`,
            },
            {
              type: "text",
              text: base64,
            },
          ],
          structuredContent: {
            pageCount: result.meta.pageCount,
            fileSize: result.meta.fileSize,
            base64,
          },
        };
      } catch (err) {
        if (err instanceof OperationError) {
          throw new Error(`${err.code}: ${err.message}`);
        }
        throw err;
      }
    },
  );
}
