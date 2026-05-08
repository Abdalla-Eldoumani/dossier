import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { cropPages } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  indices: z.array(z.number().int().nonnegative()).min(1).describe("Pages to crop."),
  region: z.object({
    x: z.number().nonnegative().describe("Region origin x in PDF points (top-left origin)."),
    y: z.number().nonnegative().describe("Region origin y in PDF points (top-left origin)."),
    width: z.number().positive().describe("Region width in PDF points."),
    height: z.number().positive().describe("Region height in PDF points."),
  }),
});

export function registerCropPages(server: McpServer): void {
  server.registerTool(
    "crop-pages",
    {
      description: "Crop selected pages to a rectangular region. Coordinates use PDF points and a top-left origin.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await cropPages(parsed.pdf, parsed.indices, parsed.region);
        return pdfResponse(result, `Cropped ${parsed.indices.length} pages.`);
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
