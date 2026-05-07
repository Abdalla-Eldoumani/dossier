"use client";

// Polite live region. Mounted once in the root layout. Listens for
// `dossier:announce` window events and renders the latest message into a
// visually-hidden div, so screen readers pick up status updates that aren't
// already announced via toasts (e.g. "Inspecting…", "Recognising page 3 of 12").

import { useEffect, useState } from "react";
import { ANNOUNCE_EVENT } from "@/lib/announce";

export function AriaLiveRegion() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handler = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail = event.detail;
      if (typeof detail !== "string") return;
      // Re-set even if it's the same string so that repeated announcements
      // (e.g. progress for the same step) re-fire the assistive-tech read.
      setMessage("");
      requestAnimationFrame(() => setMessage(detail));
    };
    window.addEventListener(ANNOUNCE_EVENT, handler);
    return () => window.removeEventListener(ANNOUNCE_EVENT, handler);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
