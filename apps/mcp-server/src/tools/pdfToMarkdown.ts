import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { pdfToMarkdown } from "@dossier/core";
import { jsonResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
});

export function registerPdfToMarkdown(server: McpServer): void {
  server.registerTool(
    "pdf-to-markdown",
    {
      description:
        "Best-effort PDF-to-Markdown conversion. Heading inference uses font-size heuristics; lists, tables, and links aren’t reconstructed (that needs Tagged PDF).",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await pdfToMarkdown(parsed.pdf, {});
        return jsonResponse(result, "Markdown ready.");
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
