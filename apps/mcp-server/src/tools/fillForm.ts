import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fillForm } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  values: z
    .record(z.string(), z.union([z.string(), z.boolean()]))
    .describe("Field-name → value map. Strings for text/dropdown/radio, booleans for checkboxes."),
});

export function registerFillForm(server: McpServer): void {
  server.registerTool(
    "fill-form",
    {
      description: "Fill AcroForm fields by name. Unknown field names throw INVALID_INPUT — call get-form-fields first to see the field map.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await fillForm(parsed.pdf, parsed.values);
        return pdfResponse(result, `Filled ${Object.keys(parsed.values).length} field${Object.keys(parsed.values).length === 1 ? "" : "s"}.`);
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
