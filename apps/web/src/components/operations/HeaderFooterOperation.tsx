"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlignVerticalJustifyCenter } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

export function HeaderFooterOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [header, setHeader] = useState("");
  const [footer, setFooter] = useState("");
  const [size, setSize] = useState(10);
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!staged || !worker) return;
    if (!header.trim() && !footer.trim()) {
      toast.error("Enter a header, a footer, or both.");
      return;
    }
    setBusy(true);
    try {
      const out = await worker.addHeaderFooter(staged.bytes, {
        header: header.trim() || undefined,
        footer: footer.trim() || undefined,
        size,
      });
      const name = staged.name.replace(/\.pdf$/i, "") + ".running.pdf";
      await downloadBytes(out.bytes, name);
      toast.success("Header / footer added.");
    } catch (err) {
      toast.error("Could not add header / footer.", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onRun();
      }}
      className="space-y-4"
    >
      <label className="block max-w-xl">
        <span className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Header
        </span>
        <input
          type="text"
          value={header}
          onChange={(e) => setHeader(e.target.value)}
          placeholder="Leave blank for no header"
          className={cn(
            "w-full px-3 h-10 rounded-[var(--radius-sm)]",
            "border border-[var(--color-rule)] bg-[var(--color-paper)]",
            "text-[14px]",
            "focus:outline-none focus:border-[var(--color-accent)]",
          )}
          style={{ fontFamily: "var(--font-mono)" }}
        />
      </label>

      <label className="block max-w-xl">
        <span className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Footer
        </span>
        <input
          type="text"
          value={footer}
          onChange={(e) => setFooter(e.target.value)}
          placeholder="Leave blank for no footer"
          className={cn(
            "w-full px-3 h-10 rounded-[var(--radius-sm)]",
            "border border-[var(--color-rule)] bg-[var(--color-paper)]",
            "text-[14px]",
            "focus:outline-none focus:border-[var(--color-accent)]",
          )}
          style={{ fontFamily: "var(--font-mono)" }}
        />
      </label>

      <p className="text-[13px] text-[var(--color-ink-3)] max-w-prose">
        Substitutions: <code style={{ fontFamily: "var(--font-mono)" }}>{"{n}"}</code>{" "}
        page number, <code style={{ fontFamily: "var(--font-mono)" }}>{"{total}"}</code>{" "}
        page count, <code style={{ fontFamily: "var(--font-mono)" }}>{"{date}"}</code>{" "}
        today’s date.
      </p>

      <label className="block w-32">
        <span className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Size
        </span>
        <input
          type="number"
          value={size}
          min={6}
          max={48}
          step={1}
          onChange={(e) => setSize(Number(e.target.value))}
          className={cn(
            "w-full px-3 h-10 rounded-[var(--radius-sm)]",
            "border border-[var(--color-rule)] bg-[var(--color-paper)]",
            "text-[14px]",
            "focus:outline-none focus:border-[var(--color-accent)]",
          )}
          style={{ fontFamily: "var(--font-mono)" }}
        />
      </label>

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
        <AlignVerticalJustifyCenter size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Stamping…" : "Add header / footer"}
      </button>
    </form>
  );
}
