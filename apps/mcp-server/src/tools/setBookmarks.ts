import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { setBookmarks, type BookmarkNode } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const BookmarkSchema: z.ZodType<BookmarkNode> = z.lazy(() =>
  z.object({
    title: z.string(),
    pageIndex: z.number().int().nonnegative().optional(),
    children: z.array(BookmarkSchema).optional(),
  }),
);

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  outline: z
    .array(BookmarkSchema)
    .describe("Bookmark tree to write. Empty array deletes the existing /Outlines entry."),
});

export function registerSetBookmarks(server: McpServer): void {
  server.registerTool(
    "set-bookmarks",
    {
      description: "Replace the document outline with the supplied bookmark tree. Pass an empty array to delete bookmarks entirely.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await setBookmarks(parsed.pdf, parsed.outline);
        return pdfResponse(result, `Outline written with ${parsed.outline.length} top-level entries.`);
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
