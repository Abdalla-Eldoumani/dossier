import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { addTextAnnotation } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  pageIndex: z.number().int().nonnegative(),
  position: z.object({
    x: z.number().nonnegative().describe("x in PDF points, bottom-left origin."),
    y: z.number().nonnegative().describe("y in PDF points, bottom-left origin."),
  }),
  text: z.string().min(1),
  options: z
    .object({
      author: z.string().optional(),
      open: z.boolean().optional(),
      icon: z.enum(["Comment", "Note", "Help", "Insert", "Key", "NewParagraph", "Paragraph"]).optional(),
    })
    .optional(),
});

export function registerAddTextAnnotation(server: McpServer): void {
  server.registerTool(
    "add-text-annotation",
    {
      description: "Place a text annotation (sticky note) on a page.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await addTextAnnotation(
          parsed.pdf,
          parsed.pageIndex,
          parsed.position,
          parsed.text,
          parsed.options ?? {},
        );
        return pdfResponse(result, `Note added to page ${parsed.pageIndex + 1}.`);
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
