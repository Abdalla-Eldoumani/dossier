"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Layers } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

export function FlattenFormOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    try {
      const out = await worker.flattenForm(staged.bytes);
      const name = staged.name.replace(/\.pdf$/i, "") + ".flattened.pdf";
      await downloadBytes(out.bytes, name);
      toast.success("Form flattened.", { description: out.meta.notes?.[0] });
    } catch (err) {
      toast.error("Could not flatten form.", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-[14px] text-[var(--color-ink-2)] max-w-prose">
        Bakes interactive form fields into the page content so the values can no longer
        be edited. Use this when sending a filled form to a recipient who shouldn{"’"}t
        be able to change the entries.
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
        {busy ? "Flattening…" : "Flatten form"}
      </button>
    </div>
  );
}
