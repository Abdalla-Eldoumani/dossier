import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { addHeaderFooter } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  header: z.string().optional().describe("Header text. Substitutions: {n}, {total}, {date}."),
  footer: z.string().optional().describe("Footer text. Same substitutions as header."),
  font: z.enum(["Helvetica", "TimesRoman", "Courier"]).optional(),
  size: z.number().positive().optional(),
});

export function registerAddHeaderFooter(server: McpServer): void {
  server.registerTool(
    "add-header-footer",
    {
      description: "Add a running header and/or footer to every page. Supports {n}, {total}, {date} substitutions.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        if (!parsed.header && !parsed.footer) {
          throw new Error("INVALID_INPUT: Provide a 'header', a 'footer', or both.");
        }
        const result = await addHeaderFooter(parsed.pdf, parsed);
        return pdfResponse(result, "Header / footer added.");
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
