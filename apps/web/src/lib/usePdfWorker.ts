"use client";

import { useEffect, useState } from "react";
import * as Comlink from "comlink";
import type { PdfWorkerApi } from "@/workers/pdf.worker";

type WorkerHandle = {
  worker: Worker;
  proxy: Comlink.Remote<PdfWorkerApi>;
};

function createWorker(): WorkerHandle | null {
  if (typeof window === "undefined") return null;
  const worker = new Worker(
    new URL("../workers/pdf.worker.ts", import.meta.url),
    { type: "module" },
  );
  return { worker, proxy: Comlink.wrap<PdfWorkerApi>(worker) };
}

// Instantiates the Worker once per hook user, keeps the Comlink proxy stable across renders.
// Terminate on unmount so dev hot-reloads don't leak workers.

export function usePdfWorker() {
  const [handle] = useState<WorkerHandle | null>(createWorker);

  useEffect(() => {
    return () => {
      handle?.worker.terminate();
    };
  }, [handle]);

  return handle?.proxy ?? null;
}
