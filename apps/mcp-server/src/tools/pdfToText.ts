import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { pdfToText } from "@dossier/core";
import { jsonResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  layoutPreserve: z.boolean().optional().describe("Best-effort attempt to preserve column layout."),
  pages: z
    .array(z.number().int().nonnegative())
    .optional()
    .describe("Zero-based page indices. Omit for every page."),
});

export function registerPdfToText(server: McpServer): void {
  server.registerTool(
    "pdf-to-text",
    {
      description: "Extract text from a PDF using pdfjs-dist. Returns the joined string and per-page strings.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await pdfToText(parsed.pdf, parsed);
        return jsonResponse(result, `Extracted ${result.pages.length} pages of text.`);
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
