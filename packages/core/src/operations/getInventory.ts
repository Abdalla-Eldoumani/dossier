// Walk the document and report a high-level inventory: embedded fonts,
// images, presence of JavaScript actions, and presence of file attachments.
// Used by the UI's inspector panel and as a smell-test before running other
// operations.

import { z } from "zod";
import { PDFArray, PDFDict, PDFName, PDFNumber, PDFRawStream, PDFRef } from "pdf-lib";
import type { PDFDocument } from "pdf-lib";
import type { PDFInput } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { loadPdf } from "../internal/loadPdf.js";

export const GetInventorySchema = z.object({});

export interface FontInventoryItem {
  baseFont: string;
  subtype: string;
  embedded: boolean;
}

export interface ImageInventoryItem {
  width: number;
  height: number;
  bytes: number;
  filter?: string;
}

export interface PdfInventory {
  fonts: FontInventoryItem[];
  images: ImageInventoryItem[];
  javascript: boolean;
  attachments: boolean;
}

function nameToString(value: unknown): string {
  if (value instanceof PDFName) return value.asString().replace(/^\//, "");
  return "";
}

function filterOf(stream: PDFRawStream): string | undefined {
  const filter = stream.dict.get(PDFName.of("Filter"));
  if (filter instanceof PDFName) return filter.asString();
  if (filter instanceof PDFArray && filter.size() > 0) {
    const items: string[] = [];
    for (let i = 0; i < filter.size(); i++) {
      const item = filter.get(i);
      if (item instanceof PDFName) items.push(item.asString());
    }
    return items.length > 0 ? items.join("+") : undefined;
  }
  return undefined;
}

function isEmbeddedFont(dict: PDFDict, doc: PDFDocument): boolean {
  const descRef = dict.get(PDFName.of("FontDescriptor"));
  let desc: PDFDict | undefined;
  if (descRef instanceof PDFDict) desc = descRef;
  else if (descRef instanceof PDFRef) {
    const resolved = doc.context.lookup(descRef);
    if (resolved instanceof PDFDict) desc = resolved;
  }
  if (!desc) return false;
  return (
    desc.get(PDFName.of("FontFile")) !== undefined ||
    desc.get(PDFName.of("FontFile2")) !== undefined ||
    desc.get(PDFName.of("FontFile3")) !== undefined
  );
}

function hasJavaScript(doc: PDFDocument): boolean {
  const namesValue = doc.catalog.get(PDFName.of("Names"));
  let namesDict: PDFDict | undefined;
  if (namesValue instanceof PDFDict) namesDict = namesValue;
  else if (namesValue instanceof PDFRef) {
    const resolved = doc.context.lookup(namesValue);
    if (resolved instanceof PDFDict) namesDict = resolved;
  }
  if (namesDict && namesDict.get(PDFName.of("JavaScript")) !== undefined) return true;
  if (doc.catalog.get(PDFName.of("AA")) !== undefined) return true;
  return false;
}

function hasAttachments(doc: PDFDocument): boolean {
  const namesValue = doc.catalog.get(PDFName.of("Names"));
  let namesDict: PDFDict | undefined;
  if (namesValue instanceof PDFDict) namesDict = namesValue;
  else if (namesValue instanceof PDFRef) {
    const resolved = doc.context.lookup(namesValue);
    if (resolved instanceof PDFDict) namesDict = resolved;
  }
  if (namesDict && namesDict.get(PDFName.of("EmbeddedFiles")) !== undefined) return true;
  return false;
}

export async function getInventory(input: PDFInput): Promise<PdfInventory> {
  let doc;
  try {
    doc = await loadPdf(input, { ignoreEncryption: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new OperationError("INVALID_PDF", `Failed to parse PDF: ${message}`);
  }

  const fonts: FontInventoryItem[] = [];
  const images: ImageInventoryItem[] = [];
  const seenFontKeys = new Set<string>();

  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    if (object instanceof PDFRawStream) {
      const subtype = object.dict.get(PDFName.of("Subtype"));
      if (subtype instanceof PDFName && subtype.asString() === "/Image") {
        const w = object.dict.get(PDFName.of("Width"));
        const h = object.dict.get(PDFName.of("Height"));
        const width = w instanceof PDFNumber ? w.asNumber() : 0;
        const height = h instanceof PDFNumber ? h.asNumber() : 0;
        const filter = filterOf(object);
        const item: ImageInventoryItem = {
          width,
          height,
          bytes: object.contents.byteLength,
        };
        if (filter) item.filter = filter;
        images.push(item);
      }
      continue;
    }
    if (object instanceof PDFDict) {
      const type = object.get(PDFName.of("Type"));
      if (type instanceof PDFName && type.asString() === "/Font") {
        const baseFont = nameToString(object.get(PDFName.of("BaseFont")));
        const subtype = nameToString(object.get(PDFName.of("Subtype")));
        const key = `${baseFont}|${subtype}`;
        if (seenFontKeys.has(key)) continue;
        seenFontKeys.add(key);
        fonts.push({
          baseFont,
          subtype,
          embedded: isEmbeddedFont(object, doc),
        });
      }
    }
  }

  return {
    fonts,
    images,
    javascript: hasJavaScript(doc),
    attachments: hasAttachments(doc),
  };
}
