"use client";

// Two responsibilities:
//   1. Listens for the `?` key and toggles a Radix dialog listing every
//      keyboard shortcut Dossier honours, so the shortcuts are discoverable
//      without docs.
//   2. Wires a Ctrl/Cmd+B handler that toggles the sidebar, alongside the
//      shortcut entry that documents it.
//
// Editable elements (inputs, textareas, contenteditable) are exempt — typing
// "?" or pressing Ctrl+B inside an input must still produce the literal key.

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/cn";

export const TOGGLE_SHORTCUTS_EVENT = "dossier:toggle-shortcuts";

interface Shortcut {
  keys: string[];
  desc: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ["?"], desc: "Show or hide this overlay" },
  { keys: ["Esc"], desc: "Close dialogs and overlays" },
  { keys: ["Tab"], desc: "Move focus forward through the page" },
  { keys: ["Shift", "Tab"], desc: "Move focus backward" },
  { keys: ["Enter"], desc: "Activate the focused control" },
  { keys: ["Space"], desc: "Toggle the focused checkbox or button" },
  { keys: ["Ctrl/Cmd", "B"], desc: "Toggle the sidebar" },
];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLSelectElement) return true;
  if (target.isContentEditable) return true;
  return false;
}

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      // "?" — toggle overlay. Must check shifted "/" too because some keyboards
      // produce key === "?" but others fire shift + "/".
      if ((e.key === "?" || (e.shiftKey && e.key === "/")) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      // Ctrl/Cmd+B — toggle sidebar.
      if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B") && !e.altKey) {
        e.preventDefault();
        toggleSidebar();
      }
    };
    const toggleHandler = () => setOpen((v) => !v);
    window.addEventListener("keydown", handler);
    window.addEventListener(TOGGLE_SHORTCUTS_EVENT, toggleHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener(TOGGLE_SHORTCUTS_EVENT, toggleHandler);
    };
  }, [toggleSidebar]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
            "rounded-[var(--radius)] border border-[var(--color-rule)]",
            "bg-[var(--color-paper)] shadow-[var(--shadow-3)]",
            "p-6 max-w-lg w-[calc(100vw-2rem)]",
          )}
        >
          <div className="flex items-start justify-between mb-4">
            <Dialog.Title
              className="text-[20px] font-medium"
              style={{ fontFamily: "var(--font-display)", fontVariationSettings: '"SOFT" 50' }}
            >
              Keyboard shortcuts
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label="Close"
                className={cn(
                  "inline-flex items-center justify-center w-8 h-8 -mr-1",
                  "rounded-[var(--radius-sm)] text-[var(--color-ink-2)]",
                  "hover:bg-[var(--color-paper-3)] transition-colors duration-150",
                )}
              >
                <X size={16} strokeWidth={1.5} aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="text-[13px] text-[var(--color-ink-3)] mb-4">
            Every operation is also reachable with a mouse or touch — these are surfaces
            for keyboard-first workflows.
          </Dialog.Description>

          <ul className="space-y-2">
            {SHORTCUTS.map((s, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-4 text-[14px]"
              >
                <span className="text-[var(--color-ink-2)]">{s.desc}</span>
                <span className="flex gap-1 shrink-0">
                  {s.keys.map((k, j) => (
                    <kbd
                      key={j}
                      className={cn(
                        "inline-flex items-center justify-center min-w-[28px] h-7 px-2",
                        "rounded-[var(--radius-sm)] border border-[var(--color-rule-2)]",
                        "bg-[var(--color-paper-2)] text-[12px] text-[var(--color-ink)]",
                      )}
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {k}
                    </kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
