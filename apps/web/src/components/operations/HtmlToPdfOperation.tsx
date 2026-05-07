"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Globe } from "lucide-react";
import { cn } from "@/lib/cn";

export function HtmlToPdfOperation() {
  const [html, setHtml] = useState(
    `<!doctype html>\n<html>\n<head>\n  <meta charset="utf-8" />\n  <title>Document</title>\n  <style>\n    body { font-family: Georgia, serif; max-width: 720px; margin: 2em auto; line-height: 1.5; }\n    h1 { margin-top: 0; }\n  </style>\n</head>\n<body>\n  <h1>Hello</h1>\n  <p>Edit this HTML, then click Render.</p>\n</body>\n</html>`,
  );
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (typeof window === "undefined") return;
    setBusy(true);
    try {
      // Render the HTML in a hidden iframe and trigger the browser's print dialog,
      // which exposes "Save as PDF" on every modern desktop browser. This avoids
      // shipping a heavy renderer (puppeteer/headless) into the static export.
      const frame = document.createElement("iframe");
      frame.style.position = "fixed";
      frame.style.right = "0";
      frame.style.bottom = "0";
      frame.style.width = "0";
      frame.style.height = "0";
      frame.style.border = "0";
      document.body.appendChild(frame);

      const doc = frame.contentDocument;
      if (!doc) {
        throw new Error("Could not access the iframe document.");
      }
      doc.open();
      doc.write(html);
      doc.close();

      // Wait one paint frame so styles apply before the print dialog opens.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const win = frame.contentWindow;
      if (!win) {
        document.body.removeChild(frame);
        throw new Error("Could not access the iframe window.");
      }
      win.focus();
      win.print();
      // Some browsers fire afterprint synchronously, others delay — clean up
      // a beat later so the dialog has time to attach.
      setTimeout(() => {
        if (frame.parentNode) frame.parentNode.removeChild(frame);
      }, 1000);

      toast.success("Print dialog opened.", {
        description: "Pick \"Save as PDF\" as the destination.",
      });
    } catch (err) {
      toast.error("Could not render.", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-[var(--color-ink-3)] max-w-prose">
        Paste HTML, click Render, and the browser{"’"}s print dialog opens with the
        rendered content — pick <strong>Save as PDF</strong> as the destination. Static
        export rules out a server-side puppeteer; this stays purely in-browser. Supported
        subset: anything Chromium / Firefox / Safari render natively (CSS3, web fonts via
        data URLs, no JavaScript-driven layout). External images and CDN fonts won{"’"}t
        load — inline them as data URIs.
      </p>

      <label className="block">
        <span className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          HTML
        </span>
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={16}
          spellCheck={false}
          className={cn(
            "w-full px-3 py-2 rounded-[var(--radius-sm)]",
            "border border-[var(--color-rule)] bg-[var(--color-paper-2)]",
            "text-[13px] text-[var(--color-ink)]",
            "focus:outline-none focus:border-[var(--color-accent)]",
          )}
          style={{ fontFamily: "var(--font-mono)" }}
        />
      </label>

      <button
        type="button"
        disabled={busy || !html.trim()}
        onClick={onRun}
        className={cn(
          "inline-flex items-center gap-2 px-4 h-10 rounded-[var(--radius-sm)]",
          "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-medium",
          "transition-opacity duration-150",
          busy || !html.trim() ? "opacity-60 cursor-not-allowed" : "hover:opacity-90",
        )}
      >
        <Globe size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Rendering…" : "Render and save"}
      </button>
    </div>
  );
}
