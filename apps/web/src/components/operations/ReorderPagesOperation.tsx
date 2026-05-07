"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ListOrdered, ArrowUp, ArrowDown } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

export function ReorderPagesOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [order, setOrder] = useState<number[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!staged || !worker) return;
    let cancelled = false;
    worker
      .getInfo(staged.bytes)
      .then((info) => {
        if (!cancelled) {
          setOrder(Array.from({ length: info.pageCount }, (_, i) => i));
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        toast.error("Could not read pages.", {
          description: err instanceof Error ? err.message : String(err),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [staged, worker]);

  const move = (i: number, dir: -1 | 1) => {
    setOrder((prev) => {
      if (!prev) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      const a = next[i] as number;
      const b = next[j] as number;
      next[i] = b;
      next[j] = a;
      return next;
    });
  };

  const onRun = async () => {
    if (!staged || !worker || !order) return;
    setBusy(true);
    try {
      const out = await worker.reorderPages(staged.bytes, order);
      const name = staged.name.replace(/\.pdf$/i, "") + ".reordered.pdf";
      await downloadBytes(out.bytes, name);
      toast.success("Pages reordered.");
    } catch (err) {
      toast.error("Could not reorder.", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  if (!order) return <p className="text-[14px] text-[var(--color-ink-3)]">Reading…</p>;

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-[var(--color-ink-3)] max-w-prose">
        Drag the originals into the new order — drag-and-drop with thumbnails (dnd-kit
        + the virtualised grid) ships in a follow-up. For now use the up/down buttons.
      </p>

      <ol
        className={cn(
          "rounded-[var(--radius)] border border-[var(--color-rule)]",
          "bg-[var(--color-paper-2)] p-2 max-w-md max-h-[60dvh] overflow-y-auto",
        )}
      >
        {order.map((originalIndex, position) => (
          <li
            key={`${position}-${originalIndex}`}
            className={cn(
              "flex items-center gap-3 px-3 py-2",
              "rounded-[var(--radius-sm)] hover:bg-[var(--color-paper-3)]",
            )}
          >
            <span
              className="text-[12px] w-8 text-[var(--color-ink-3)] tabular-nums"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {position + 1}.
            </span>
            <span className="flex-1 text-[14px]">
              Page <span style={{ fontFamily: "var(--font-mono)" }}>{originalIndex + 1}</span>{" "}
              <span className="text-[var(--color-ink-3)]">(original position)</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Move up"
                disabled={position === 0}
                onClick={() => move(position, -1)}
                className={cn(
                  "inline-flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)]",
                  "text-[var(--color-ink-2)] hover:bg-[var(--color-paper)]",
                  position === 0 && "opacity-30 cursor-not-allowed",
                )}
              >
                <ArrowUp size={14} strokeWidth={1.5} aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Move down"
                disabled={position === order.length - 1}
                onClick={() => move(position, 1)}
                className={cn(
                  "inline-flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)]",
                  "text-[var(--color-ink-2)] hover:bg-[var(--color-paper)]",
                  position === order.length - 1 && "opacity-30 cursor-not-allowed",
                )}
              >
                <ArrowDown size={14} strokeWidth={1.5} aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ol>

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
        <ListOrdered size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Saving…" : "Save new order"}
      </button>
    </div>
  );
}
