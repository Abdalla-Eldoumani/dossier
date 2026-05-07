// Polite ARIA announcement bus. Operation views call `announce("…")` to push a
// message into the live region mounted in the root layout. Decoupled from the
// store so consumers don't have to subscribe to anything they don't already use.

"use client";

export const ANNOUNCE_EVENT = "dossier:announce";

export function announce(message: string): void {
  if (typeof window === "undefined") return;
  if (!message) return;
  window.dispatchEvent(new CustomEvent(ANNOUNCE_EVENT, { detail: message }));
}
