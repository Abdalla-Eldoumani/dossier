"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FormInput } from "lucide-react";
import type { FormField } from "@dossier/core";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

type Values = Record<string, string | boolean>;

export function FillFormOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [fields, setFields] = useState<FormField[] | null>(null);
  const [values, setValues] = useState<Values>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!staged || !worker) return;
    let cancelled = false;
    worker
      .getFormFields(staged.bytes)
      .then((f) => {
        if (cancelled) return;
        setFields(f);
        const initial: Values = {};
        for (const field of f) {
          if (field.type === "checkbox") {
            initial[field.name] = field.value === true;
          } else if (Array.isArray(field.value)) {
            initial[field.name] = field.value[0] ?? "";
          } else if (typeof field.value === "string") {
            initial[field.name] = field.value;
          } else {
            initial[field.name] = "";
          }
        }
        setValues(initial);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        toast.error("Could not read form.", {
          description: err instanceof Error ? err.message : String(err),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [staged, worker]);

  const onRun = async () => {
    if (!staged || !worker || !fields) return;
    setBusy(true);
    try {
      const out = await worker.fillForm(staged.bytes, values);
      const name = staged.name.replace(/\.pdf$/i, "") + ".filled.pdf";
      await downloadBytes(out.bytes, name);
      toast.success("Form filled.");
    } catch (err) {
      toast.error("Could not fill form.", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  if (!fields) return <p className="text-[14px] text-[var(--color-ink-3)]">Reading form…</p>;
  if (fields.length === 0) {
    return (
      <p className="text-[14px] italic text-[var(--color-ink-3)]">
        This PDF has no AcroForm fields to fill.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onRun();
      }}
      className="space-y-4"
    >
      <div className="space-y-3 max-w-xl">
        {fields.map((f) => (
          <FieldInput
            key={f.name}
            field={f}
            value={values[f.name]}
            onChange={(v) => setValues((prev) => ({ ...prev, [f.name]: v }))}
          />
        ))}
      </div>

      <button
        type="submit"
        disabled={busy}
        className={cn(
          "inline-flex items-center gap-2 px-4 h-10 rounded-[var(--radius-sm)]",
          "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-medium",
          "transition-opacity duration-150",
          busy ? "opacity-60 cursor-progress" : "hover:opacity-90",
        )}
      >
        <FormInput size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Filling…" : "Fill form"}
      </button>
    </form>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string | boolean | undefined;
  onChange: (v: string | boolean) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-[14px] text-[var(--color-ink)] cursor-pointer">
        <input
          type="checkbox"
          checked={value === true}
          disabled={field.readOnly}
          onChange={(e) => onChange(e.target.checked)}
          className="accent-[var(--color-accent)]"
        />
        <span style={{ fontFamily: "var(--font-mono)" }}>{field.name}</span>
      </label>
    );
  }

  if (field.type === "dropdown" || field.type === "radio") {
    const options = field.options ?? [];
    return (
      <label className="block">
        <span
          className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-1"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {field.name}
        </span>
        <select
          value={typeof value === "string" ? value : ""}
          disabled={field.readOnly}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full px-3 h-10 rounded-[var(--radius-sm)]",
            "border border-[var(--color-rule)] bg-[var(--color-paper)]",
            "text-[14px]",
            "focus:outline-none focus:border-[var(--color-accent)]",
          )}
        >
          <option value="">—</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="block">
      <span
        className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-1"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {field.name}
      </span>
      <input
        type="text"
        value={typeof value === "string" ? value : ""}
        readOnly={field.readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full px-3 h-10 rounded-[var(--radius-sm)]",
          "border border-[var(--color-rule)] bg-[var(--color-paper)]",
          "text-[14px]",
          "focus:outline-none focus:border-[var(--color-accent)]",
          field.readOnly && "opacity-60",
        )}
      />
    </label>
  );
}
