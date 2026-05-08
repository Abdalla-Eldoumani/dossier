import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { flattenAnnotations } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
});

export function registerFlattenAnnotations(server: McpServer): void {
  server.registerTool(
    "flatten-annotations",
    {
      description: "Render text annotations and highlights into the page content stream, then drop them from the Annots array. Other annotation kinds (Link, etc.) are left in place.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await flattenAnnotations(parsed.pdf);
        return pdfResponse(result, result.meta.notes?.[0] ?? "Annotations flattened.");
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
