"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Files, Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

interface PdfEntry {
  name: string;
  bytes: Uint8Array;
}

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

export function MergeOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const fileInput = useRef<HTMLInputElement>(null);
  const [extras, setExtras] = useState<PdfEntry[]>([]);
  const [busy, setBusy] = useState(false);

  const queue: PdfEntry[] = staged
    ? [{ name: staged.name, bytes: staged.bytes }, ...extras]
    : extras;

  const onPickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next: PdfEntry[] = [];
    for (const f of Array.from(files)) {
      if (!(await isPdfFile(f))) {
        toast.error(`${f.name} doesn’t look like a PDF.`);
        continue;
      }
      next.push({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) });
    }
    setExtras((prev) => [...prev, ...next]);
  };

  const removeAt = (index: number) => {
    if (!staged) {
      setExtras((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    if (index === 0) {
      toast("Use the file badge’s X to remove the staged file.", {
        description: "It is the first input by default.",
      });
      return;
    }
    setExtras((prev) => prev.filter((_, i) => i !== index - 1));
  };

  const moveAt = (index: number, dir: -1 | 1) => {
    if (!staged) {
      setExtras((prev) => swap(prev, index, index + dir));
      return;
    }
    const offset = staged ? 1 : 0;
    if (index < offset) return;
    setExtras((prev) => swap(prev, index - offset, index - offset + dir));
  };

  const onRun = async () => {
    if (!worker || queue.length < 2) return;
    setBusy(true);
    try {
      const out = await worker.mergePdfs(queue.map((q) => q.bytes));
      await downloadBytes(out.bytes, "merged.pdf");
      toast.success(`Merged ${queue.length} files into one.`, {
        description: `${out.meta.pageCount} total pages.`,
      });
    } catch (err) {
      toast.error("Could not merge.", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <ol className="space-y-2 max-w-2xl">
        {queue.map((entry, i) => (
          <li
            key={i}
            className={cn(
              "flex items-center gap-3 px-3 py-2",
              "rounded-[var(--radius-sm)] border border-[var(--color-rule)]",
              "bg-[var(--color-paper-2)]",
            )}
          >
            <span
              className="text-[12px] w-6 text-[var(--color-ink-3)] tabular-nums"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {i + 1}.
            </span>
            <span className="flex-1 truncate text-[14px]">{entry.name}</span>
            <span
              className="text-[12px] text-[var(--color-ink-3)]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {formatBytes(entry.bytes.byteLength)}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Move up"
                disabled={i === 0}
                onClick={() => moveAt(i, -1)}
                className={cn(
                  "inline-flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)]",
                  "text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]",
                  i === 0 && "opacity-30 cursor-not-allowed",
                )}
              >
                <ArrowUp size={14} strokeWidth={1.5} aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Move down"
                disabled={i === queue.length - 1}
                onClick={() => moveAt(i, 1)}
                className={cn(
                  "inline-flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)]",
                  "text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]",
                  i === queue.length - 1 && "opacity-30 cursor-not-allowed",
                )}
              >
                <ArrowDown size={14} strokeWidth={1.5} aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Remove"
                onClick={() => removeAt(i)}
                className={cn(
                  "inline-flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)]",
                  "text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]",
                )}
              >
                <X size={14} strokeWidth={1.5} aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          onChange={(e) => {
            void onPickFiles(e.target.files);
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
          <Plus size={16} strokeWidth={1.5} aria-hidden />
          Add another PDF
        </button>

        <button
          type="button"
          disabled={busy || queue.length < 2}
          onClick={onRun}
          className={cn(
            "inline-flex items-center gap-2 px-4 h-10 rounded-[var(--radius-sm)]",
            "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-medium",
            "transition-opacity duration-150",
            busy || queue.length < 2 ? "opacity-60 cursor-not-allowed" : "hover:opacity-90",
          )}
        >
          <Files size={16} strokeWidth={1.5} aria-hidden />
          {busy ? "Merging…" : `Merge ${queue.length} files`}
        </button>
      </div>

      {queue.length < 2 && (
        <p className="text-[13px] text-[var(--color-ink-3)] max-w-prose">
          Add at least one more PDF to merge. Drag-and-drop reorder lands with the
          dedicated{" "}
          <code style={{ fontFamily: "var(--font-mono)" }}>Reorder</code> view; for now
          the up/down buttons sequence the queue.
        </p>
      )}
    </div>
  );
}

function swap<T>(arr: T[], i: number, j: number): T[] {
  if (i < 0 || j < 0 || i >= arr.length || j >= arr.length) return arr;
  const next = arr.slice();
  const a = next[i] as T;
  const b = next[j] as T;
  next[i] = b;
  next[j] = a;
  return next;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
