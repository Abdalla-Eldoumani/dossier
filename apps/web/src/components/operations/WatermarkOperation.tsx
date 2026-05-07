"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Stamp } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

const POSITIONS = [
  "top-left", "top-center", "top-right",
  "middle-left", "center", "middle-right",
  "bottom-left", "bottom-center", "bottom-right",
] as const;
type Position = (typeof POSITIONS)[number];

export function WatermarkOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [text, setText] = useState("CONFIDENTIAL");
  const [size, setSize] = useState(48);
  const [opacity, setOpacity] = useState(0.2);
  const [rotation, setRotation] = useState(-30);
  const [position, setPosition] = useState<Position>("center");
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    try {
      const out = await worker.addWatermark(staged.bytes, {
        kind: "text",
        text,
        size,
        opacity,
        rotation,
        position,
      });
      const name = staged.name.replace(/\.pdf$/i, "") + ".watermarked.pdf";
      await downloadBytes(out.bytes, name);
      toast.success("Watermark applied.");
    } catch (err) {
      toast.error("Could not apply watermark.", {
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
          Text
        </span>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={cn(
            "w-full px-3 h-10 rounded-[var(--radius-sm)]",
            "border border-[var(--color-rule)] bg-[var(--color-paper)]",
            "text-[14px]",
            "focus:outline-none focus:border-[var(--color-accent)]",
          )}
        />
      </label>

      <div className="grid grid-cols-3 gap-3 max-w-md">
        <NumberField label="Size" value={size} onChange={setSize} min={8} max={256} step={1} />
        <NumberField label="Opacity" value={opacity} onChange={setOpacity} min={0.05} max={1} step={0.05} />
        <NumberField label="Rotation" value={rotation} onChange={setRotation} min={-180} max={180} step={5} />
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
              {p.split("-").map((s) => s[0]).join("").toUpperCase()}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={busy || !text.trim()}
        className={cn(
          "inline-flex items-center gap-2 px-4 h-10 rounded-[var(--radius-sm)]",
          "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-medium",
          "transition-opacity duration-150",
          busy || !text.trim() ? "opacity-60 cursor-not-allowed" : "hover:opacity-90",
        )}
      >
        <Stamp size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Stamping…" : "Add watermark"}
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
