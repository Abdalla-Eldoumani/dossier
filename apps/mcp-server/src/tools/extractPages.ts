import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { extractPages } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  indices: z
    .array(z.number().int().nonnegative())
    .min(1)
    .describe("Zero-based page indices to keep, in the order they should appear."),
});

export function registerExtractPages(server: McpServer): void {
  server.registerTool(
    "extract-pages",
    {
      description: "Extract a subset of pages into a new PDF. Pages appear in the order of the indices array.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await extractPages(parsed.pdf, parsed.indices);
        return pdfResponse(result, `Extracted ${parsed.indices.length} pages.`);
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
