"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Stamp as StampIcon } from "lucide-react";
import { BUILTIN_STAMPS, type BuiltinStampName } from "@dossier/core";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

export function StampOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [page, setPage] = useState(1);
  const [x, setX] = useState(72);
  const [y, setY] = useState(720);
  const [stampName, setStampName] = useState<BuiltinStampName>(BUILTIN_STAMPS[0]!);
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    try {
      const out = await worker.addStamp(
        staged.bytes,
        page - 1,
        { x, y },
        { kind: "builtin", name: stampName },
        {},
      );
      const name = staged.name.replace(/\.pdf$/i, "") + ".stamped.pdf";
      await downloadBytes(out.bytes, name);
      toast.success("Stamp applied.");
    } catch (err) {
      toast.error("Could not apply stamp.", {
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
          Stamp
        </legend>
        <div className="flex flex-wrap gap-2 max-w-md">
          {BUILTIN_STAMPS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStampName(s)}
              className={cn(
                "inline-flex items-center px-3 h-9 rounded-[var(--radius-sm)] text-[13px]",
                "border transition-colors duration-150",
                stampName === s
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                  : "border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)]",
              )}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {s}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-3 gap-3 max-w-md">
        <NumField label="Page" value={page} onChange={setPage} min={1} />
        <NumField label="x (pt)" value={x} onChange={setX} />
        <NumField label="y (pt)" value={y} onChange={setY} />
      </div>

      <p className="text-[13px] text-[var(--color-ink-3)] max-w-prose">
        Stamps draw directly to the page content, so they survive a flatten pass.
        Custom image stamps via file picker are a follow-up.
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
        <StampIcon size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Stamping…" : "Apply stamp"}
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
