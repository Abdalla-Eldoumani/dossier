"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Maximize } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { parsePageIndices, PageIndicesError } from "@/lib/pageIndices";
import { cn } from "@/lib/cn";

const PRESETS: Record<string, { width: number; height: number }> = {
  A4: { width: 595, height: 842 },
  Letter: { width: 612, height: 792 },
  Legal: { width: 612, height: 1008 },
  A3: { width: 842, height: 1191 },
  A5: { width: 420, height: 595 },
};

type PresetName = "A4" | "Letter" | "Legal" | "A3" | "A5";
type Preset = PresetName | "custom";

export function ResizePagesOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [pages, setPages] = useState("");
  const [preset, setPreset] = useState<Preset>("A4");
  const [width, setWidth] = useState<number>(595);
  const [height, setHeight] = useState<number>(842);
  const [scaleContent, setScaleContent] = useState(true);
  const [busy, setBusy] = useState(false);

  const pickPreset = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") {
      const dims = PRESETS[p];
      if (dims) {
        setWidth(dims.width);
        setHeight(dims.height);
      }
    }
  };

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    try {
      const info = await worker.getInfo(staged.bytes);
      const indices = parsePageIndices(pages, info.pageCount);
      const size =
        preset === "custom"
          ? { custom: { width, height } }
          : { name: preset };
      const out = await worker.resizePages(staged.bytes, indices, size, scaleContent);
      const name = staged.name.replace(/\.pdf$/i, "") + ".resized.pdf";
      await downloadBytes(out.bytes, name);
      toast.success(`Resized ${indices.length} page${indices.length === 1 ? "" : "s"}.`);
    } catch (err) {
      if (err instanceof PageIndicesError) {
        toast.error("Check the page list.", { description: err.message });
      } else {
        toast.error("Could not resize.", {
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
          Pages to resize
        </span>
        <input
          type="text"
          value={pages}
          onChange={(e) => setPages(e.target.value)}
          placeholder="e.g. 1, 3, 5-9"
          autoComplete="off"
          spellCheck={false}
          className={cn(
            "w-full max-w-sm px-3 h-10 rounded-[var(--radius-sm)]",
            "border border-[var(--color-rule)] bg-[var(--color-paper)]",
            "text-[14px]",
            "focus:outline-none focus:border-[var(--color-accent)]",
          )}
          style={{ fontFamily: "var(--font-mono)" }}
        />
      </label>

      <fieldset>
        <legend className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Size
        </legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PRESETS) as PresetName[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => pickPreset(k)}
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
          <button
            type="button"
            onClick={() => pickPreset("custom")}
            className={cn(
              "inline-flex items-center px-3 h-9 rounded-[var(--radius-sm)] text-[13px]",
              "border transition-colors duration-150",
              preset === "custom"
                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                : "border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)]",
            )}
          >
            Custom
          </button>
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3 max-w-xs">
        <NumField label="Width (pt)" value={width} onChange={(n) => { setWidth(n); setPreset("custom"); }} />
        <NumField label="Height (pt)" value={height} onChange={(n) => { setHeight(n); setPreset("custom"); }} />
      </div>

      <label className="inline-flex items-center gap-2 text-[13px] text-[var(--color-ink-2)] cursor-pointer">
        <input
          type="checkbox"
          checked={scaleContent}
          onChange={(e) => setScaleContent(e.target.checked)}
          className="accent-[var(--color-accent)]"
        />
        Scale page content to fit
      </label>

      <button
        type="submit"
        disabled={busy || !pages.trim()}
        className={cn(
          "inline-flex items-center gap-2 px-4 h-10 rounded-[var(--radius-sm)]",
          "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-medium",
          "transition-opacity duration-150",
          busy || !pages.trim() ? "opacity-60 cursor-not-allowed" : "hover:opacity-90",
        )}
      >
        <Maximize size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Resizing…" : "Resize pages"}
      </button>
    </form>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
        {label}
      </span>
      <input
        type="number"
        value={value}
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
