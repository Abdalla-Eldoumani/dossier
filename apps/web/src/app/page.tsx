"use client";

import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { OperationCanvas } from "@/components/OperationCanvas";

// The whole app is one page. Navigation is internal state — keeps the static export tiny
// and the URL stable when a user shares Dossier.
export default function Page() {
  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <OperationCanvas />
        </main>
      </div>
    </div>
  );
}
