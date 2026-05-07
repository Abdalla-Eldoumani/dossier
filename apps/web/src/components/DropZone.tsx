"use client";

import { useDropzone } from "react-dropzone";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/cn";
import { FileUp } from "lucide-react";

// Magic-number sniff. Don't trust file.type — iOS Safari sometimes reports application/octet-stream
// for files dropped from the Files app.
async function isPdfFile(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  const magic = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
  for (let i = 0; i <= head.length - magic.length; i++) {
    let ok = true;
    for (let j = 0; j < magic.length; j++) {
      if (head[i + j] !== magic[j]) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

interface DropZoneProps {
  className?: string;
  compact?: boolean;
}

export function DropZone({ className, compact = false }: DropZoneProps) {
  const setStaged = useAppStore((s) => s.setStaged);
  const [busy, setBusy] = useState(false);

  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    setBusy(true);
    try {
      if (!(await isPdfFile(file))) {
        toast.error("That doesn't look like a PDF.", {
          description: "Drop a file that begins with the standard PDF header.",
        });
        return;
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      setStaged({ name: file.name, size: file.size, bytes });
    } catch {
      toast.error("Couldn't read this file.", {
        description: "Try another, or check that the file isn't open in another program.",
      });
    } finally {
      setBusy(false);
    }
  }, [setStaged]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
    disabled: busy,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "rounded-[var(--radius)] cursor-pointer",
        "border-2 border-dashed transition-all duration-200",
        "ease-[cubic-bezier(0.32,0.72,0,1)]",
        compact ? "px-6 py-8" : "px-8 py-20 md:py-24",
        isDragActive
          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
          : "border-[var(--color-rule-2)] bg-[var(--color-paper)] hover:border-[var(--color-ink-3)]",
        className,
      )}
    >
      <input {...getInputProps()} aria-label="Choose a PDF file" />
      <div className="flex flex-col items-center text-center gap-4">
        <FileUp
          size={compact ? 20 : 28}
          strokeWidth={1.5}
          aria-hidden
          className="text-[var(--color-ink-3)]"
        />
        <div>
          <p
            className={cn("text-[var(--color-ink)]", compact ? "text-[14px]" : "text-[16px]")}
            style={{ fontWeight: 500 }}
          >
            {isDragActive ? "Drop to load" : "Drop a PDF here"}
          </p>
          {!compact && (
            <p className="mt-2 text-[13px] text-[var(--color-ink-3)]">
              Or click to choose. Files never leave your machine.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
