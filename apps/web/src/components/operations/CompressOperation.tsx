"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileArchive } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

const LEVELS = [
  { id: "low", label: "Light", note: "Object streams only — keeps images untouched." },
  { id: "medium", label: "Balanced", note: "Object streams. JPEG re-encoding when wired." },
  { id: "high", label: "Aggressive", note: "Maximum image quality loss for smallest file." },
] as const;

type Level = (typeof LEVELS)[number]["id"];

export function CompressOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [level, setLevel] = useState<Level>("medium");
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    try {
      const out = await worker.compressPdf(staged.bytes, { level });
      const name = staged.name.replace(/\.pdf$/i, "") + ".compressed.pdf";
      await downloadBytes(out.bytes, name);
      const before = staged.size;
      const after = out.bytes.byteLength;
      const saved = before - after;
      const desc =
        saved > 0
          ? `Saved ${formatBytes(saved)} (${Math.round((saved / before) * 100)}%).`
          : out.meta.notes?.[0];
      toast.success("Compress complete.", { description: desc });
    } catch (err) {
      toast.error("Could not compress.", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Level
        </legend>
        <div className="flex flex-col gap-2 max-w-md">
          {LEVELS.map((l) => (
            <label
              key={l.id}
              className={cn(
                "flex items-start gap-3 px-3 py-2 rounded-[var(--radius-sm)] cursor-pointer",
                "border transition-colors duration-150",
                level === l.id
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                  : "border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)]",
              )}
            >
              <input
                type="radio"
                name="level"
                value={l.id}
                checked={level === l.id}
                onChange={() => setLevel(l.id)}
                className="mt-1 accent-[var(--color-accent)]"
              />
              <span>
                <span className="text-[14px] font-medium">{l.label}</span>
                <span className="block text-[12px] text-[var(--color-ink-3)] mt-0.5">{l.note}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="text-[13px] text-[var(--color-ink-3)] max-w-prose">
        JPEG re-encoding via OffscreenCanvas wires up alongside this view in a follow-up
        commit. Until then, compression runs the structural pass only and may not reduce
        size for image-heavy PDFs.
      </p>

      <button
        type="button"
        disabled={busy}
        onClick={onRun}
        className={cn(
          "inline-flex items-center gap-2 px-4 h-10 rounded-[var(--radius-sm)]",
          "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-medium",
          "transition-opacity duration-150",
          busy ? "opacity-60 cursor-progress" : "hover:opacity-90",
        )}
      >
        <FileArchive size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Compressing…" : "Compress"}
      </button>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
