"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Crop } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { parsePageIndices, PageIndicesError } from "@/lib/pageIndices";
import { cn } from "@/lib/cn";

export function CropPagesOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [pages, setPages] = useState("");
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [width, setWidth] = useState(595);
  const [height, setHeight] = useState(842);
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    try {
      const info = await worker.getInfo(staged.bytes);
      const indices = parsePageIndices(pages, info.pageCount);
      const out = await worker.cropPages(staged.bytes, indices, { x, y, width, height });
      const name = staged.name.replace(/\.pdf$/i, "") + ".cropped.pdf";
      await downloadBytes(out.bytes, name);
      toast.success(`Cropped ${indices.length} page${indices.length === 1 ? "" : "s"}.`);
    } catch (err) {
      if (err instanceof PageIndicesError) {
        toast.error("Check the page list.", { description: err.message });
      } else {
        toast.error("Could not crop.", {
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
          Pages to crop
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
          Region (points, top-left origin)
        </legend>
        <div className="grid grid-cols-4 gap-3 max-w-md">
          <NumField label="x" value={x} onChange={setX} />
          <NumField label="y" value={y} onChange={setY} />
          <NumField label="width" value={width} onChange={setWidth} />
          <NumField label="height" value={height} onChange={setHeight} />
        </div>
      </fieldset>

      <p className="text-[13px] text-[var(--color-ink-3)] max-w-prose">
        Region in PDF points (1 inch = 72 points). Default values match A4 in portrait
        — adjust per your document. A visual region picker is a follow-up enhancement.
      </p>

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
        <Crop size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Cropping…" : "Crop pages"}
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
      <span className="block text-[11px] text-[var(--color-ink-3)] mb-1" style={{ fontFamily: "var(--font-mono)" }}>
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
