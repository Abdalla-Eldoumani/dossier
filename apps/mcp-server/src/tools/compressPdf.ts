import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { compressPdf } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  level: z
    .enum(["low", "medium", "high"])
    .default("medium")
    .describe("Compression aggressiveness. Higher levels target lower JPEG quality."),
});

export function registerCompressPdf(server: McpServer): void {
  server.registerTool(
    "compress-pdf",
    {
      description:
        "Compress a PDF by re-saving with object streams. JPEG re-encoding only runs when a JpegRecompressor is wired into the server (sharp on Node) — without it, image bytes are left alone but the structural pass still runs.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await compressPdf(parsed.pdf, { level: parsed.level });
        const before = Buffer.from(parsed.pdf, "base64").byteLength;
        const after = result.bytes.byteLength;
        const saved = Math.max(0, before - after);
        return pdfResponse(
          result,
          saved > 0
            ? `Saved ${saved} bytes (${Math.round((saved / before) * 100)}%).`
            : (result.meta.notes?.[0] ?? "No size reduction — input was already optimised."),
        );
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
