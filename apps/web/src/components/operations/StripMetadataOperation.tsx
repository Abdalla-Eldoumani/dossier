"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eraser } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

export function StripMetadataOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    try {
      const out = await worker.stripMetadata(staged.bytes);
      const name = staged.name.replace(/\.pdf$/i, "") + ".clean.pdf";
      await downloadBytes(out.bytes, name);
      toast.success("Metadata removed.", {
        description: out.meta.notes?.[0],
      });
    } catch (err) {
      toast.error("Could not strip metadata.", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-[14px] text-[var(--color-ink-2)] max-w-prose">
        Clears Title, Author, Subject, Keywords, Creator, and the catalog{"’"}s XMP stream.
        pdf-lib re-emits its own Producer string on save (library identification, not user data).
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
        <Eraser size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Stripping…" : "Strip metadata"}
      </button>
    </div>
  );
}
