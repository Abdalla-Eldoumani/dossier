// Tool registration entry point. Add new tools here as they're implemented.
// Each tool lives in its own file in this directory.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMergePdfs } from "./merge.js";

export function registerAllTools(server: McpServer): void {
  registerMergePdfs(server);

  // Add new tool registrations here as they're built.
  // Keep one tool per file. Match the file name to the operation id from packages/core.
}
