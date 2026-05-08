// End-to-end verification of the stdio transport. Spawns dist/index.js, talks
// to it via the official SDK client, lists tools / prompts / resources, and
// calls get-info on a synthesised blank PDF. Exits non-zero on any check
// failure so this script doubles as a CI smoke test.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { PDFDocument } from "pdf-lib";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const serverEntry = resolve(here, "..", "dist", "index.js");

async function blankPdfBase64() {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  doc.addPage([595, 842]);
  doc.addPage([612, 1008]);
  const bytes = await doc.save();
  return Buffer.from(bytes).toString("base64");
}

function assert(cond, message) {
  if (!cond) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`OK   ${message}`);
}

async function main() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
    env: { ...process.env, MCP_DOSSIER_ALLOW_PATHS: "" },
  });
  const client = new Client({ name: "dossier-verify", version: "0.0.0" });
  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    assert(tools.length === 42, `tools/list returns 42 tools (got ${tools.length})`);
    const expectedNames = new Set([
      "merge-pdfs", "split-pdf", "extract-pages", "reorder-pages", "rotate-pages",
      "delete-pages", "insert-blank-page", "insert-pages-from-pdf", "duplicate-pages",
      "crop-pages", "resize-pages", "add-watermark", "add-page-numbers",
      "add-header-footer", "redact-region", "compress-pdf", "pdf-to-images",
      "images-to-pdf", "pdf-to-text", "pdf-to-markdown", "html-to-pdf",
      "get-form-fields", "fill-form", "flatten-form", "add-text-annotation",
      "add-highlight", "add-stamp", "flatten-annotations", "encrypt-pdf",
      "decrypt-pdf", "set-permissions", "strip-metadata", "linearize-pdf",
      "subset-fonts", "downsample-images", "run-ocr", "search-text",
      "get-bookmarks", "set-bookmarks", "get-info", "get-inventory", "repair-pdf",
    ]);
    const actualNames = new Set(tools.map((t) => t.name));
    for (const name of expectedNames) {
      assert(actualNames.has(name), `tool "${name}" registered`);
    }

    const { prompts } = await client.listPrompts();
    assert(prompts.length === 3, `prompts/list returns 3 prompts (got ${prompts.length})`);
    const promptNames = new Set(prompts.map((p) => p.name));
    assert(promptNames.has("compress-for-email"), 'prompt "compress-for-email" registered');
    assert(promptNames.has("extract-first-chapter"), 'prompt "extract-first-chapter" registered');
    assert(promptNames.has("add-page-numbers-bottom-right"), 'prompt "add-page-numbers-bottom-right" registered');

    // With MCP_DOSSIER_ALLOW_PATHS unset the resource never registers, so the
    // server doesn't advertise the resources capability — listResources() will
    // throw -32601. That's the correct protocol behaviour we want to verify.
    let resourcesUnavailable = false;
    try {
      await client.listResources();
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === -32601) {
        resourcesUnavailable = true;
      } else {
        throw err;
      }
    }
    assert(
      resourcesUnavailable,
      "with MCP_DOSSIER_ALLOW_PATHS unset, resources capability is not advertised",
    );

    const pdf = await blankPdfBase64();
    const result = await client.callTool({ name: "get-info", arguments: { pdf } });
    const sc = result.structuredContent;
    assert(sc && typeof sc === "object", "get-info returns structuredContent");
    const info = sc?.data;
    assert(info && info.pageCount === 3, `get-info reports 3 pages (got ${info?.pageCount})`);
    assert(info && info.encrypted === false, "get-info reports unencrypted");
    assert(info && Array.isArray(info.pages) && info.pages.length === 3, "get-info reports per-page metrics");

    const merged = await client.callTool({
      name: "merge-pdfs",
      arguments: { pdfs: [pdf, pdf] },
    });
    const mergedSc = merged.structuredContent;
    assert(mergedSc && mergedSc.pageCount === 6, `merge-pdfs returns 6 pages (got ${mergedSc?.pageCount})`);

    const promptResult = await client.getPrompt({ name: "compress-for-email" });
    assert(
      promptResult.messages.length >= 1,
      `compress-for-email prompt returns at least 1 message (got ${promptResult.messages.length})`,
    );

    console.log("\nAll verification checks passed.");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
