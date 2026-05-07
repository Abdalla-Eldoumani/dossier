"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { BookmarkNode } from "@dossier/core";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { cn } from "@/lib/cn";

export function BookmarksOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [outline, setOutline] = useState<BookmarkNode[] | null>(null);

  useEffect(() => {
    if (!staged || !worker) return;
    let cancelled = false;
    worker
      .getBookmarks(staged.bytes)
      .then((tree) => {
        if (!cancelled) setOutline(tree);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        toast.error("Could not read bookmarks.", {
          description: err instanceof Error ? err.message : String(err),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [staged, worker]);

  if (!outline) return <p className="text-[14px] text-[var(--color-ink-3)]">Reading…</p>;

  if (outline.length === 0) {
    return (
      <p className="text-[14px] italic text-[var(--color-ink-3)]">
        This PDF has no bookmarks. A full editor lands later — for now this view is read-only.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border border-[var(--color-rule)]",
        "bg-[var(--color-paper-2)] px-4 py-3",
      )}
    >
      <Tree nodes={outline} depth={0} />
    </div>
  );
}

function Tree({ nodes, depth }: { nodes: BookmarkNode[]; depth: number }) {
  return (
    <ul className={depth === 0 ? "" : "border-l border-[var(--color-rule)] pl-3"}>
      {nodes.map((n, i) => (
        <li key={i} className="py-1">
          <div
            className="grid grid-cols-[1fr_auto] gap-3 text-[13px]"
            style={{ fontFamily: "var(--font-ui)" }}
          >
            <span className="truncate">{n.title || "(untitled)"}</span>
            <span className="text-[var(--color-ink-3)]" style={{ fontFamily: "var(--font-mono)" }}>
              {n.pageIndex !== undefined ? `p${n.pageIndex + 1}` : "—"}
            </span>
          </div>
          {n.children && n.children.length > 0 && (
            <Tree nodes={n.children} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}
