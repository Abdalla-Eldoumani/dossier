import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { downsampleImages } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  targetDpi: z
    .number()
    .int()
    .positive()
    .describe("Target DPI for embedded raster images. 150 is good for proofs, 300 for print."),
});

export function registerDownsampleImages(server: McpServer): void {
  server.registerTool(
    "downsample-images",
    {
      description:
        "Reduce embedded raster image resolution. Needs an ImageDownsampler provider (sharp on Node) wired in to actually re-encode bytes. Without one, surfaces an unsupported-feature error.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await downsampleImages(parsed.pdf, parsed.targetDpi);
        return pdfResponse(result, result.meta.notes?.[0] ?? "Images downsampled.");
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
