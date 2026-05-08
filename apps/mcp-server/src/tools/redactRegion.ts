import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { redactRegion } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  pageIndex: z.number().int().nonnegative(),
  region: z.object({
    x: z.number().nonnegative(),
    y: z.number().nonnegative(),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
});

export function registerRedactRegion(server: McpServer): void {
  server.registerTool(
    "redact-region",
    {
      description:
        "Redact a region by rewriting the page content stream — text inside the region is permanently removed, not just covered. Verify the result before sharing: text in form XObjects (the Do operator) is not yet reached.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await redactRegion(parsed.pdf, parsed.pageIndex, parsed.region);
        return pdfResponse(result, `Redacted region on page ${parsed.pageIndex + 1}.`);
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
