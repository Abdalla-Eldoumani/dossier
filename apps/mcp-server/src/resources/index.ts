// Resource registration entry point. One file per resource (or per logical
// resource group). Match the file name to the resource id where possible.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerInfoResource } from "./info.js";

export function registerAllResources(server: McpServer): void {
  registerInfoResource(server);
}
