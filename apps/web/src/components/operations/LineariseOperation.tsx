"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Wand } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

export function LineariseOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    try {
      const out = await worker.linearizePdf(staged.bytes);
      const name = staged.name.replace(/\.pdf$/i, "") + ".linear.pdf";
      await downloadBytes(out.bytes, name);
      toast.success("Linearised.", { description: out.meta.notes?.[0] });
    } catch (err) {
      toast.error("Could not linearise.", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-[14px] text-[var(--color-ink-2)] max-w-prose">
        Rewrites the PDF for Fast Web View — pages download progressively in a viewer.
        Needs an injected `PdfLinearizer` (PDFium-WASM) to run; until that wires up the
        operation will surface an unsupported-feature toast.
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
        <Wand size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Linearising…" : "Linearise"}
      </button>
    </div>
  );
}
