import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { decryptPdf } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded encrypted PDF."),
  password: z.string().min(1),
});

export function registerDecryptPdf(server: McpServer): void {
  server.registerTool(
    "decrypt-pdf",
    {
      description:
        "Decrypt a PDF with the supplied password. Same PdfSecurity provider story as encrypt-pdf — surfaces an unsupported-feature error without one. Wrong-password errors come back as INVALID_PASSWORD.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await decryptPdf(parsed.pdf, parsed.password);
        return pdfResponse(result, "Decrypted.");
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
