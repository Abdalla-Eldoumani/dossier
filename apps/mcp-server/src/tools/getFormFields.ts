import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getFormFields } from "@dossier/core";
import { jsonResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
});

export function registerGetFormFields(server: McpServer): void {
  server.registerTool(
    "get-form-fields",
    {
      description: "Read the AcroForm field map: name, type, current value, options, read-only flag.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const fields = await getFormFields(parsed.pdf);
        return jsonResponse(fields, `Found ${fields.length} field${fields.length === 1 ? "" : "s"}.`);
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
