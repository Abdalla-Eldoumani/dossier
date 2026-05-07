"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Wrench } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

export function RepairOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    try {
      const out = await worker.repair(staged.bytes);
      const name = staged.name.replace(/\.pdf$/i, "") + ".repaired.pdf";
      await downloadBytes(out.bytes, name);
      toast.success("Repair attempt complete.", { description: out.meta.notes?.[0] });
    } catch (err) {
      toast.error("Could not repair.", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-[14px] text-[var(--color-ink-2)] max-w-prose">
        Two-stage best-effort recovery. First pass uses pdf-lib’s lenient parser plus a
        re-save with object streams — fixes broken xref tables and dangling objects.
        Deeper recovery needs a `PdfRepairer` (PDFium-WASM, mupdf) to wire up. Without
        one, files that pdf-lib can’t parse will surface a `CORRUPT_PDF` toast.
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
        <Wrench size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Repairing…" : "Repair"}
      </button>
    </div>
  );
}
