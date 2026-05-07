"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { parsePageIndices, PageIndicesError } from "@/lib/pageIndices";
import { cn } from "@/lib/cn";

async function isPdfFile(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  const magic = [0x25, 0x50, 0x44, 0x46, 0x2d];
  for (let i = 0; i <= head.length - magic.length; i++) {
    let ok = true;
    for (let j = 0; j < magic.length; j++) {
      if (head[i + j] !== magic[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

export function InsertFromPdfOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const fileInput = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [atIndex, setAtIndex] = useState(1);
  const [sourcePages, setSourcePages] = useState("");
  const [busy, setBusy] = useState(false);

  const onPick = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!(await isPdfFile(file))) {
      toast.error("That doesn’t look like a PDF.");
      return;
    }
    setSource({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
  };

  const onRun = async () => {
    if (!staged || !source || !worker) return;
    setBusy(true);
    try {
      const info = await worker.getInfo(staged.bytes);
      const zeroBased = Math.max(0, Math.min(info.pageCount, atIndex - 1));
      let indices: number[] | undefined;
      if (sourcePages.trim()) {
        const sourceInfo = await worker.getInfo(source.bytes);
        indices = parsePageIndices(sourcePages, sourceInfo.pageCount);
      }
      const out = await worker.insertPagesFromPdf(
        staged.bytes,
        source.bytes,
        zeroBased,
        indices,
      );
      const name = staged.name.replace(/\.pdf$/i, "") + ".combined.pdf";
      await downloadBytes(out.bytes, name);
      toast.success(`Inserted at position ${zeroBased + 1}.`);
    } catch (err) {
      if (err instanceof PageIndicesError) {
        toast.error("Check the source page list.", { description: err.message });
      } else {
        toast.error("Could not insert.", {
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
      <div>
        <span className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Source PDF
        </span>
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => {
            void onPick(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className={cn(
            "inline-flex items-center gap-2 px-4 h-10 rounded-[var(--radius-sm)]",
            "border border-[var(--color-rule)] bg-[var(--color-paper)]",
            "hover:bg-[var(--color-paper-3)] transition-colors duration-150",
          )}
        >
          {source ? `Selected: ${source.name}` : "Choose a PDF"}
        </button>
      </div>

      <label className="block w-32">
        <span className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Insert at
        </span>
        <input
          type="number"
          min={1}
          value={atIndex}
          onChange={(e) => setAtIndex(Math.max(1, Number(e.target.value) || 1))}
          className={cn(
            "w-full px-3 h-10 rounded-[var(--radius-sm)]",
            "border border-[var(--color-rule)] bg-[var(--color-paper)]",
            "text-[14px]",
            "focus:outline-none focus:border-[var(--color-accent)]",
          )}
          style={{ fontFamily: "var(--font-mono)" }}
        />
      </label>

      <label className="block max-w-md">
        <span className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Source pages (optional)
        </span>
        <input
          type="text"
          value={sourcePages}
          onChange={(e) => setSourcePages(e.target.value)}
          placeholder="Leave blank for all pages — e.g. 1-3"
          className={cn(
            "w-full px-3 h-10 rounded-[var(--radius-sm)]",
            "border border-[var(--color-rule)] bg-[var(--color-paper)]",
            "text-[14px]",
            "focus:outline-none focus:border-[var(--color-accent)]",
          )}
          style={{ fontFamily: "var(--font-mono)" }}
        />
      </label>

      <button
        type="submit"
        disabled={busy || !source}
        className={cn(
          "inline-flex items-center gap-2 px-4 h-10 rounded-[var(--radius-sm)]",
          "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-medium",
          "transition-opacity duration-150",
          busy || !source ? "opacity-60 cursor-not-allowed" : "hover:opacity-90",
        )}
      >
        <Plus size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Inserting…" : "Insert pages"}
      </button>
    </form>
  );
}
