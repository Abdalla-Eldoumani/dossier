"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Highlighter } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

const COLORS = [
  { id: "yellow", label: "Yellow", rgb: [1, 0.95, 0] as [number, number, number] },
  { id: "green", label: "Green", rgb: [0.6, 1, 0.6] as [number, number, number] },
  { id: "pink", label: "Pink", rgb: [1, 0.7, 0.85] as [number, number, number] },
  { id: "blue", label: "Blue", rgb: [0.7, 0.85, 1] as [number, number, number] },
];

export function HighlightOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [page, setPage] = useState(1);
  const [x, setX] = useState(72);
  const [y, setY] = useState(720);
  const [width, setWidth] = useState(200);
  const [height, setHeight] = useState(14);
  const [colorId, setColorId] = useState(COLORS[0]!.id);
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    try {
      const color = COLORS.find((c) => c.id === colorId)?.rgb;
      const out = await worker.addHighlight(
        staged.bytes,
        page - 1,
        { x, y, width, height },
        color ? { color } : {},
      );
      const name = staged.name.replace(/\.pdf$/i, "") + ".highlighted.pdf";
      await downloadBytes(out.bytes, name);
      toast.success("Highlight added.");
    } catch (err) {
      toast.error("Could not highlight.", {
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
      <div className="grid grid-cols-3 gap-3 max-w-md">
        <NumField label="Page" value={page} onChange={setPage} min={1} />
        <NumField label="x (pt)" value={x} onChange={setX} />
        <NumField label="y (pt)" value={y} onChange={setY} />
        <NumField label="width" value={width} onChange={setWidth} />
        <NumField label="height" value={height} onChange={setHeight} />
      </div>

      <fieldset>
        <legend className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Colour
        </legend>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColorId(c.id)}
              aria-label={c.label}
              style={{
                background: `rgb(${c.rgb[0] * 255}, ${c.rgb[1] * 255}, ${c.rgb[2] * 255})`,
              }}
              className={cn(
                "w-9 h-9 rounded-[var(--radius-sm)] border-2 transition-all duration-150",
                colorId === c.id
                  ? "border-[var(--color-ink)] scale-105"
                  : "border-[var(--color-rule)]",
              )}
            />
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
        <Highlighter size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Highlighting…" : "Add highlight"}
      </button>
    </form>
  );
}

function NumField({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
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
