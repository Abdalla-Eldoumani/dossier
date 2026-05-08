import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerCompressForEmail(server: McpServer): void {
  server.registerPrompt(
    "compress-for-email",
    {
      title: "Compress this PDF for email",
      description:
        "Suggests the workflow for shrinking a PDF below typical email attachment limits (10 MB / 25 MB) using Dossier's compress-pdf tool.",
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              "I need to email this PDF and the inbox limit is 25 MB. Please:\n" +
              "1. Call `get-info` to see the current file size and page dimensions.\n" +
              "2. Call `compress-pdf` with `level: \"medium\"` first. If the result is still over the limit, retry with `level: \"high\"`.\n" +
              "3. If the file is image-heavy and `compress-pdf` doesn't shrink it (the response notes mention an image recompressor isn't wired up), call `downsample-images` with a `targetDpi` of 150 for screen viewing or 100 for very small attachments — but flag that the server build needs an `ImageDownsampler` provider to actually re-encode bytes.\n" +
              "4. Report the before/after byte counts and whether further reduction would need a different tool.",
          },
        },
      ],
    }),
  );
}
