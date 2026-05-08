# Dossier MCP Server

Model Context Protocol server exposing Dossier's PDF operations to AI agents. All processing runs in your local Node process — no PDFs leave your machine.

## Install

```bash
npm install -g @dossier/mcp-server
```

Or run from the monorepo:

```bash
git clone https://github.com/Abdalla-Eldoumani/dossier.git
cd dossier
npm install
npm run build --workspace=apps/mcp-server
```

## Use with Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%/Claude/claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "dossier": {
      "command": "node",
      "args": ["/absolute/path/to/dossier/apps/mcp-server/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop. The Dossier tools appear in the tool picker.

## Use with Claude Code

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "dossier": {
      "command": "node",
      "args": ["/absolute/path/to/dossier/apps/mcp-server/dist/index.js"]
    }
  }
}
```

## Use with HTTP transport

```bash
npm run start:http --workspace=apps/mcp-server
```

Default bind is `127.0.0.1:8923`. The server validates the Host header and rejects anything that isn't a localhost variant. Port and bind address are configurable via `PORT` and `BIND` environment variables — but binding to anything other than loopback is unsafe unless you're behind a trusted reverse proxy doing its own auth.

## Tools

Every operation in the [main README](../../README.md) is exposed as a tool. Tool names use kebab-case (e.g. `merge-pdfs`, `extract-pages`, `compress-pdf`).

Inputs and outputs are base64-encoded PDF bytes, plus a structured summary describing what changed.

## License

MIT.
