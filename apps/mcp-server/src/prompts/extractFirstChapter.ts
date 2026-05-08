import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerExtractFirstChapter(server: McpServer): void {
  server.registerPrompt(
    "extract-first-chapter",
    {
      title: "Extract the first chapter",
      description:
        "Suggests the workflow for pulling a chapter range out of a PDF using bookmarks plus extract-pages.",
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              "I want a separate PDF containing just the first chapter of this book. Please:\n" +
              "1. Call `get-bookmarks` to see the outline. Identify the first chapter (the first child of the top-level entry whose title looks like 'Chapter 1', 'Part One', the book's opening section, etc.) and the next sibling that comes after it.\n" +
              "2. The chapter range is the chapter's `pageIndex` (inclusive) up to one less than the next sibling's `pageIndex` (or to the last page if it's the last chapter).\n" +
              "3. Call `extract-pages` with the zero-based indices in that range to produce the chapter PDF.\n" +
              "4. If `get-bookmarks` returns an empty array, fall back to `pdf-to-text` with `layoutPreserve: false`, look for the first occurrence of 'Chapter 2' (or equivalent) to bound the range, and confirm with the user before extracting.\n" +
              "5. Return the merged page list you used and the resulting PDF size so the user can verify the chapter was bounded correctly.",
          },
        },
      ],
    }),
  );
}
