"use client";

import { useAppStore } from "@/lib/store";
import { CATEGORIES, OPERATIONS_BY_CATEGORY, type OperationCategory } from "@/lib/operations";
import { cn } from "@/lib/cn";

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, activeOperationId, setActiveOperationId } = useAppStore();

  const categories = Object.keys(CATEGORIES) as OperationCategory[];

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 z-20 bg-black/40"
        />
      )}

      <aside
        aria-label="Operations"
        className={cn(
          "z-30 shrink-0 w-[280px] border-r border-[var(--color-rule)]",
          "bg-[var(--color-paper-2)]",
          "fixed md:sticky inset-y-0 md:top-16 md:h-[calc(100dvh-4rem)]",
          "overflow-y-auto",
          "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <nav className="px-3 py-6">
          {categories.map((cat) => {
            const ops = OPERATIONS_BY_CATEGORY[cat] ?? [];
            if (ops.length === 0) return null;
            return (
              <div key={cat} className="mb-6">
                <h2
                  className={cn(
                    "px-3 mb-2 text-[11px] uppercase tracking-[0.08em]",
                    "text-[var(--color-ink-3)] font-medium",
                  )}
                >
                  {CATEGORIES[cat]}
                </h2>
                <ul>
                  {ops.map((op) => {
                    const Icon = op.icon;
                    const active = op.id === activeOperationId;
                    return (
                      <li key={op.id}>
                        <button
                          onClick={() => {
                            setActiveOperationId(op.id);
                            // Auto-close on mobile after selecting an op.
                            if (window.matchMedia("(max-width: 768px)").matches) {
                              setSidebarOpen(false);
                            }
                          }}
                          className={cn(
                            "w-full flex items-center gap-3",
                            "px-3 py-[10px] rounded-[var(--radius-sm)]",
                            "text-[14px] text-left",
                            "transition-colors duration-150 ease-[cubic-bezier(0.32,0.72,0,1)]",
                            "relative",
                            active
                              ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-medium"
                              : "text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]",
                          )}
                        >
                          {active && (
                            <span
                              aria-hidden
                              className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[var(--color-accent)]"
                            />
                          )}
                          <Icon size={18} strokeWidth={1.5} aria-hidden />
                          <span>{op.name}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
