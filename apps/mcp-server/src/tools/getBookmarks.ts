import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getBookmarks } from "@dossier/core";
import { jsonResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
});

export function registerGetBookmarks(server: McpServer): void {
  server.registerTool(
    "get-bookmarks",
    {
      description: "Read the document outline (bookmarks) as a nested tree. Each node is { title, pageIndex?, children? }.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const tree = await getBookmarks(parsed.pdf);
        return jsonResponse(tree, `${tree.length} top-level bookmark${tree.length === 1 ? "" : "s"}.`);
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
