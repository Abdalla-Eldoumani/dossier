"use client";

import { useAppStore } from "@/lib/store";
import { X, FileText } from "lucide-react";
import { cn } from "@/lib/cn";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function FileBadge() {
  const { staged, clearStaged } = useAppStore();
  if (!staged) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        "rounded-[var(--radius)] border border-[var(--color-rule)]",
        "bg-[var(--color-paper-2)]",
      )}
    >
      <FileText size={20} strokeWidth={1.5} aria-hidden className="text-[var(--color-ink-2)] shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium truncate" style={{ fontFamily: "var(--font-ui)" }}>
          {staged.name}
        </p>
        <p
          className="text-[12px] text-[var(--color-ink-3)]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {formatBytes(staged.size)}
          {staged.pageCount !== undefined ? ` · ${staged.pageCount} pages` : null}
        </p>
      </div>
      <button
        aria-label="Remove file"
        onClick={clearStaged}
        className={cn(
          "shrink-0 inline-flex items-center justify-center w-9 h-9",
          "rounded-[var(--radius-sm)] text-[var(--color-ink-2)]",
          "hover:bg-[var(--color-paper-3)] transition-colors duration-150",
        )}
      >
        <X size={18} strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  );
}
