import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { deletePages } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  indices: z
    .array(z.number().int().nonnegative())
    .min(1)
    .describe("Zero-based page indices to remove."),
});

export function registerDeletePages(server: McpServer): void {
  server.registerTool(
    "delete-pages",
    {
      description:
        "Delete the listed pages. Throws when the deletion would leave zero pages — use 'split-pdf' or 'extract-pages' for that scenario.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await deletePages(parsed.pdf, parsed.indices);
        return pdfResponse(result, `Removed ${parsed.indices.length} pages.`);
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
