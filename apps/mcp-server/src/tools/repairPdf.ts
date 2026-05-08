import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { repair } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded (possibly corrupt) PDF bytes."),
});

export function registerRepairPdf(server: McpServer): void {
  server.registerTool(
    "repair-pdf",
    {
      description:
        "Best-effort repair. Stage 1: pdf-lib's lenient parse + re-save with object streams (fixes broken xref tables and dangling objects). Stage 2: optional PdfRepairer provider for deeper recovery — without one, files pdf-lib can't parse surface as CORRUPT_PDF.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await repair(parsed.pdf);
        return pdfResponse(result, result.meta.notes?.[0] ?? "Repair complete.");
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
