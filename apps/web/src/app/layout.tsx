import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dossier",
  description:
    "A privacy-first PDF toolkit. Every operation runs locally in your browser. Files never leave your machine.",
  // Disable indexing of the static export by default. Maintainers can flip this when publishing.
  robots: { index: false, follow: false },
  openGraph: {
    title: "Dossier",
    description:
      "A privacy-first PDF toolkit. Every operation runs locally in your browser.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Two themed colours so the address bar tracks the active theme on mobile.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F4ED" },
    { media: "(prefers-color-scheme: dark)", color: "#14110D" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "var(--color-paper-2)",
                color: "var(--color-ink)",
                border: "1px solid var(--color-rule)",
                fontFamily: "var(--font-ui)",
                fontSize: "14px",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
