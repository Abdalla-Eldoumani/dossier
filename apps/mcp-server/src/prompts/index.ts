// Prompt registration entry point. One file per prompt template.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerCompressForEmail } from "./compressForEmail.js";
import { registerExtractFirstChapter } from "./extractFirstChapter.js";
import { registerAddPageNumbersBottomRight } from "./addPageNumbersBottomRight.js";

export function registerAllPrompts(server: McpServer): void {
  registerCompressForEmail(server);
  registerExtractFirstChapter(server);
  registerAddPageNumbersBottomRight(server);
}
