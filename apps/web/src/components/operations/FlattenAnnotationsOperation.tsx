"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Layers } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

export function FlattenAnnotationsOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    try {
      const out = await worker.flattenAnnotations(staged.bytes);
      const name = staged.name.replace(/\.pdf$/i, "") + ".flat.pdf";
      await downloadBytes(out.bytes, name);
      toast.success("Annotations flattened.", { description: out.meta.notes?.[0] });
    } catch (err) {
      toast.error("Could not flatten annotations.", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-[14px] text-[var(--color-ink-2)] max-w-prose">
        Renders text annotations and highlights into the page itself, then drops them from
        the annotation array. Other annotation kinds (links, etc.) are left in place.
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
        <Layers size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Flattening…" : "Flatten annotations"}
      </button>
    </div>
  );
}
