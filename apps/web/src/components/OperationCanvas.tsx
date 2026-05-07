"use client";

import { useAppStore } from "@/lib/store";
import { OPERATIONS } from "@/lib/operations";
import { DropZone } from "@/components/DropZone";
import { FileBadge } from "@/components/FileBadge";
import { OperationPlaceholder } from "@/components/OperationPlaceholder";
import { cn } from "@/lib/cn";

export function OperationCanvas() {
  const { activeOperationId, staged } = useAppStore();
  const op = OPERATIONS.find((o) => o.id === activeOperationId);

  if (!op) {
    // Should not happen if the registry stays in sync. Fail loud during dev, soft in prod.
    return (
      <div className="p-8 text-[var(--color-ink-3)]">Operation not found.</div>
    );
  }

  return (
    <div className="px-6 md:px-12 py-8 md:py-12 max-w-[1100px] mx-auto">
      <header className="mb-10">
        <h1
          className="text-[40px] md:text-[56px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontVariationSettings: '"SOFT" 100', lineHeight: 1.05, letterSpacing: "-0.02em" }}
        >
          {op.name}
        </h1>
        <p
          className="mt-3 text-[18px] md:text-[20px] italic text-[var(--color-ink-2)]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontVariationSettings: '"SOFT" 50' }}
        >
          {op.description}
        </p>
      </header>

      {staged ? (
        <div className="space-y-6">
          <FileBadge />
          {/* Operation-specific component goes here.
              For now, render the placeholder. Each operation will have its own view
              in src/components/operations/ that replaces this. */}
          <OperationPlaceholder operationId={op.id} />
        </div>
      ) : (
        <div className="space-y-6">
          <DropZone />
          <p
            className={cn(
              "text-[13px] text-[var(--color-ink-3)] text-center max-w-prose mx-auto",
            )}
          >
            Dossier processes everything inside your browser. There is no upload, no server,
            no telemetry. Close the tab and nothing leaves with it.
          </p>
        </div>
      )}
    </div>
  );
}
