import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { insertPagesFromPdf } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  target: z.string().describe("Base64-encoded target PDF (the one being modified)."),
  source: z.string().describe("Base64-encoded source PDF (the one whose pages are inserted)."),
  atIndex: z
    .number()
    .int()
    .nonnegative()
    .describe("Zero-based insertion point in the target."),
  sourceIndices: z
    .array(z.number().int().nonnegative())
    .optional()
    .describe("Optional zero-based source page indices. Omit to insert every page in source order."),
});

export function registerInsertPagesFromPdf(server: McpServer): void {
  server.registerTool(
    "insert-pages-from-pdf",
    {
      description: "Insert pages from a source PDF into a target PDF at the given index.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await insertPagesFromPdf(
          parsed.target,
          parsed.source,
          parsed.atIndex,
          parsed.sourceIndices,
        );
        return pdfResponse(result, `Inserted ${parsed.sourceIndices?.length ?? "all"} source pages at index ${parsed.atIndex}.`);
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
