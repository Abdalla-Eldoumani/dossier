import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchText } from "@dossier/core";
import { jsonResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  query: z.string().min(1),
  caseSensitive: z.boolean().optional().describe("Defaults to case-insensitive."),
});

export function registerSearchText(server: McpServer): void {
  server.registerTool(
    "search-text",
    {
      description: "Find every occurrence of a query string. Returns an array of {pageIndex, snippet, position} hits.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const hits = await searchText(parsed.pdf, parsed.query, {
          caseSensitive: parsed.caseSensitive,
        });
        return jsonResponse(hits, `${hits.length} match${hits.length === 1 ? "" : "es"} for "${parsed.query}".`);
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
