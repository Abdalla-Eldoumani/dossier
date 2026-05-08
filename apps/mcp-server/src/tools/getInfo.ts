import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getInfo } from "@dossier/core";
import { jsonResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
});

export function registerGetInfo(server: McpServer): void {
  server.registerTool(
    "get-info",
    {
      description: "Diagnostic snapshot: page count, per-page dimensions and rotation, PDF version, encryption status, file size.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const info = await getInfo(parsed.pdf);
        return jsonResponse(
          info,
          `${info.pageCount} pages · PDF ${info.pdfVersion}${info.encrypted ? " · encrypted" : ""}.`,
        );
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
