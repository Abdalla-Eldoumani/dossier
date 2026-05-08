import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { addStamp, BUILTIN_STAMPS } from "@dossier/core";
import { pdfResponse, rethrow } from "../lib/respond.js";

const StampSchema = z.union([
  z.object({
    kind: z.literal("builtin"),
    name: z.enum(BUILTIN_STAMPS),
    color: z
      .tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1)])
      .optional(),
  }),
  z.object({
    kind: z.literal("image"),
    image: z.string().describe("Base64-encoded PNG or JPEG bytes."),
  }),
]);

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  pageIndex: z.number().int().nonnegative(),
  position: z.object({
    x: z.number().nonnegative(),
    y: z.number().nonnegative(),
  }),
  stamp: StampSchema,
  options: z
    .object({
      size: z.number().positive().optional(),
      rotation: z.number().optional(),
      opacity: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

export function registerAddStamp(server: McpServer): void {
  server.registerTool(
    "add-stamp",
    {
      description: "Apply a built-in stamp (Approved, Confidential, …) or a custom image stamp to a page.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const stamp =
          parsed.stamp.kind === "image"
            ? { kind: "image" as const, image: new Uint8Array(Buffer.from(parsed.stamp.image, "base64")) }
            : parsed.stamp;
        const result = await addStamp(
          parsed.pdf,
          parsed.pageIndex,
          parsed.position,
          stamp,
          parsed.options ?? {},
        );
        return pdfResponse(result, `Stamp applied to page ${parsed.pageIndex + 1}.`);
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
