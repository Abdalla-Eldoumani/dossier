// `dossier://info/{filename}` — read-only resource that exposes `getInfo` for a
// PDF on disk. Only registered when `MCP_DOSSIER_ALLOW_PATHS` is set, and even
// then every path is realpath'd and checked against the allowlist before any
// file is opened.

import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getInfo } from "@dossier/core";
import { readAllowedPaths, resolveUnderAllowedRoot } from "../lib/allowedPaths.js";
import { log } from "../lib/log.js";

export function registerInfoResource(server: McpServer): boolean {
  const config = readAllowedPaths();
  if (!config) {
    log("MCP_DOSSIER_ALLOW_PATHS not set — dossier://info/{filename} resource is disabled.");
    return false;
  }

  log(`dossier://info/{filename} enabled. Allowed roots: ${config.roots.join(", ")}`);

  const template = new ResourceTemplate("dossier://info/{+filename}", { list: undefined });

  server.registerResource(
    "info",
    template,
    {
      title: "PDF info",
      description:
        "Diagnostic snapshot of a PDF on disk: page count, per-page dimensions, version, encryption status, file size. Path must be under MCP_DOSSIER_ALLOW_PATHS.",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const filenameRaw = variables.filename;
      const filename = Array.isArray(filenameRaw) ? filenameRaw.join("/") : filenameRaw;
      if (typeof filename !== "string" || !filename) {
        throw new Error("INVALID_INPUT: dossier://info/ requires a filename.");
      }
      if (extname(filename).toLowerCase() !== ".pdf") {
        throw new Error("INVALID_INPUT: filename must end with .pdf");
      }

      const real = await resolveUnderAllowedRoot(filename, config);
      const bytes = await readFile(real);
      const info = await getInfo(new Uint8Array(bytes));

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    },
  );

  return true;
}
