import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { setPermissions } from "@dossier/core";
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
  ownerPassword: z.string().min(1).describe("Required — the permission bitmap can only be rewritten with the owner password."),
  permissions: PermissionsSchema,
});

export function registerSetPermissions(server: McpServer): void {
  server.registerTool(
    "set-permissions",
    {
      description: "Update the permission bitmap on an encrypted PDF without changing passwords. Needs a PdfSecurity provider.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await setPermissions(parsed.pdf, {
          ownerPassword: parsed.ownerPassword,
          permissions: parsed.permissions,
        });
        return pdfResponse(result, "Permissions updated.");
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
