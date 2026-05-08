import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { splitByPageCount, splitByRanges } from "@dossier/core";
import { multiPdfResponse, rethrow } from "../lib/respond.js";

const InputSchema = z
  .object({
    pdf: z.string().describe("Base64-encoded PDF bytes."),
    mode: z.enum(["count", "ranges"]).describe("Which split strategy to apply."),
    pagesPerPart: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Number of pages per output. Required when mode is 'count'."),
    ranges: z
      .array(
        z.object({
          from: z.number().int().min(1).describe("First page (1-based, inclusive)."),
          to: z.number().int().min(1).describe("Last page (1-based, inclusive)."),
        }),
      )
      .optional()
      .describe("Range list. Required when mode is 'ranges'."),
  })
  .describe("Split a PDF into multiple PDFs by count or by explicit ranges.");

export function registerSplitPdf(server: McpServer): void {
  server.registerTool(
    "split-pdf",
    {
      description:
        "Split a PDF into multiple PDFs. Mode 'count' splits every N pages. Mode 'ranges' takes an array of {from,to} 1-based inclusive ranges. Returns each output as a separate base64 entry.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        let parts: Uint8Array[];
        if (parsed.mode === "count") {
          if (!parsed.pagesPerPart) {
            throw new Error("INVALID_INPUT: 'pagesPerPart' is required when mode is 'count'.");
          }
          parts = await splitByPageCount(parsed.pdf, parsed.pagesPerPart);
        } else {
          if (!parsed.ranges || parsed.ranges.length === 0) {
            throw new Error("INVALID_INPUT: 'ranges' is required when mode is 'ranges'.");
          }
          parts = await splitByRanges(parsed.pdf, parsed.ranges);
        }
        return multiPdfResponse(parts, `Produced ${parts.length} PDF${parts.length === 1 ? "" : "s"}.`);
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
