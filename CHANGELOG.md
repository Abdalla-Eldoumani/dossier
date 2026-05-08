# Changelog

All notable changes to Dossier are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0]

Initial public release. Privacy-first PDF toolkit with two surfaces sharing one core: a browser-only Next.js static-export web app, and a Node MCP server.

### Added

#### Core (`@dossier/core`)
- 42 PDF operations covering pages (merge, split, extract, reorder, rotate, delete, insert, duplicate, crop, resize), content (watermark, page numbers, header/footer, redact, compress), conversion (PDF↔images, PDF→text, PDF→Markdown), forms (read, fill, flatten), annotations (text, highlight, stamp, flatten), security (encrypt, decrypt, set permissions, strip metadata), optimisation (linearise, subset fonts, downsample images), accessibility (OCR, search, get/set bookmarks), and diagnostics (info, inventory, repair).
- Provider-injection pattern for environment-specific work (`JpegRecompressor`, `PageRenderer`, `PdfSecurity`, `PdfLinearizer`, `FontSubsetter`, `ImageDownsampler`, `OcrEngine`, `PdfRepairer`) so each surface can wire the runtime it has.
- Typed error hierarchy (`OperationError` with codes: `INVALID_PDF`, `EMPTY_FILE`, `PASSWORD_REQUIRED`, `INVALID_PASSWORD`, `CORRUPT_PDF`, `FILE_TOO_LARGE`, `OUT_OF_MEMORY`, `INVALID_INPUT`, `OPERATION_FAILED`, `UNSUPPORTED_FEATURE`, `BUSY`).
- Zod schemas at the public boundary of every operation.
- 205 vitest tests covering happy paths plus at least one error path per operation.

#### Web app
- Next.js 16 static export, Tailwind v4, React 19. No server runtime, no telemetry, no CDN font fetches.
- 40 operation views — one per operation id, plus `Annotations — add` covering three operations (text / highlight / stamp).
- Comlink-wrapped Web Worker exposing every core operation off the main thread.
- Drop zone with magic-number sniffing (no `file.type` trust), Zustand state store, file badge, virtualised page-thumbnail grid, sidebar with mobile slide-over, header with theme toggle, custom 404 page.
- Keyboard-shortcut overlay (`?`), polite `aria-live` region, forced-colors and reduced-motion handling.
- Lighthouse desktop scores: performance 99, accessibility 100, best-practices 100.
- Strict CSP and security-header bundle in `vercel.json` for the static deploy.

#### MCP server
- Stdio transport for Claude Desktop and Claude Code; Streamable HTTP transport for local agents (loopback only, Host-header DNS-rebinding defence).
- 42 MCP tools — one per core operation. Provider-needing tools surface `UNSUPPORTED_FEATURE` until a Node-side provider is wired in.
- `dossier://info/{filename}` resource gated on `MCP_DOSSIER_ALLOW_PATHS`, with `realpath`-based prefix checks.
- Three prompt templates: `compress-for-email`, `extract-first-chapter`, `add-page-numbers-bottom-right`.
- `verify` script that round-trips every advertised method via the SDK Client.

### Privacy invariants

- The web app performs no network requests with user file content. No analytics, no telemetry, no fonts loaded from a CDN at runtime.
- The MCP server binds to `127.0.0.1` only.
- No logging of file content, file names, or page text. Operation names and durations only.
- No persisting files to disk in temp directories without immediate cleanup.
