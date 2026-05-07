"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { PdfInfo, PdfInventory } from "@dossier/core";
import { useAppStore } from "@/lib/store";
import { usePdfWorker } from "@/lib/usePdfWorker";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";

interface InfoData {
  info: PdfInfo;
  inventory: PdfInventory;
}

export function InfoOperation() {
  const staged = useAppStore((s) => s.staged);
  const worker = usePdfWorker();
  const [data, setData] = useState<InfoData | null>(null);

  useEffect(() => {
    if (!staged || !worker) return;
    let cancelled = false;
    announce("Inspecting PDF…");
    Promise.all([worker.getInfo(staged.bytes), worker.getInventory(staged.bytes)])
      .then(([info, inventory]) => {
        if (!cancelled) {
          setData({ info, inventory });
          announce(`Inspection ready. ${info.pageCount} pages, ${inventory.fonts.length} fonts.`);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        toast.error("Could not inspect PDF.", {
          description: err instanceof Error ? err.message : String(err),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [staged, worker]);

  if (!data) {
    return <p className="text-[14px] text-[var(--color-ink-3)]">Inspecting…</p>;
  }
  const { info, inventory } = data;

  return (
    <div className="space-y-8">
      <Section title="Document">
        <Row label="Pages" value={String(info.pageCount)} />
        <Row label="PDF version" value={info.pdfVersion} />
        <Row label="Encrypted" value={info.encrypted ? "yes" : "no"} />
        <Row label="File size" value={formatBytes(info.fileSize)} />
      </Section>

      <Section title={`Pages (${info.pages.length})`}>
        <ul className="space-y-1">
          {info.pages.slice(0, 20).map((p, i) => (
            <li
              key={i}
              className="grid grid-cols-[80px_1fr] gap-3 text-[13px]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <span className="text-[var(--color-ink-3)]">Page {i + 1}</span>
              <span>
                {p.width.toFixed(0)} × {p.height.toFixed(0)} pt
                {p.rotation ? ` · rotated ${p.rotation}°` : ""}
              </span>
            </li>
          ))}
          {info.pages.length > 20 && (
            <li className="text-[13px] text-[var(--color-ink-3)] italic">
              … {info.pages.length - 20} more pages
            </li>
          )}
        </ul>
      </Section>

      <Section title={`Fonts (${inventory.fonts.length})`}>
        {inventory.fonts.length === 0 ? (
          <Empty>No font dictionaries.</Empty>
        ) : (
          <ul className="space-y-1">
            {inventory.fonts.map((f, i) => (
              <li
                key={i}
                className="grid grid-cols-[1fr_auto] gap-3 text-[13px]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <span>{f.baseFont || "(unnamed)"}</span>
                <span className="text-[var(--color-ink-3)]">
                  {f.subtype}
                  {f.embedded ? " · embedded" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Images (${inventory.images.length})`}>
        {inventory.images.length === 0 ? (
          <Empty>No image XObjects.</Empty>
        ) : (
          <ul className="space-y-1">
            {inventory.images.slice(0, 20).map((img, i) => (
              <li
                key={i}
                className="grid grid-cols-[1fr_auto] gap-3 text-[13px]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <span>
                  {img.width} × {img.height}
                </span>
                <span className="text-[var(--color-ink-3)]">
                  {img.filter ?? "—"} · {formatBytes(img.bytes)}
                </span>
              </li>
            ))}
            {inventory.images.length > 20 && (
              <li className="text-[13px] text-[var(--color-ink-3)] italic">
                … {inventory.images.length - 20} more images
              </li>
            )}
          </ul>
        )}
      </Section>

      <Section title="Other">
        <Row label="JavaScript present" value={inventory.javascript ? "yes" : "no"} />
        <Row label="Embedded attachments" value={inventory.attachments ? "yes" : "no"} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2
        className="text-[12px] uppercase tracking-[0.08em] mb-3 text-[var(--color-ink-3)] font-medium"
      >
        {title}
      </h2>
      <div
        className={cn(
          "rounded-[var(--radius)] border border-[var(--color-rule)]",
          "bg-[var(--color-paper-2)] px-4 py-3",
        )}
      >
        {children}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3 text-[13px] py-1">
      <span className="text-[var(--color-ink-3)]">{label}</span>
      <span style={{ fontFamily: "var(--font-mono)" }}>{value}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] italic text-[var(--color-ink-3)]">{children}</p>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
