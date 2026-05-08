"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Sun, Moon, Menu, Keyboard } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/cn";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  // True only after client mount — keeps the theme icon stable through hydration
  // without a setState-in-effect dance.
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center justify-between",
        "px-4 md:px-8 h-16",
        "bg-[var(--color-paper)]/85 backdrop-blur-sm",
        "border-b border-[var(--color-rule)]",
      )}
    >
      <div className="flex items-center gap-3">
        <button
          aria-label="Toggle sidebar"
          onClick={toggleSidebar}
          className={cn(
            "md:hidden inline-flex items-center justify-center",
            "w-9 h-9 rounded-[var(--radius-sm)]",
            "text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]",
            "transition-colors duration-150",
          )}
        >
          <Menu size={18} strokeWidth={1.5} aria-hidden />
        </button>

        <span
          className="text-[24px] tracking-[0.02em]"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontVariationSettings: '"SOFT" 50',
          }}
        >
          Dossier
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Show keyboard shortcuts"
          title="Keyboard shortcuts (?)"
          onClick={() => {
            if (typeof window === "undefined") return;
            window.dispatchEvent(new CustomEvent("dossier:toggle-shortcuts"));
          }}
          className={cn(
            "hidden sm:inline-flex items-center justify-center w-9 h-9",
            "rounded-[var(--radius-sm)] text-[var(--color-ink-2)]",
            "hover:bg-[var(--color-paper-3)] transition-colors duration-150",
          )}
        >
          <Keyboard size={18} strokeWidth={1.5} aria-hidden />
        </button>

        <a
          href="https://github.com/Abdalla-Eldoumani/dossier"
          target="_blank"
          rel="noreferrer"
          className={cn(
            "hidden sm:inline-flex items-center px-3 h-9 rounded-[var(--radius-sm)]",
            "text-[13px] font-medium text-[var(--color-ink-2)]",
            "hover:bg-[var(--color-paper-3)] transition-colors duration-150",
          )}
        >
          Source
        </a>

        <button
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className={cn(
            "inline-flex items-center justify-center w-9 h-9",
            "rounded-[var(--radius-sm)] text-[var(--color-ink-2)]",
            "hover:bg-[var(--color-paper-3)] transition-colors duration-150",
          )}
        >
          {mounted && resolvedTheme === "dark" ? (
            <Sun size={18} strokeWidth={1.5} aria-hidden />
          ) : (
            <Moon size={18} strokeWidth={1.5} aria-hidden />
          )}
        </button>
      </div>
    </header>
  );
}
