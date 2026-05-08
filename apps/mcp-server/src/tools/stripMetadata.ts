import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { stripMetadata } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
});

export function registerStripMetadata(server: McpServer): void {
  server.registerTool(
    "strip-metadata",
    {
      description: "Clear the document Info dict (Title/Author/Subject/Keywords/Creator/Producer) and remove the catalog's XMP stream. pdf-lib re-emits its own Producer string on save (library identification, not user data).",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await stripMetadata(parsed.pdf);
        return pdfResponse(result, result.meta.notes?.[0] ?? "Metadata cleared.");
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
