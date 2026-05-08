# Security

## Privacy posture

Dossier processes PDFs entirely on the user's machine. The web app is a static export with no backend. The MCP server runs as a local Node process. We do not collect telemetry. We have no servers to compromise.

That said, "local" doesn't mean "automatically safe." The threat model below covers what we actively defend against.

## Threat model

### In scope

- A malicious PDF that triggers parser bugs in pdf-lib, pdfjs-dist, or PDFium-WASM. Mitigation: dependencies pinned, security advisories monitored, parser errors caught and surfaced as typed failures rather than crashes.
- A web-page-level XSS or supply-chain attack against the static site. Mitigation: strict CSP (in the deployed site's headers), exact-version dependencies, no runtime CDN font fetches, no third-party analytics.
- DNS rebinding against the local HTTP MCP transport. Mitigation: the HTTP server validates the Host header against a strict localhost allowlist.
- Path traversal when the MCP server's optional path-input mode is enabled. Mitigation: paths are resolved against an explicit allowlist of roots.
- Watermark or page-number text used as an injection vector. Mitigation: text is interpolated through safe substitution; we never `eval`, `new Function`, or hand text to a shell.

### Out of scope

- Arbitrary code execution on a fully compromised local machine. If your machine is owned, Dossier can't help you.
- Network attacks against the user's other services. Dossier doesn't open ports without explicit opt-in.
- Cryptographic guarantees that go beyond what pdf-lib + AES-256 provide. We're not a secure-enclave product.

## Reporting a vulnerability

If you find a security issue, please don't open a public GitHub issue. Email `security@dossier-pdf.example` with a description and, if possible, a proof of concept. We'll acknowledge within 72 hours and aim to fix critical issues within 14 days.

For non-critical issues — UI glitches, accessibility regressions, or operation-correctness bugs that don't have a security impact — a public issue is fine.

## Supported versions

Only the latest tagged release. We don't backport security fixes to older minor versions.
