import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { encryptPdf } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const PermissionsSchema = z.object({
  print: z.boolean().optional(),
  modify: z.boolean().optional(),
  copy: z.boolean().optional(),
  annotate: z.boolean().optional(),
  fillForms: z.boolean().optional(),
  extract: z.boolean().optional(),
  assemble: z.boolean().optional(),
  printHighRes: z.boolean().optional(),
});

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  userPassword: z.string().min(1),
  ownerPassword: z.string().optional(),
  permissions: PermissionsSchema.optional(),
  algorithm: z.enum(["AES-128", "AES-256"]).optional(),
});

export function registerEncryptPdf(server: McpServer): void {
  server.registerTool(
    "encrypt-pdf",
    {
      description:
        "Encrypt a PDF with AES. Needs a PdfSecurity provider (qpdf-wasm, mupdf) wired into the server — pdf-lib v1 reads encrypted PDFs but cannot write them. Without a provider, surfaces an unsupported-feature error.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await encryptPdf(parsed.pdf, {
          userPassword: parsed.userPassword,
          ownerPassword: parsed.ownerPassword,
          permissions: parsed.permissions,
          algorithm: parsed.algorithm,
        });
        return pdfResponse(result, "Encrypted.");
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
