"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ImageDown } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

export function DownsampleImagesOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [dpi, setDpi] = useState(150);
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    try {
      const out = await worker.downsampleImages(staged.bytes, dpi);
      const name = staged.name.replace(/\.pdf$/i, "") + ".downsampled.pdf";
      await downloadBytes(out.bytes, name);
      toast.success("Images downsampled.", { description: out.meta.notes?.[0] });
    } catch (err) {
      toast.error("Could not downsample.", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onRun();
      }}
      className="space-y-4"
    >
      <label className="block">
        <span className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Target DPI
        </span>
        <input
          type="number"
          min={36}
          max={600}
          step={1}
          value={dpi}
          onChange={(e) => setDpi(Math.max(36, Math.min(600, Number(e.target.value) || 0)))}
          className={cn(
            "w-32 px-3 h-10 rounded-[var(--radius-sm)]",
            "border border-[var(--color-rule)] bg-[var(--color-paper)]",
            "text-[14px] text-[var(--color-ink)]",
            "focus:outline-none focus:border-[var(--color-accent)]",
          )}
          style={{ fontFamily: "var(--font-mono)" }}
        />
      </label>

      <p className="text-[13px] text-[var(--color-ink-3)] max-w-prose">
        72 DPI is screen, 150 is good for proofs, 300 is print-quality. Needs an
        `ImageDownsampler` (OffscreenCanvas in browser, sharp on Node) to wire up
        before the operation can re-encode bytes — until then it surfaces an
        unsupported-feature toast.
      </p>

      <button
        type="submit"
        disabled={busy}
        className={cn(
          "inline-flex items-center gap-2 px-4 h-10 rounded-[var(--radius-sm)]",
          "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-medium",
          "transition-opacity duration-150",
          busy ? "opacity-60 cursor-progress" : "hover:opacity-90",
        )}
      >
        <ImageDown size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Downsampling…" : "Downsample images"}
      </button>
    </form>
  );
}
