"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { downloadBytes } from "@/lib/download";
import { cn } from "@/lib/cn";

const PERMISSIONS = [
  { id: "print", label: "Printing" },
  { id: "modify", label: "Edits" },
  { id: "copy", label: "Copy text/images" },
  { id: "annotate", label: "Annotations" },
  { id: "fillForms", label: "Form filling" },
  { id: "extract", label: "Accessibility tools" },
  { id: "assemble", label: "Page reordering" },
] as const;

type PermissionId = (typeof PERMISSIONS)[number]["id"];

export function EncryptOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [userPassword, setUserPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [allowed, setAllowed] = useState<Set<PermissionId>>(
    () => new Set<PermissionId>(PERMISSIONS.map((p) => p.id)),
  );
  const [busy, setBusy] = useState(false);

  const togglePerm = (id: PermissionId) =>
    setAllowed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onRun = async () => {
    if (!staged || !worker) return;
    if (!userPassword) {
      toast.error("Set a user password.");
      return;
    }
    setBusy(true);
    try {
      const permissions = PERMISSIONS.reduce(
        (acc, p) => ({ ...acc, [p.id]: allowed.has(p.id) }),
        {} as Record<PermissionId, boolean>,
      );
      const out = await worker.encryptPdf(staged.bytes, {
        userPassword,
        ownerPassword: ownerPassword || undefined,
        permissions,
      });
      const name = staged.name.replace(/\.pdf$/i, "") + ".encrypted.pdf";
      await downloadBytes(out.bytes, name);
      toast.success("Encrypted with AES.");
    } catch (err) {
      toast.error("Could not encrypt.", {
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
      className="space-y-6"
    >
      <div className="grid gap-4 max-w-md">
        <label className="block">
          <span className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
            User password
          </span>
          <input
            type="password"
            value={userPassword}
            onChange={(e) => setUserPassword(e.target.value)}
            autoComplete="new-password"
            className={cn(
              "w-full px-3 h-10 rounded-[var(--radius-sm)]",
              "border border-[var(--color-rule)] bg-[var(--color-paper)]",
              "text-[14px]",
              "focus:outline-none focus:border-[var(--color-accent)]",
            )}
          />
        </label>
        <label className="block">
          <span className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
            Owner password (optional)
          </span>
          <input
            type="password"
            value={ownerPassword}
            onChange={(e) => setOwnerPassword(e.target.value)}
            autoComplete="new-password"
            className={cn(
              "w-full px-3 h-10 rounded-[var(--radius-sm)]",
              "border border-[var(--color-rule)] bg-[var(--color-paper)]",
              "text-[14px]",
              "focus:outline-none focus:border-[var(--color-accent)]",
            )}
          />
          <span className="block mt-1 text-[12px] text-[var(--color-ink-3)]">
            Defaults to the user password — set a separate one to keep edit rights.
          </span>
        </label>
      </div>

      <fieldset>
        <legend className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] mb-2">
          Allowed actions
        </legend>
        <div className="grid grid-cols-2 gap-2 max-w-md">
          {PERMISSIONS.map((p) => (
            <label
              key={p.id}
              className="inline-flex items-center gap-2 text-[13px] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={allowed.has(p.id)}
                onChange={() => togglePerm(p.id)}
                className="accent-[var(--color-accent)]"
              />
              {p.label}
            </label>
          ))}
        </div>
      </fieldset>

      <p className="text-[13px] text-[var(--color-ink-3)] max-w-prose">
        AES-256 via an injected `PdfSecurity` provider. pdf-lib v1 reads encrypted PDFs
        but cannot write them — the worker forwards to qpdf-wasm / mupdf when present,
        and surfaces an unsupported-feature toast otherwise.
      </p>

      <button
        type="submit"
        disabled={busy || !userPassword}
        className={cn(
          "inline-flex items-center gap-2 px-4 h-10 rounded-[var(--radius-sm)]",
          "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-medium",
          "transition-opacity duration-150",
          busy || !userPassword ? "opacity-60 cursor-not-allowed" : "hover:opacity-90",
        )}
      >
        <Lock size={16} strokeWidth={1.5} aria-hidden />
        {busy ? "Encrypting…" : "Encrypt"}
      </button>
    </form>
  );
}
