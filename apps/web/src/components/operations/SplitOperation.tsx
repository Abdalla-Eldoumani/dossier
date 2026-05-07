"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Scissors } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

const MODES = [
  { id: "count", label: "Every N pages" },
  { id: "ranges", label: "By ranges" },
  { id: "individual", label: "One per page" },
] as const;
type Mode = (typeof MODES)[number]["id"];

export function SplitOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [mode, setMode] = useState<Mode>("count");
  const [count, setCount] = useState(1);
  const [ranges, setRanges] = useState("1-3, 4-6");
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    try {
      const base = staged.name.replace(/\.pdf$/i, "");
      let outputs: Uint8Array[] = [];
      if (mode === "count") {
        outputs = await worker.splitByPageCount(staged.bytes, count);
      } else if (mode === "individual") {
        outputs = await worker.splitByPageCount(staged.bytes, 1);
      } else {
        const parsed = parseRanges(ranges);
        const result = await worker.splitByRanges(staged.bytes, parsed);
        outputs = result;
      }
      for (let i = 0; i < outputs.length; i++) {
        const part = outputs[i];
        if (!part) continue;
        await downloadBytes(part, `${base}.part-${String(i + 1).padStart(2, "0")}.pdf`);
      }
      toast.success(`Split into ${outputs.length} files.`);
    } catch (err) {
      toast.error("Could not split.", {
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
      <fieldset>
        <legend className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Split mode
        </legend>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={cn(
                "inline-flex items-center px-3 h-9 rounded-[var(--radius-sm)] text-[13px]",
                "border transition-colors duration-150",
                mode === m.id
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                  : "border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)]",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </fieldset>

      {mode === "count" && (
        <label className="block w-32">
          <span className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
            Pages each
          </span>
          <input
            type="number"
            min={1}
            value={count}
            onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
            className={cn(
              "w-full px-3 h-10 rounded-[var(--radius-sm)]",
              "border border-[var(--color-rule)] bg-[var(--color-paper)]",
              "text-[14px]",
              "focus:outline-none focus:border-[var(--color-accent)]",
            )}
            style={{ fontFamily: "var(--font-mono)" }}
          />
        </label>
      )}

      {mode === "ranges" && (
        <label className="block max-w-md">
          <span className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
            Ranges (one per output)
          </span>
          <input
            type="text"
            value={ranges}
            onChange={(e) => setRanges(e.target.value)}
            placeholder="e.g. 1-3, 4-6, 7-10"
            className={cn(
              "w-full px-3 h-10 rounded-[var(--radius-sm)]",
              "border border-[var(--color-rule)] bg-[var(--color-paper)]",
              "text-[14px]",
              "focus:outline-none focus:border-[var(--color-accent)]",
            )}
            style={{ fontFamily: "var(--font-mono)" }}
          />
        </label>
      )}

      {mode === "individual" && (
        <p className="text-[13px] text-[var(--color-ink-3)] max-w-prose">
          Each page is exported to its own PDF file.
        </p>
      )}

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
        <Scissors size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Splitting…" : "Split"}
      </button>
    </form>
  );
}

function parseRanges(input: string): { from: number; to: number }[] {
  const parts = input.split(",").map((s) => s.trim()).filter(Boolean);
  const out: { from: number; to: number }[] = [];
  for (const p of parts) {
    const dash = p.indexOf("-");
    if (dash === -1) {
      const n = Number(p);
      if (!Number.isInteger(n) || n < 1) throw new Error(`"${p}" is not a valid range.`);
      out.push({ from: n, to: n });
      continue;
    }
    const from = Number(p.slice(0, dash).trim());
    const to = Number(p.slice(dash + 1).trim());
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || from > to) {
      throw new Error(`"${p}" is not a valid range.`);
    }
    out.push({ from, to });
  }
  if (out.length === 0) throw new Error("Enter at least one range.");
  return out;
}
