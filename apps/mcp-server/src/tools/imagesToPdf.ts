import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { imagesToPdf } from "@dossier/core";
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
  images: z
    .array(z.string())
    .min(1)
    .describe("Base64-encoded image bytes (PNG / JPEG / WebP). One image per page."),
  pageSize: SizeSchema.optional().describe("Output page size. Defaults to Letter."),
  fit: z.enum(["contain", "cover"]).optional().describe("How each image fills its page. Defaults to contain."),
});

export function registerImagesToPdf(server: McpServer): void {
  server.registerTool(
    "images-to-pdf",
    {
      description: "Build a PDF from a list of images. One image per page.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const imageBytes = parsed.images.map((b64) => new Uint8Array(Buffer.from(b64, "base64")));
        const result = await imagesToPdf(imageBytes, {
          pageSize: parsed.pageSize,
          fit: parsed.fit,
        });
        return pdfResponse(result, `Built a ${result.meta.pageCount}-page PDF from ${parsed.images.length} images.`);
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
