import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { reorderPages } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  newOrder: z
    .array(z.number().int().nonnegative())
    .min(1)
    .describe("Zero-based original page indices in the desired output order. Must include every page exactly once."),
});

export function registerReorderPages(server: McpServer): void {
  server.registerTool(
    "reorder-pages",
    {
      description: "Reorder pages. Pass an array of original page indices in the desired output order.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await reorderPages(parsed.pdf, parsed.newOrder);
        return pdfResponse(result, `Reordered ${parsed.newOrder.length} pages.`);
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
