"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PenLine } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

export function AddTextAnnotationOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [page, setPage] = useState(1);
  const [x, setX] = useState(72);
  const [y, setY] = useState(720);
  const [text, setText] = useState("Note");
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    try {
      const out = await worker.addTextAnnotation(staged.bytes, page - 1, { x, y }, text, {});
      const name = staged.name.replace(/\.pdf$/i, "") + ".annotated.pdf";
      await downloadBytes(out.bytes, name);
      toast.success("Note added.");
    } catch (err) {
      toast.error("Could not add note.", {
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
      <label className="block max-w-xl">
        <span className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Note text
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className={cn(
            "w-full px-3 py-2 rounded-[var(--radius-sm)]",
            "border border-[var(--color-rule)] bg-[var(--color-paper)]",
            "text-[14px]",
            "focus:outline-none focus:border-[var(--color-accent)]",
          )}
          style={{ fontFamily: "var(--font-ui)" }}
        />
      </label>

      <div className="grid grid-cols-3 gap-3 max-w-md">
        <NumField label="Page" value={page} onChange={setPage} min={1} />
        <NumField label="x (pt)" value={x} onChange={setX} />
        <NumField label="y (pt)" value={y} onChange={setY} />
      </div>

      <p className="text-[13px] text-[var(--color-ink-3)] max-w-prose">
        x/y are PDF points from the bottom-left of the page. A visual placement picker
        is a follow-up enhancement.
      </p>

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
        <PenLine size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Adding…" : "Add note"}
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
