import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { addPageNumbers } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const PositionSchema = z.enum([
  "top-left", "top-center", "top-right",
  "bottom-left", "bottom-center", "bottom-right",
]);

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  format: z
    .string()
    .min(1)
    .default("{n}")
    .describe("Format string. {n} = page number, {total} = total page count."),
  font: z.enum(["Helvetica", "TimesRoman", "Courier"]).optional(),
  size: z.number().positive().optional(),
  position: PositionSchema.optional(),
  skipFirst: z.number().int().nonnegative().optional().describe("Pages to leave unnumbered at the start."),
  startAt: z.number().int().positive().optional().describe("Page number to display on the first numbered page."),
  color: z
    .tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1)])
    .optional(),
});

export function registerAddPageNumbers(server: McpServer): void {
  server.registerTool(
    "add-page-numbers",
    {
      description: "Stamp page numbers on each page using a format string.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await addPageNumbers(parsed.pdf, parsed);
        return pdfResponse(result, "Page numbers added.");
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
