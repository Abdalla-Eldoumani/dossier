// Streamable HTTP transport. Loopback only by default — DNS-rebinding defence enforced
// via the Host header check.
//
// Run with: npm run start:http --workspace=apps/mcp-server
// Override port: PORT=8923 (default). Override bind: BIND=127.0.0.1 (default).

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerAllTools } from "./tools/index.js";
import { registerAllResources } from "./resources/index.js";
import { registerAllPrompts } from "./prompts/index.js";
import { log } from "./lib/log.js";

const PORT = Number(process.env.PORT ?? 8923);
const BIND = process.env.BIND ?? "127.0.0.1";

// Hosts we allow. Anything else gets a 403, which kills DNS rebinding attacks against
// long-lived browser tabs that try to talk to us as if we were a normal web service.
const ALLOWED_HOSTS = new Set([
  `localhost:${PORT}`,
  `127.0.0.1:${PORT}`,
  `[::1]:${PORT}`,
]);

async function main() {
  const server = new McpServer({ name: "dossier", version: "0.1.0" });
  registerAllTools(server);
  registerAllResources(server);
  registerAllPrompts(server);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  await server.connect(transport);

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const host = req.headers.host;
    if (!host || !ALLOWED_HOSTS.has(host)) {
      res.statusCode = 403;
      res.end("Forbidden: host not allowed");
      return;
    }

    if (req.url !== "/mcp") {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    try {
      // Parse JSON body for POST requests; the SDK handles the rest.
      let body: unknown;
      if (req.method === "POST") {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const raw = Buffer.concat(chunks).toString("utf8");
        body = raw ? JSON.parse(raw) : undefined;
      }
      await transport.handleRequest(req, res, body);
    } catch (err) {
      log("Request error:", err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end("Internal error");
      }
    }
  });

  httpServer.listen(PORT, BIND, () => {
    log(`Dossier MCP server listening on http://${BIND}:${PORT}/mcp`);
  });
}

main().catch((err) => {
  log("Fatal error:", err);
  process.exit(1);
});
