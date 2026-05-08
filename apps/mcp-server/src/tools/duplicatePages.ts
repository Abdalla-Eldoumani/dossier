import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { duplicatePages } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  indices: z
    .array(z.number().int().nonnegative())
    .min(1)
    .describe("Zero-based page indices to duplicate. Each duplicate is inserted right after its original."),
});

export function registerDuplicatePages(server: McpServer): void {
  server.registerTool(
    "duplicate-pages",
    {
      description: "Duplicate the listed pages. Each duplicate is inserted immediately after its original.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await duplicatePages(parsed.pdf, parsed.indices);
        return pdfResponse(result, `Duplicated ${parsed.indices.length} pages.`);
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
