import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OperationError } from "@dossier/core";
import { rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  format: z.enum(["png", "jpeg", "webp"]).default("png"),
  dpi: z.number().int().positive().default(150),
  pages: z.array(z.number().int().nonnegative()).optional(),
});

export function registerPdfToImages(server: McpServer): void {
  server.registerTool(
    "pdf-to-images",
    {
      description:
        "Rasterise pages to PNG/JPEG/WebP. Requires a server-side PageRenderer (sharp + pdfjs-dist or @napi-rs/canvas) to be wired up — until then the tool surfaces an unsupported-feature error.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        InputSchema.parse(input);
        // The renderer slot is environment-specific. Without a Node-side provider wired
        // into this server build, surface the same UNSUPPORTED_FEATURE error the core
        // operation would throw if invoked directly.
        throw new OperationError(
          "UNSUPPORTED_FEATURE",
          "pdf-to-images needs a Node-side PageRenderer. Wire one in (e.g. sharp + pdfjs-dist) before invoking this tool.",
        );
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
