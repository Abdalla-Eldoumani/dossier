import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { insertBlankPage } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const SizeSchema = z.union([
  z.object({ name: z.enum(["A4", "A3", "A5", "Letter", "Legal", "Tabloid"]) }),
  z.object({
    custom: z.object({
      width: z.number().positive().describe("Page width in PDF points."),
      height: z.number().positive().describe("Page height in PDF points."),
    }),
  }),
]);

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  atIndex: z
    .number()
    .int()
    .nonnegative()
    .describe("Zero-based position to insert the blank page at. 0 prepends, pageCount appends."),
  size: SizeSchema.describe("Either a named preset or custom width/height in points."),
});

export function registerInsertBlankPage(server: McpServer): void {
  server.registerTool(
    "insert-blank-page",
    {
      description: "Insert a blank page at the given position.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await insertBlankPage(parsed.pdf, parsed.atIndex, parsed.size);
        return pdfResponse(result, `Inserted blank page at index ${parsed.atIndex}.`);
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
