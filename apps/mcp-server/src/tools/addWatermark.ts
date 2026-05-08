import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { addWatermark } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const PositionSchema = z.enum([
  "top-left", "top-center", "top-right",
  "middle-left", "center", "middle-right",
  "bottom-left", "bottom-center", "bottom-right",
]);

const TextWatermark = z.object({
  kind: z.literal("text"),
  text: z.string().min(1),
  size: z.number().positive().optional(),
  opacity: z.number().min(0).max(1).optional(),
  rotation: z.number().optional(),
  position: PositionSchema.optional(),
  color: z
    .tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1)])
    .optional(),
});

const ImageWatermark = z.object({
  kind: z.literal("image"),
  image: z.string().describe("Base64-encoded PNG or JPEG bytes."),
  opacity: z.number().min(0).max(1).optional(),
  rotation: z.number().optional(),
  position: PositionSchema.optional(),
});

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  watermark: z.union([TextWatermark, ImageWatermark]),
});

export function registerAddWatermark(server: McpServer): void {
  server.registerTool(
    "add-watermark",
    {
      description: "Stamp every page with a text or image watermark.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const watermark =
          parsed.watermark.kind === "image"
            ? {
                ...parsed.watermark,
                image: Buffer.from(parsed.watermark.image, "base64"),
              }
            : parsed.watermark;
        const result = await addWatermark(parsed.pdf, watermark);
        return pdfResponse(result, "Watermark applied.");
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
