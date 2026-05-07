"use client";

import { useState } from "react";
import { toast } from "sonner";
import { EyeOff, AlertTriangle } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

export function RedactOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [page, setPage] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [width, setWidth] = useState(595);
  const [height, setHeight] = useState(50);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!staged || !worker || !confirmed) return;
    setBusy(true);
    try {
      const out = await worker.redactRegion(
        staged.bytes,
        page - 1,
        { x, y, width, height },
      );
      const name = staged.name.replace(/\.pdf$/i, "") + ".redacted.pdf";
      await downloadBytes(out.bytes, name);
      toast.success("Region redacted.", {
        description: out.meta.notes?.[0] ?? "Content stream rewritten.",
      });
      setConfirmed(false);
    } catch (err) {
      toast.error("Could not redact.", {
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
      className="space-y-6"
    >
      <div
        className={cn(
          "rounded-[var(--radius)] border-2 border-[var(--color-warning)]",
          "bg-[var(--color-paper-2)] px-4 py-3",
          "flex items-start gap-3",
        )}
      >
        <AlertTriangle
          size={20}
          strokeWidth={1.5}
          aria-hidden
          className="text-[var(--color-warning)] shrink-0 mt-0.5"
        />
        <div className="text-[13px] text-[var(--color-ink-2)]">
          <strong className="text-[var(--color-ink)]">Redaction is permanent.</strong>{" "}
          Content inside the region is rewritten out of the page stream, not just covered
          with a black box. Verify the redacted output before sharing — text inside form
          XObjects (the <code style={{ fontFamily: "var(--font-mono)" }}>Do</code>{" "}
          operator) is not yet reached, and content outside any{" "}
          <code style={{ fontFamily: "var(--font-mono)" }}>q…Q</code> graphics block stays
          in place.
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-md">
        <NumField label="Page" value={page} onChange={setPage} min={1} />
        <NumField label="x (pt)" value={x} onChange={setX} />
        <NumField label="y (pt)" value={y} onChange={setY} />
        <NumField label="width" value={width} onChange={setWidth} />
        <NumField label="height" value={height} onChange={setHeight} />
      </div>

      <label className="flex items-start gap-2 text-[13px] text-[var(--color-ink-2)] cursor-pointer max-w-prose">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 accent-[var(--color-accent)]"
        />
        <span>
          I understand redaction is permanent and will verify the output before sharing.
        </span>
      </label>

      <button
        type="submit"
        disabled={busy || !confirmed}
        className={cn(
          "inline-flex items-center gap-2 px-4 h-10 rounded-[var(--radius-sm)]",
          "bg-[var(--color-danger)] text-[var(--color-accent-ink)] font-medium",
          "transition-opacity duration-150",
          busy || !confirmed ? "opacity-60 cursor-not-allowed" : "hover:opacity-90",
        )}
      >
        <EyeOff size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Redacting…" : "Redact region"}
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
