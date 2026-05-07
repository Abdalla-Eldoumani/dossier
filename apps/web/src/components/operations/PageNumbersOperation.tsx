"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Hash } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

const POSITIONS = [
  "top-left", "top-center", "top-right",
  "bottom-left", "bottom-center", "bottom-right",
] as const;
type Position = (typeof POSITIONS)[number];

export function PageNumbersOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [format, setFormat] = useState("Page {n} of {total}");
  const [size, setSize] = useState(11);
  const [position, setPosition] = useState<Position>("bottom-right");
  const [skipFirst, setSkipFirst] = useState(0);
  const [startAt, setStartAt] = useState(1);
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    try {
      const out = await worker.addPageNumbers(staged.bytes, {
        format,
        size,
        position,
        skipFirst,
        startAt,
      });
      const name = staged.name.replace(/\.pdf$/i, "") + ".numbered.pdf";
      await downloadBytes(out.bytes, name);
      toast.success("Page numbers added.");
    } catch (err) {
      toast.error("Could not add page numbers.", {
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
      <label className="block max-w-md">
        <span className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Format
        </span>
        <input
          type="text"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className={cn(
            "w-full px-3 h-10 rounded-[var(--radius-sm)]",
            "border border-[var(--color-rule)] bg-[var(--color-paper)]",
            "text-[14px]",
            "focus:outline-none focus:border-[var(--color-accent)]",
          )}
          style={{ fontFamily: "var(--font-mono)" }}
        />
        <span className="block mt-1 text-[12px] text-[var(--color-ink-3)]">
          <code style={{ fontFamily: "var(--font-mono)" }}>{"{n}"}</code> is the page
          number, <code style={{ fontFamily: "var(--font-mono)" }}>{"{total}"}</code>{" "}
          is the page count.
        </span>
      </label>

      <div className="grid grid-cols-3 gap-3 max-w-md">
        <NumberField label="Size" value={size} onChange={setSize} min={6} max={48} step={1} />
        <NumberField label="Skip first" value={skipFirst} onChange={setSkipFirst} min={0} max={50} step={1} />
        <NumberField label="Start at" value={startAt} onChange={setStartAt} min={1} max={9999} step={1} />
      </div>

      <fieldset>
        <legend className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Position
        </legend>
        <div className="grid grid-cols-3 gap-2 max-w-[300px]">
          {POSITIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPosition(p)}
              className={cn(
                "h-10 rounded-[var(--radius-sm)] text-[11px] uppercase tracking-[0.06em]",
                "border transition-colors duration-150",
                position === p
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                  : "border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)]",
              )}
            >
              {p.replace("-", " / ")}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={busy || !format.trim()}
        className={cn(
          "inline-flex items-center gap-2 px-4 h-10 rounded-[var(--radius-sm)]",
          "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-medium",
          "transition-opacity duration-150",
          busy || !format.trim() ? "opacity-60 cursor-not-allowed" : "hover:opacity-90",
        )}
      >
        <Hash size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Numbering…" : "Add page numbers"}
      </button>
    </form>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
        {label}
      </span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "w-full px-3 h-10 rounded-[var(--radius-sm)]",
          "border border-[var(--color-rule)] bg-[var(--color-paper)]",
          "text-[14px]",
          "focus:outline-none focus:border-[var(--color-accent)]",
        )}
        style={{ fontFamily: "var(--font-mono)" }}
      />
    </label>
  );
}
