import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { subsetFonts } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
});

export function registerSubsetFonts(server: McpServer): void {
  server.registerTool(
    "subset-fonts",
    {
      description:
        "Strip unused glyphs from embedded fonts. Needs a FontSubsetter provider (TrueType / CFF table surgery beyond pdf-lib's surface). Surfaces an unsupported-feature error without one.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await subsetFonts(parsed.pdf);
        return pdfResponse(result, "Fonts subset.");
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
