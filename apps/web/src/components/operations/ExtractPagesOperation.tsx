"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { parsePageIndices, PageIndicesError } from "@/lib/pageIndices";
import { cn } from "@/lib/cn";

export function ExtractPagesOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    try {
      const info = await worker.getInfo(staged.bytes);
      const indices = parsePageIndices(input, info.pageCount);
      const out = await worker.extractPages(staged.bytes, indices);
      const name = staged.name.replace(/\.pdf$/i, "") + ".extract.pdf";
      await downloadBytes(out.bytes, name);
      toast.success(`Extracted ${indices.length} page${indices.length === 1 ? "" : "s"}.`);
    } catch (err) {
      if (err instanceof PageIndicesError) {
        toast.error("Check the page list.", { description: err.message });
      } else {
        toast.error("Could not extract pages.", {
          description: err instanceof Error ? err.message : String(err),
        });
      }
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
      <label className="block">
        <span className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Pages to extract
        </span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. 1, 3, 5-9"
          autoComplete="off"
          spellCheck={false}
          className={cn(
            "w-full max-w-sm px-3 h-10 rounded-[var(--radius-sm)]",
            "border border-[var(--color-rule)] bg-[var(--color-paper)]",
            "text-[14px] text-[var(--color-ink)]",
            "focus:outline-none focus:border-[var(--color-accent)]",
          )}
          style={{ fontFamily: "var(--font-mono)" }}
        />
      </label>

      <p className="text-[13px] text-[var(--color-ink-3)] max-w-prose">
        Pulls the listed pages into a new PDF. Order in the output follows numeric order
        of the indices, not the order you typed them.
      </p>

      <button
        type="submit"
        disabled={busy || !input.trim()}
        className={cn(
          "inline-flex items-center gap-2 px-4 h-10 rounded-[var(--radius-sm)]",
          "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-medium",
          "transition-opacity duration-150",
          busy || !input.trim() ? "opacity-60 cursor-not-allowed" : "hover:opacity-90",
        )}
      >
        <Plus size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Extracting…" : "Extract pages"}
      </button>
    </form>
  );
}
