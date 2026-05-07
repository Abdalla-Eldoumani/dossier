"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import type { SearchHit } from "@dossier/core";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { cn } from "@/lib/cn";

export function SearchOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hits, setHits] = useState<SearchHit[] | null>(null);

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    setHits(null);
    try {
      const result = await worker.searchText(staged.bytes, query, { caseSensitive });
      setHits(result);
    } catch (err) {
      toast.error("Search failed.", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onRun();
        }}
        className="space-y-3"
      >
        <label className="block">
          <span className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
            Find
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a phrase…"
            autoComplete="off"
            className={cn(
              "w-full max-w-md px-3 h-10 rounded-[var(--radius-sm)]",
              "border border-[var(--color-rule)] bg-[var(--color-paper)]",
              "text-[14px] text-[var(--color-ink)]",
              "focus:outline-none focus:border-[var(--color-accent)]",
            )}
          />
        </label>

        <label className="inline-flex items-center gap-2 text-[13px] text-[var(--color-ink-2)] cursor-pointer">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
            className="accent-[var(--color-accent)]"
          />
          Match case
        </label>

        <div>
          <button
            type="submit"
            disabled={busy || !query.trim()}
            className={cn(
              "inline-flex items-center gap-2 px-4 h-10 rounded-[var(--radius-sm)]",
              "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-medium",
              "transition-opacity duration-150",
              busy || !query.trim() ? "opacity-60 cursor-not-allowed" : "hover:opacity-90",
            )}
          >
            <Search size={16} strokeWidth={1.5} aria-hidden />
            {busy ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {hits !== null && (
        <section>
          <h2 className="text-[12px] uppercase tracking-[0.08em] mb-3 text-[var(--color-ink-3)] font-medium">
            {hits.length} {hits.length === 1 ? "match" : "matches"}
          </h2>
          {hits.length === 0 ? (
            <p className="text-[13px] italic text-[var(--color-ink-3)]">
              No matches in this document.
            </p>
          ) : (
            <ul className="space-y-2">
              {hits.slice(0, 200).map((hit, i) => (
                <li
                  key={i}
                  className={cn(
                    "rounded-[var(--radius-sm)] border border-[var(--color-rule)]",
                    "bg-[var(--color-paper-2)] px-3 py-2",
                  )}
                >
                  <div className="text-[11px] text-[var(--color-ink-3)] mb-1" style={{ fontFamily: "var(--font-mono)" }}>
                    Page {hit.pageIndex + 1}
                  </div>
                  <div className="text-[13px] text-[var(--color-ink)]">{hit.snippet}</div>
                </li>
              ))}
              {hits.length > 200 && (
                <li className="text-[13px] italic text-[var(--color-ink-3)]">
                  … {hits.length - 200} more matches
                </li>
              )}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
