"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { FormField } from "@dossier/core";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { Download } from "lucide-react";
import { cn } from "@/lib/cn";

export function ExtractFieldsOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [fields, setFields] = useState<FormField[] | null>(null);

  useEffect(() => {
    if (!staged || !worker) return;
    let cancelled = false;
    worker
      .getFormFields(staged.bytes)
      .then((f) => {
        if (!cancelled) setFields(f);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        toast.error("Could not read fields.", {
          description: err instanceof Error ? err.message : String(err),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [staged, worker]);

  const onDownloadJson = async () => {
    if (!fields || !staged) return;
    const bytes = new TextEncoder().encode(JSON.stringify(fields, null, 2));
    const name = staged.name.replace(/\.pdf$/i, "") + ".fields.json";
    await downloadBytes(bytes, name, { mimeType: "application/json" });
  };

  if (!fields) return <p className="text-[14px] text-[var(--color-ink-3)]">Reading…</p>;

  if (fields.length === 0) {
    return (
      <p className="text-[14px] italic text-[var(--color-ink-3)]">
        This PDF has no AcroForm fields.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-[var(--radius)] border border-[var(--color-rule)]",
          "bg-[var(--color-paper-2)] overflow-hidden",
        )}
      >
        <table className="w-full text-[13px]" style={{ fontFamily: "var(--font-mono)" }}>
          <thead className="text-[var(--color-ink-3)] text-[11px] uppercase tracking-[0.06em]">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">Type</th>
              <th className="text-left px-4 py-2 font-medium">Value</th>
              <th className="text-left px-4 py-2 font-medium">Read-only</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.name} className="border-t border-[var(--color-rule)]">
                <td className="px-4 py-2 break-all">{f.name}</td>
                <td className="px-4 py-2 text-[var(--color-ink-3)]">{f.type}</td>
                <td className="px-4 py-2">{formatValue(f.value)}</td>
                <td className="px-4 py-2 text-[var(--color-ink-3)]">{f.readOnly ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={onDownloadJson}
        className={cn(
          "inline-flex items-center gap-2 px-4 h-10 rounded-[var(--radius-sm)]",
          "border border-[var(--color-rule)] bg-[var(--color-paper)]",
          "hover:bg-[var(--color-paper-3)] transition-colors duration-150",
        )}
      >
        <Download size={16} strokeWidth={1.5} aria-hidden />
        Download as JSON
      </button>
    </div>
  );
}

function formatValue(v: FormField["value"]): string {
  if (v === undefined || v === null) return "—";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}
