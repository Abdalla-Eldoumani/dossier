// Reads `MCP_DOSSIER_ALLOW_PATHS` and decides whether a requested path is safe
// to read. The env var is the only thing that opts a deployment into reading
// PDFs from disk — without it, the resource layer doesn't even register, so
// there's no surface to attack.
//
// Resolution uses `realpath` to follow symlinks before the prefix check, which
// closes the trivial "symlink in /tmp pointing at /etc/passwd" escape.

import { realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";

export interface AllowedPathsConfig {
  roots: string[]; // resolved, real-path absolute directories
}

export function readAllowedPaths(): AllowedPathsConfig | null {
  const raw = process.env.MCP_DOSSIER_ALLOW_PATHS;
  if (!raw || !raw.trim()) return null;
  const entries = raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => resolve(s));
  if (entries.length === 0) return null;
  return { roots: entries };
}

export async function resolveUnderAllowedRoot(
  requested: string,
  config: AllowedPathsConfig,
): Promise<string> {
  const absRequested = resolve(requested);
  const real = await realpath(absRequested);
  for (const root of config.roots) {
    const realRoot = await realpath(root).catch(() => root);
    if (real === realRoot || real.startsWith(realRoot + sep)) {
      return real;
    }
  }
  throw new Error(
    `Path "${requested}" is outside MCP_DOSSIER_ALLOW_PATHS — refusing to read.`,
  );
}
