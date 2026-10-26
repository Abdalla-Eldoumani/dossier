# Dossier

A privacy-first PDF toolkit. Every operation runs locally, and files never leave your machine.

Two surfaces:

- **Web app**: a static site you run in your browser. Drag a PDF in, work with it, get the result back. No upload, no server round-trip, no telemetry.
- **MCP server**: exposes the same operations to AI agents over the Model Context Protocol. Use it with Claude Desktop, Claude Code, Cursor, or any MCP client.

Both surfaces share one core library, so behaviour is identical whether a human is clicking buttons or an agent is calling tools.

## Operations

Page-level: merge, split, extract, reorder, rotate, delete, insert (blank pages or pages from another PDF), duplicate, crop, resize.

Content: compress, watermark, add page numbers, add headers and footers, redact text inside a region, add bookmarks.

Conversion: images to PDF, PDF to text, PDF to Markdown, HTML to PDF (web app only, through the browser's print dialog).

Forms: fill, flatten, extract field data.

Annotations: sticky notes, highlights, stamps, flatten.

Security: strip metadata.

Diagnostics: page count, PDF version, file size, font and image inventory, text search, best-effort repair.

Not wired up yet: encrypt, decrypt, set permissions, PDF to images, OCR, linearise, font subsetting, and image downsampling. The core defines these operations, but each needs a provider (qpdf-wasm, PDFium, tesseract.js, a page renderer) that neither surface supplies yet, so they return an unsupported-feature error.

## Run the web app locally

```bash
npm install
npm run build --workspace=packages/core   # the web app and MCP server import the built core
npm run dev --workspace=apps/web
```

Open `http://localhost:3000`. The app is a static export: `npm run build --workspace=apps/web` writes `apps/web/out`, which any static file server can host.

## Deploy the web app

The web app is a fully static Next.js export, so any static host works: Vercel, Netlify, Cloudflare Pages, or an `nginx` block pointing at `apps/web/out`.

The web app ships its own `apps/web/vercel.json` with a strict Content-Security-Policy, HSTS, COOP/CORP, X-Frame-Options, Referrer-Policy `no-referrer`, a locked-down Permissions-Policy, and immutable cache headers for static assets. To deploy on Vercel: connect the repo and set **Root Directory** to `apps/web`. The build command walks up to the monorepo root to build `@dossier/core` first, then runs `next build`, so no further setup is needed.

## Run the MCP server

```bash
npm run build --workspace=packages/core
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

The HTTP server binds to `127.0.0.1:8923` by default (override with `PORT` and `BIND`). It only accepts loopback connections unless you change the bind address.

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

Files never leave your machine. The web app is a static site with no backend to send files to. The MCP server runs in your local Node process. Telemetry is off and there is no opt-in to turn on.

If you fork this and add cloud functionality, please be obvious about it. The point of Dossier is that you can audit it, run it offline, and trust it with anything.

## License

MIT. See `LICENSE`.
