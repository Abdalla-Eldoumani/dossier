# Contributing to Dossier

Thanks for considering a contribution. This document covers the development setup, the coding style, and how to add a new operation.

## Development setup

```bash
git clone https://github.com/your-handle/dossier.git
cd dossier
npm install
```

To run the web app in dev mode:

```bash
npm run dev --workspace=apps/web
```

To run the MCP server in watch mode:

```bash
npm run dev --workspace=apps/mcp-server
```

## Coding style

- Atomic commits. One logical change per commit, lowercase descriptive message in plain English. No conventional-commits prefixes, no emoji.
- TypeScript strict mode. No `any` without a comment explaining why.
- Comments explain *why*, not *what*. Code should be self-explanatory; comments fill in intent.
- No marketing language in code or docs. Plain, direct prose.
- Run `npm run typecheck` and `npm run lint` before opening a PR.
- Add a Vitest test for any new operation in `packages/core`.

## Project structure

```
dossier/
├── apps/
│   ├── web/          Next.js 16 static export
│   └── mcp-server/   Node MCP server
└── packages/
    └── core/         Shared PDF operations
```

The `core` package is the source of truth for every operation. The web app and the MCP server are thin presentation layers that import from it.

## Adding a new operation

1. **Implement in core.** Add `packages/core/src/operations/<name>.ts` exporting a single async function and a Zod schema. Use `loadPdf` and `savePdf` from `internal/`. Throw typed errors only.
2. **Test it.** Add `<name>.test.ts` next to it. Cover the happy path and at least one error path.
3. **Re-export.** Add the operation to `packages/core/src/index.ts`.
4. **Web view.** Add `apps/web/src/components/operations/<Name>.tsx`. Add a method to `apps/web/src/workers/pdf.worker.ts`. Wire the view into `OperationCanvas.tsx`.
5. **MCP tool.** Add `apps/mcp-server/src/tools/<name>.ts` following `tools/merge.ts`. Register it in `tools/index.ts`.

Open the PR with all five layers in place. Reviewers will check that the operation behaves identically across both surfaces.

## Privacy invariants

These are non-negotiable. PRs that violate them will be rejected.

1. The web app must not perform a network request that includes user file content. No analytics, no telemetry, no error reporting that includes file data, no fonts loaded from a CDN at runtime.
2. The MCP server must bind to `127.0.0.1` only by default. Any feature that opens a wider surface must require an explicit `MCP_DOSSIER_ALLOW_*` environment variable, default off.
3. No logging of file content, file names, or page text. Operation names and durations only.
4. No persisting files to disk in temp directories without immediate cleanup.

If you think a feature requires breaking one of these, open an issue first. We'll discuss.

## License

By contributing you agree that your contributions are licensed under the MIT license.
