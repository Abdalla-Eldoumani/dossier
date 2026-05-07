"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ScanText } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

const COMMON_LANGUAGES = ["eng", "deu", "fra", "spa", "ita", "por", "nld"];

export function OcrOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [languages, setLanguages] = useState<string[]>(["eng"]);
  const [addTextLayer, setAddTextLayer] = useState(true);
  const [busy, setBusy] = useState(false);

  const toggleLang = (l: string) =>
    setLanguages((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l],
    );

  const onRun = async () => {
    if (!staged || !worker) return;
    if (languages.length === 0) {
      toast.error("Pick at least one language.");
      return;
    }
    setBusy(true);
    try {
      const out = await worker.runOcr(staged.bytes, { languages, addTextLayer });
      if (out.pdfBytes) {
        const name = staged.name.replace(/\.pdf$/i, "") + ".ocr.pdf";
        await downloadBytes(out.pdfBytes, name);
      }
      const totalChars = out.pages.reduce((n, p) => n + p.text.length, 0);
      toast.success("OCR complete.", {
        description: `${out.pages.length} pages · ${totalChars.toLocaleString()} characters recognised`,
      });
    } catch (err) {
      toast.error("Could not run OCR.", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Languages
        </legend>
        <div className="flex flex-wrap gap-2 max-w-md">
          {COMMON_LANGUAGES.map((l) => (
            <label
              key={l}
              className={cn(
                "inline-flex items-center gap-2 px-3 h-9 rounded-[var(--radius-sm)] cursor-pointer",
                "border text-[13px] transition-colors duration-150",
                languages.includes(l)
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                  : "border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)]",
              )}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <input
                type="checkbox"
                checked={languages.includes(l)}
                onChange={() => toggleLang(l)}
                className="sr-only"
              />
              {l}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="inline-flex items-center gap-2 text-[13px] text-[var(--color-ink-2)] cursor-pointer">
        <input
          type="checkbox"
          checked={addTextLayer}
          onChange={(e) => setAddTextLayer(e.target.checked)}
          className="accent-[var(--color-accent)]"
        />
        Add a searchable text layer to the PDF
      </label>

      <p className="text-[13px] text-[var(--color-ink-3)] max-w-prose">
        Engine: tesseract.js (provider-injected). Language data downloads on first run
        (~10 MB per language). Until the `OcrEngine` provider wires up, this surfaces
        an unsupported-feature toast.
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
        <ScanText size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Recognising…" : "Run OCR"}
      </button>
    </div>
  );
}
