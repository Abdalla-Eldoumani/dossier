import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { linearizePdf } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
});

export function registerLinearizePdf(server: McpServer): void {
  server.registerTool(
    "linearize-pdf",
    {
      description:
        "Rewrite the PDF for Fast Web View (linearised). Needs a PdfLinearizer provider (PDFium-WASM, mupdf) — pdf-lib v1 cannot rewrite the file structure on its own. Surfaces an unsupported-feature error without one.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await linearizePdf(parsed.pdf);
        return pdfResponse(result, "Linearised.");
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
