"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ImageDown } from "lucide-react";
import { OperationError } from "@dossier/core";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { cn } from "@/lib/cn";

const FORMATS = ["png", "jpeg", "webp"] as const;
type Format = (typeof FORMATS)[number];

export function PdfToImagesOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [format, setFormat] = useState<Format>("png");
  const [dpi, setDpi] = useState(150);
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    try {
      // Rasterisation needs an OffscreenCanvas-based PageRenderer wired into the worker.
      // The passthrough exposed in pdf.worker.ts forwards the renderer slot directly to
      // core, where it throws INVALID_INPUT when missing — surface that as a friendly
      // unsupported-feature toast until provider injection ships.
      throw new OperationError(
        "UNSUPPORTED_FEATURE",
        "PDF-to-images needs a browser-side PageRenderer. Wiring lands alongside the rasterisation provider — clicking does nothing yet.",
      );
      // The following would run once a renderer is provided:
      // const result = await worker.pdfToImages(staged.bytes, renderer, { format, dpi });
      // const base = staged.name.replace(/\.pdf$/i, "");
      // for (let i = 0; i < result.images.length; i++) {
      //   await downloadBytes(result.images[i]!, `${base}.page-${i + 1}.${format}`);
      // }
    } catch (err) {
      toast.error("Could not export images.", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Format
        </legend>
        <div className="flex gap-2">
          {FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={cn(
                "inline-flex items-center px-3 h-9 rounded-[var(--radius-sm)] text-[13px] uppercase tracking-[0.06em]",
                "border transition-colors duration-150",
                format === f
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                  : "border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)]",
              )}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {f}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block w-32">
        <span className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          DPI
        </span>
        <input
          type="number"
          min={36}
          max={600}
          step={1}
          value={dpi}
          onChange={(e) => setDpi(Math.max(36, Math.min(600, Number(e.target.value) || 0)))}
          className={cn(
            "w-full px-3 h-10 rounded-[var(--radius-sm)]",
            "border border-[var(--color-rule)] bg-[var(--color-paper)]",
            "text-[14px]",
            "focus:outline-none focus:border-[var(--color-accent)]",
          )}
          style={{ fontFamily: "var(--font-mono)" }}
        />
      </label>

      <p className="text-[13px] text-[var(--color-ink-3)] max-w-prose">
        Each page becomes one file. Needs a `PageRenderer` (OffscreenCanvas + pdfjs-dist
        in the browser) to wire up before rasterisation runs — until then the operation
        surfaces an unsupported-feature toast.
      </p>

      <button
        type="button"
        disabled={busy}
        onClick={onRun}
        className={cn(
          "inline-flex items-center gap-2 px-4 h-10 rounded-[var(--radius-sm)]",
          "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-medium",
          "transition-opacity duration-150",
          busy ? "opacity-60 cursor-progress" : "hover:opacity-90",
        )}
      >
        <ImageDown size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Rendering…" : "Export images"}
      </button>
    </div>
  );
}
