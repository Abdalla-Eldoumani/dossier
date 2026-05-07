// stdout is the JSON-RPC channel for stdio transport. Anything written there corrupts the stream.
// Use this helper everywhere instead of console.log. console.error is fine but log() is shorter
// and signals intent.

export function log(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.error("[dossier-mcp]", ...args);
}
