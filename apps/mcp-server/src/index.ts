#!/usr/bin/env node
// Dossier MCP server — stdio transport.
//
// Critical: never write to stdout from anywhere except the MCP framework. stdout is the JSON-RPC
// stream — a stray console.log corrupts it and the client disconnects. All logging goes to stderr
// via the `log()` helper in lib/log.ts.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";
import { registerAllResources } from "./resources/index.js";
import { registerAllPrompts } from "./prompts/index.js";
import { log } from "./lib/log.js";

async function main() {
  const server = new McpServer({
    name: "dossier",
    version: "0.1.0",
  });

  registerAllTools(server);
  registerAllResources(server);
  registerAllPrompts(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  log("Dossier MCP server running on stdio");
}

main().catch((err) => {
  log("Fatal error:", err);
  process.exit(1);
});
