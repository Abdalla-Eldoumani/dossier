import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OperationError } from "@dossier/core";
import { rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  html: z.string().min(1).describe("HTML source to render."),
});

export function registerHtmlToPdf(server: McpServer): void {
  server.registerTool(
    "html-to-pdf",
    {
      description:
        "Render HTML to a PDF. Requires a server-side renderer (puppeteer, playwright, or chrome-headless-shell) to be wired up — there is no core operation for this. Until a renderer ships, this tool surfaces an unsupported-feature error so callers can fall back to the web app's HTML-to-PDF view.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        InputSchema.parse(input);
        throw new OperationError(
          "UNSUPPORTED_FEATURE",
          "html-to-pdf has no Node-side renderer wired in this server build. The browser-only path lives in the web app's HTML-to-PDF view (uses window.print()).",
        );
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
