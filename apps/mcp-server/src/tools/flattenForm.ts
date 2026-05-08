import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { flattenForm } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
});

export function registerFlattenForm(server: McpServer): void {
  server.registerTool(
    "flatten-form",
    {
      description: "Bake interactive form fields into the page content so the values can no longer be edited.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await flattenForm(parsed.pdf);
        return pdfResponse(result, result.meta.notes?.[0] ?? "Form flattened.");
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
