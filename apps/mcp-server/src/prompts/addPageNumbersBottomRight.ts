import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerAddPageNumbersBottomRight(server: McpServer): void {
  server.registerPrompt(
    "add-page-numbers-bottom-right",
    {
      title: "Add page numbers in the bottom-right",
      description:
        "Suggests the workflow for stamping page numbers in the bottom-right corner with sensible defaults.",
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              "Please add page numbers to this PDF. Use the `add-page-numbers` tool with:\n" +
              "  - `format: \"Page {n} of {total}\"`\n" +
              "  - `position: \"bottom-right\"`\n" +
              "  - `size: 11`\n" +
              "  - `font: \"Helvetica\"`\n" +
              "If the user has indicated this is a chaptered document, also pass `skipFirst: 1` so the cover page stays unnumbered, and `startAt: 1` so the second page reads 'Page 1 of …'. Return the resulting PDF as base64 plus a one-line summary of the parameters you used.",
          },
        },
      ],
    }),
  );
}
