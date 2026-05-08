import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Not found · Dossier",
  description: "That page doesn't exist. Head back to the toolkit.",
};

export default function NotFound() {
  return (
    <main
      className="min-h-dvh flex items-center justify-center px-6"
      style={{ background: "var(--color-paper)", color: "var(--color-ink)" }}
    >
      <div className="max-w-md text-center">
        <p
          className="text-[12px] uppercase tracking-[0.2em] text-[var(--color-ink-3)] mb-4"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          404 · Not found
        </p>
        <h1
          className="text-[40px] md:text-[56px] mb-3"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontVariationSettings: '"SOFT" 100',
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          That page isn{"’"}t here.
        </h1>
        <p
          className="text-[16px] italic text-[var(--color-ink-2)] mb-8"
          style={{ fontFamily: "var(--font-display)", fontVariationSettings: '"SOFT" 50' }}
        >
          You either followed a stale link or typed something that doesn{"’"}t resolve.
          Either way, the toolkit is one click away.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-4 h-10 rounded-[var(--radius-sm)] font-medium transition-opacity duration-150 hover:opacity-90"
          style={{
            background: "var(--color-accent)",
            color: "var(--color-accent-ink)",
          }}
        >
          Back to Dossier
        </Link>
      </div>
    </main>
  );
}
