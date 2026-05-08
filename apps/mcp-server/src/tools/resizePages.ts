import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resizePages } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const SizeSchema = z.union([
  z.object({ name: z.enum(["A4", "A3", "A5", "Letter", "Legal", "Tabloid"]) }),
  z.object({
    custom: z.object({
      width: z.number().positive(),
      height: z.number().positive(),
    }),
  }),
]);

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  indices: z.array(z.number().int().nonnegative()).min(1).describe("Pages to resize."),
  size: SizeSchema.describe("New page size — named preset or custom width/height in points."),
  scaleContent: z
    .boolean()
    .default(true)
    .describe("When true, scales existing page content to fit the new dimensions."),
});

export function registerResizePages(server: McpServer): void {
  server.registerTool(
    "resize-pages",
    {
      description: "Resize selected pages to a new size. Optionally scales the existing content to fit.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await resizePages(
          parsed.pdf,
          parsed.indices,
          parsed.size,
          parsed.scaleContent,
        );
        return pdfResponse(result, `Resized ${parsed.indices.length} pages.`);
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
