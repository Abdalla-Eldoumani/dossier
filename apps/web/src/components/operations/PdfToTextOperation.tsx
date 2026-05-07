"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileText, Download } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

export function PdfToTextOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [layoutPreserve, setLayoutPreserve] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState<string | null>(null);

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    setText(null);
    try {
      const result = await worker.pdfToText(staged.bytes, { layoutPreserve });
      setText(result.text);
      toast.success(`Extracted ${result.pages.length} page${result.pages.length === 1 ? "" : "s"} of text.`);
    } catch (err) {
      toast.error("Could not extract text.", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  const onDownload = async () => {
    if (!text || !staged) return;
    const bytes = new TextEncoder().encode(text);
    const name = staged.name.replace(/\.pdf$/i, "") + ".txt";
    await downloadBytes(bytes, name, { mimeType: "text/plain" });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="inline-flex items-center gap-2 text-[13px] text-[var(--color-ink-2)] cursor-pointer">
          <input
            type="checkbox"
            checked={layoutPreserve}
            onChange={(e) => setLayoutPreserve(e.target.checked)}
            className="accent-[var(--color-accent)]"
          />
          Preserve approximate layout
        </label>

        <div>
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
            <FileText size={16} strokeWidth={1.5} aria-hidden />
            {busy ? "Extracting…" : "Extract text"}
          </button>
        </div>
      </div>

      {text !== null && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] font-medium">
              Preview
            </h2>
            <button
              type="button"
              onClick={onDownload}
              className={cn(
                "inline-flex items-center gap-2 px-3 h-9 rounded-[var(--radius-sm)] text-[13px]",
                "border border-[var(--color-rule)] bg-[var(--color-paper)]",
                "hover:bg-[var(--color-paper-3)] transition-colors duration-150",
              )}
            >
              <Download size={14} strokeWidth={1.5} aria-hidden />
              Download .txt
            </button>
          </div>
          <pre
            className={cn(
              "rounded-[var(--radius)] border border-[var(--color-rule)]",
              "bg-[var(--color-paper-2)] px-4 py-3 text-[13px]",
              "max-h-[60dvh] overflow-auto whitespace-pre-wrap",
            )}
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {text || "(no text extracted)"}
          </pre>
        </section>
      )}
    </div>
  );
}
