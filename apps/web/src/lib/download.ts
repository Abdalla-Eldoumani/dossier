// Triggers a save of bytes to the user's filesystem.
//
// Uses the File System Access API when the browser exposes it, so the user
// gets a real "Save as" dialog and can pick a directory. Falls back to the
// classic `<a download>` click everywhere else (Firefox, Safari).
//
// Returns true if the file was written, false if the user cancelled the
// File System Access prompt. The anchor fallback is fire-and-forget — the
// browser owns the dialog after the click, so we always resolve true there.

"use client";

interface FileSystemHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream {
  write(data: Uint8Array<ArrayBuffer> | Blob): Promise<void>;
  close(): Promise<void>;
}

// SharedArrayBuffer requires cross-origin isolation that Dossier doesn't enable, so in
// practice every Uint8Array we receive is already ArrayBuffer-backed. TypeScript's strict
// generics still demand the narrowing — hand back a fresh copy so both Blob and the FSA
// writer accept the bytes.
function toArrayBufferBacked(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  copy.set(bytes);
  return copy as Uint8Array<ArrayBuffer>;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}

interface ShowSaveFilePicker {
  (options?: SaveFilePickerOptions): Promise<FileSystemHandle>;
}

export interface DownloadOptions {
  /** MIME type for the saved file. Default: application/pdf */
  mimeType?: string;
}

export async function downloadBytes(
  bytes: Uint8Array,
  suggestedName: string,
  options: DownloadOptions = {},
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const mimeType = options.mimeType ?? "application/pdf";
  const dotIndex = suggestedName.lastIndexOf(".");
  const ext = dotIndex >= 0 ? suggestedName.slice(dotIndex) : ".pdf";

  const showSaveFilePicker = (
    window as unknown as { showSaveFilePicker?: ShowSaveFilePicker }
  ).showSaveFilePicker;

  const data = toArrayBufferBacked(bytes);

  if (typeof showSaveFilePicker === "function") {
    try {
      const handle = await showSaveFilePicker({
        suggestedName,
        types: [{ accept: { [mimeType]: [ext] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(data);
      await writable.close();
      return true;
    } catch (err) {
      // User dismissed the picker — don't fall through, they meant to cancel.
      if (err instanceof DOMException && err.name === "AbortError") return false;
      // Anything else (permission errors, etc.) — fall through to the anchor fallback
      // so the user still gets their file.
    }
  }

  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so the browser has a moment to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
