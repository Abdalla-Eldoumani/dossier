"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Unlock } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

export function DecryptOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!staged || !worker) return;
    setBusy(true);
    try {
      const out = await worker.decryptPdf(staged.bytes, password);
      const name = staged.name.replace(/\.pdf$/i, "") + ".decrypted.pdf";
      await downloadBytes(out.bytes, name);
      toast.success("Decrypted.");
    } catch (err) {
      toast.error("Could not decrypt.", {
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
      <label className="block max-w-sm">
        <span className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Password
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className={cn(
            "w-full px-3 h-10 rounded-[var(--radius-sm)]",
            "border border-[var(--color-rule)] bg-[var(--color-paper)]",
            "text-[14px] text-[var(--color-ink)]",
            "focus:outline-none focus:border-[var(--color-accent)]",
          )}
        />
      </label>

      <p className="text-[13px] text-[var(--color-ink-3)] max-w-prose">
        Removes the password and writes a plain PDF. Needs a `PdfSecurity` provider
        (qpdf-wasm in the browser, mupdf in Node) to do the actual rewrite — until
        that wires up the operation surfaces an unsupported-feature toast.
      </p>

      <button
        type="submit"
        disabled={busy || !password}
        className={cn(
          "inline-flex items-center gap-2 px-4 h-10 rounded-[var(--radius-sm)]",
          "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-medium",
          "transition-opacity duration-150",
          busy || !password ? "opacity-60 cursor-not-allowed" : "hover:opacity-90",
        )}
      >
        <Unlock size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Decrypting…" : "Decrypt"}
      </button>
    </form>
  );
}
