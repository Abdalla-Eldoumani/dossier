"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

const PRESETS = ["A4", "Letter", "Legal"] as const;
type Preset = (typeof PRESETS)[number];

export function InsertBlankOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [atIndex, setAtIndex] = useState(1);
  const [preset, setPreset] = useState<Preset>("A4");
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    try {
      const info = await worker.getInfo(staged.bytes);
      const zeroBased = Math.max(0, Math.min(info.pageCount, atIndex - 1));
      const out = await worker.insertBlankPage(staged.bytes, zeroBased, { name: preset });
      const name = staged.name.replace(/\.pdf$/i, "") + ".inserted.pdf";
      await downloadBytes(out.bytes, name);
      toast.success(`Blank page inserted at position ${zeroBased + 1}.`);
    } catch (err) {
      toast.error("Could not insert page.", {
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
      <label className="block w-32">
        <span className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Insert at
        </span>
        <input
          type="number"
          min={1}
          value={atIndex}
          onChange={(e) => setAtIndex(Math.max(1, Number(e.target.value) || 1))}
          className={cn(
            "w-full px-3 h-10 rounded-[var(--radius-sm)]",
            "border border-[var(--color-rule)] bg-[var(--color-paper)]",
            "text-[14px]",
            "focus:outline-none focus:border-[var(--color-accent)]",
          )}
          style={{ fontFamily: "var(--font-mono)" }}
        />
      </label>

      <p className="text-[13px] text-[var(--color-ink-3)]">
        One-based position. Use 1 to prepend, the page count + 1 to append.
      </p>

      <fieldset>
        <legend className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Page size
        </legend>
        <div className="flex gap-2">
          {PRESETS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setPreset(k)}
              className={cn(
                "inline-flex items-center px-3 h-9 rounded-[var(--radius-sm)] text-[13px]",
                "border transition-colors duration-150",
                preset === k
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                  : "border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)]",
              )}
            >
              {k}
            </button>
          ))}
        </div>
      </fieldset>

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
        <Plus size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Inserting…" : "Insert blank page"}
      </button>
    </form>
  );
}
