"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RotateCw } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { parsePageIndices, PageIndicesError } from "@/lib/pageIndices";
import { cn } from "@/lib/cn";

const DEGREE_OPTIONS = [90, 180, 270, -90] as const;
type Degrees = (typeof DEGREE_OPTIONS)[number];

export function RotatePagesOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [input, setInput] = useState("");
  const [degrees, setDegrees] = useState<Degrees>(90);
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    try {
      const info = await worker.getInfo(staged.bytes);
      const indices = parsePageIndices(input, info.pageCount);
      const out = await worker.rotatePages(staged.bytes, indices, degrees);
      const name = staged.name.replace(/\.pdf$/i, "") + ".rotated.pdf";
      await downloadBytes(out.bytes, name);
      toast.success(`Rotated ${indices.length} page${indices.length === 1 ? "" : "s"}.`);
    } catch (err) {
      if (err instanceof PageIndicesError) {
        toast.error("Check the page list.", { description: err.message });
      } else {
        toast.error("Could not rotate pages.", {
          description: err instanceof Error ? err.message : String(err),
        });
      }
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
          Pages to rotate
        </span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. 1, 3, 5-9"
          autoComplete="off"
          spellCheck={false}
          className={cn(
            "w-full max-w-sm px-3 h-10 rounded-[var(--radius-sm)]",
            "border border-[var(--color-rule)] bg-[var(--color-paper)]",
            "text-[14px] text-[var(--color-ink)]",
            "focus:outline-none focus:border-[var(--color-accent)]",
          )}
          style={{ fontFamily: "var(--font-mono)" }}
        />
      </label>

      <fieldset>
        <legend className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Direction
        </legend>
        <div className="flex flex-wrap gap-2">
          {DEGREE_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDegrees(d)}
              className={cn(
                "inline-flex items-center px-3 h-9 rounded-[var(--radius-sm)] text-[13px]",
                "border transition-colors duration-150",
                degrees === d
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                  : "border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)]",
              )}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {d > 0 ? `+${d}°` : `${d}°`}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={busy || !input.trim()}
        className={cn(
          "inline-flex items-center gap-2 px-4 h-10 rounded-[var(--radius-sm)]",
          "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-medium",
          "transition-opacity duration-150",
          busy || !input.trim() ? "opacity-60 cursor-not-allowed" : "hover:opacity-90",
        )}
      >
        <RotateCw size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Rotating…" : "Rotate pages"}
      </button>
    </form>
  );
}
