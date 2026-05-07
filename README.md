# Dossier

A privacy-first PDF toolkit. Every operation runs locally — files never leave your machine.

Two surfaces:

- **Web app** — a static site you run in your browser. Drag a PDF in, work with it, get the result back. No upload, no server round-trip, no telemetry.
- **MCP server** — exposes the same operations to AI agents over the Model Context Protocol. Use it with Claude Desktop, Claude Code, Cursor, or any MCP client.

Both surfaces share one core library, so behaviour is identical whether a human is clicking buttons or an agent is calling tools.

## Operations

Page-level: merge, split, extract, reorder, rotate, delete, insert, duplicate, crop, resize.

Content: compress, watermark, add page numbers, add headers and footers, redact regions, add bookmarks.

Conversion: PDF to images, images to PDF, PDF to text, PDF to Markdown, HTML to PDF.

Forms: fill, flatten, extract field data.

Annotations: add, highlight, free-draw, stamp, flatten.

Security: encrypt with password, decrypt, set permissions, strip metadata.

Optimisation: linearise for web, embed and subset fonts, downsample images.

Accessibility: OCR scanned PDFs, search text, edit table of contents.

Diagnostics: page count, file size breakdown, font inventory, embedded resource list, repair best-effort.

## Run the web app locally

```bash
git clone https://github.com/your-handle/dossier.git
cd dossier
npm install
npm run dev --workspace=apps/web
```

Open `http://localhost:3000`. The app is a static export — `npm run build --workspace=apps/web` produces a folder you can serve from anywhere, or open straight from disk.

## Run the MCP server

```bash
npm run build --workspace=apps/mcp-server
```

Then add Dossier to your MCP client. For Claude Desktop, edit `~/.../claude_desktop_config.json`:

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

For HTTP transport (if you want to run the server as a long-lived process):

```bash
npm run start:http --workspace=apps/mcp-server
```

The HTTP server binds to `127.0.0.1:8923` by default. Loopback only — it does not accept connections from other machines unless you explicitly change the bind address.

## Architecture

```
dossier/
├── apps/
│   ├── web/          Next.js 16 static export, runs PDF ops in Web Workers
│   └── mcp-server/   Node MCP server, stdio + Streamable HTTP transports
└── packages/
    └── core/         Shared PDF operations. Environment-agnostic.
```

The core package is the source of truth. The web app and the MCP server are thin presentation layers on top of it.

## Privacy

Files never leave your machine. The web app is a static site — there is no backend to send files to. The MCP server runs in your local Node process. Telemetry is off and there is no opt-in to turn on.

If you fork this and add cloud functionality, please be obvious about it. The point of Dossier is that you can audit it, run it offline, and trust it with anything.

## License

MIT. See `LICENSE`.
