import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { rotatePages } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  indices: z
    .array(z.number().int().nonnegative())
    .min(1)
    .describe("Zero-based page indices to rotate."),
  degrees: z
    .union([
      z.literal(90),
      z.literal(180),
      z.literal(270),
      z.literal(-90),
      z.literal(-180),
      z.literal(-270),
    ])
    .describe("Rotation amount in degrees. Positive is clockwise."),
});

export function registerRotatePages(server: McpServer): void {
  server.registerTool(
    "rotate-pages",
    {
      description: "Rotate selected pages in 90-degree increments.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await rotatePages(parsed.pdf, parsed.indices, parsed.degrees);
        return pdfResponse(result, `Rotated ${parsed.indices.length} pages by ${parsed.degrees}°.`);
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
