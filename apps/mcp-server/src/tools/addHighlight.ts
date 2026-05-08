import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { addHighlight } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  pageIndex: z.number().int().nonnegative(),
  region: z.object({
    x: z.number().nonnegative(),
    y: z.number().nonnegative(),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  options: z
    .object({
      color: z
        .tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1)])
        .optional(),
      author: z.string().optional(),
      contents: z.string().optional(),
    })
    .optional(),
});

export function registerAddHighlight(server: McpServer): void {
  server.registerTool(
    "add-highlight",
    {
      description: "Add a highlight annotation over a rectangular region.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await addHighlight(
          parsed.pdf,
          parsed.pageIndex,
          parsed.region,
          parsed.options ?? {},
        );
        return pdfResponse(result, `Highlight added to page ${parsed.pageIndex + 1}.`);
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
