import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getInventory } from "@dossier/core";
import { jsonResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
});

export function registerGetInventory(server: McpServer): void {
  server.registerTool(
    "get-inventory",
    {
      description:
        "Resource inventory: embedded fonts (with embedded flag), image XObjects (with width/height/filter/byte size), and presence flags for JavaScript and embedded attachments.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const inv = await getInventory(parsed.pdf);
        return jsonResponse(
          inv,
          `${inv.fonts.length} fonts · ${inv.images.length} images${inv.javascript ? " · JS present" : ""}${inv.attachments ? " · attachments" : ""}.`,
        );
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
