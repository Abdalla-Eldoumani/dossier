"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Type } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

export function SubsetFontsOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    try {
      const out = await worker.subsetFonts(staged.bytes);
      const name = staged.name.replace(/\.pdf$/i, "") + ".subset.pdf";
      await downloadBytes(out.bytes, name);
      toast.success("Fonts subset.", { description: out.meta.notes?.[0] });
    } catch (err) {
      toast.error("Could not subset fonts.", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-[14px] text-[var(--color-ink-2)] max-w-prose">
        Strips unused glyphs from embedded fonts to shrink the file. Real subsetting
        needs TrueType/CFF table surgery, so a `FontSubsetter` provider must be wired —
        until then the operation surfaces an unsupported-feature toast.
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
        <Type size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Subsetting…" : "Subset fonts"}
      </button>
    </div>
  );
}
