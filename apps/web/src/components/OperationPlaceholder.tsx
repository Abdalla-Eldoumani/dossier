"use client";

// Temporary placeholder rendered inside the OperationCanvas until the per-operation view
// is implemented. Each operation has its own dedicated component in
// src/components/operations/<Name>.tsx, which replaces this once built.

interface Props {
  operationId: string;
}

export function OperationPlaceholder({ operationId }: Props) {
  return (
    <div
      className="rounded-[var(--radius)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-6"
    >
      <p className="text-[14px] text-[var(--color-ink-2)]">
        The view for <code style={{ fontFamily: "var(--font-mono)" }}>{operationId}</code> is not
        wired yet.
      </p>
      <p className="mt-2 text-[13px] text-[var(--color-ink-3)]">
        Build it in <code style={{ fontFamily: "var(--font-mono)" }}>src/components/operations/</code> and
        replace this placeholder in <code style={{ fontFamily: "var(--font-mono)" }}>OperationCanvas</code>.
      </p>
    </div>
  );
}
