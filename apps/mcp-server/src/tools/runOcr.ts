import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runOcr } from "@dossier/core";
import { jsonResponse, rethrow } from "../lib/respond.js";

const InputSchema = z.object({
  pdf: z.string().describe("Base64-encoded PDF bytes."),
  languages: z
    .array(z.string())
    .min(1)
    .describe("tesseract.js language codes — e.g. ['eng'] or ['eng', 'deu']."),
  pages: z
    .array(z.number().int().nonnegative())
    .optional()
    .describe("Zero-based pages to OCR. Omit for every page."),
  addTextLayer: z
    .boolean()
    .optional()
    .describe("When true, returns a searchable PDF in pdfBytes (base64) alongside the per-page text."),
});

export function registerRunOcr(server: McpServer): void {
  server.registerTool(
    "run-ocr",
    {
      description:
        "Run OCR over a PDF. Needs an OcrEngine provider (tesseract.js worker setup, language data download, page rasterisation). Surfaces an unsupported-feature error without one.",
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      try {
        const parsed = InputSchema.parse(input);
        const result = await runOcr(parsed.pdf, {
          languages: parsed.languages,
          pages: parsed.pages,
          addTextLayer: parsed.addTextLayer,
        });
        const totalChars = result.pages.reduce((n, p) => n + p.text.length, 0);
        const summary = `${result.pages.length} pages · ${totalChars} characters recognised`;
        const payload = {
          pages: result.pages,
          pdfBytes: result.pdfBytes
            ? Buffer.from(result.pdfBytes).toString("base64")
            : undefined,
        };
        return jsonResponse(payload, summary);
      } catch (err) {
        rethrow(err);
      }
    },
  );
}
