"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

interface ImageEntry {
  name: string;
  bytes: Uint8Array;
}

const PAGE_SIZES = ["A4", "Letter", "Legal"] as const;
type PageSizeName = (typeof PAGE_SIZES)[number];

const FITS = ["contain", "cover"] as const;
type Fit = (typeof FITS)[number];

export function ImagesToPdfOperation() {
  const worker = usePdfWorker();
  const fileInput = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [pageSize, setPageSize] = useState<PageSizeName>("A4");
  const [fit, setFit] = useState<Fit>("contain");
  const [busy, setBusy] = useState(false);

  const onPick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next: ImageEntry[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name} doesn’t look like an image.`);
        continue;
      }
      next.push({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) });
    }
    setImages((prev) => [...prev, ...next]);
  };

  const removeAt = (i: number) => setImages((prev) => prev.filter((_, idx) => idx !== i));

  const onRun = async () => {
    if (!worker || images.length === 0) return;
    setBusy(true);
    try {
      const out = await worker.imagesToPdf(
        images.map((img) => img.bytes),
        { pageSize: { name: pageSize }, fit },
      );
      await downloadBytes(out.bytes, "images.pdf");
      toast.success(`Built a ${out.meta.pageCount}-page PDF.`);
    } catch (err) {
      toast.error("Could not build PDF.", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          multiple
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
          <ImagePlus size={16} strokeWidth={1.5} aria-hidden />
          Add images
        </button>
      </div>

      {images.length > 0 && (
        <ol className="space-y-2 max-w-2xl">
          {images.map((img, i) => (
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
              <span className="flex-1 truncate text-[14px]">{img.name}</span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label="Remove"
                className="inline-flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] hover:bg-[var(--color-paper-3)]"
              >
                <X size={14} strokeWidth={1.5} aria-hidden />
              </button>
            </li>
          ))}
        </ol>
      )}

      <fieldset>
        <legend className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Page size
        </legend>
        <div className="flex gap-2">
          {PAGE_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPageSize(s)}
              className={cn(
                "inline-flex items-center px-3 h-9 rounded-[var(--radius-sm)] text-[13px]",
                "border transition-colors duration-150",
                pageSize === s
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                  : "border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)]",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Fit
        </legend>
        <div className="flex gap-2">
          {FITS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFit(f)}
              className={cn(
                "inline-flex items-center px-3 h-9 rounded-[var(--radius-sm)] text-[13px]",
                "border transition-colors duration-150",
                fit === f
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                  : "border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)]",
              )}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {f}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        disabled={busy || images.length === 0}
        onClick={onRun}
        className={cn(
          "inline-flex items-center gap-2 px-4 h-10 rounded-[var(--radius-sm)]",
          "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-medium",
          "transition-opacity duration-150",
          busy || images.length === 0 ? "opacity-60 cursor-not-allowed" : "hover:opacity-90",
        )}
      >
        <ImagePlus size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Building…" : `Build PDF (${images.length})`}
      </button>
    </div>
  );
}
