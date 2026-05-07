import { create } from "zustand";

// All app state lives here. The whole app is one page; we use Zustand instead of URL state
// because URLs would leak which operations a user is performing — even on a static export
// where there's no server, browser history sync via cloud (Chrome Sync, etc.) could see it.

export interface StagedFile {
  name: string;
  size: number; // bytes
  bytes: Uint8Array;
  pageCount?: number; // populated lazily after first parse
}

interface AppState {
  activeOperationId: string;
  setActiveOperationId: (id: string) => void;

  staged: StagedFile | null;
  setStaged: (file: StagedFile | null) => void;
  clearStaged: () => void;

  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeOperationId: "merge",
  setActiveOperationId: (id) => set({ activeOperationId: id }),

  staged: null,
  setStaged: (file) => set({ staged: file }),
  clearStaged: () => set({ staged: null }),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
