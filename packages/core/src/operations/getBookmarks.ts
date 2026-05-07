// Read the document outline (bookmarks) as a nested tree. PDF outlines are
// stored as a doubly-linked tree of dicts in /Outlines on the catalog, with
// each item carrying /First, /Last, /Next, /Prev, /Parent links and an
// optional /Dest array whose first element is a page reference.

import { z } from "zod";
import {
  PDFArray,
  PDFDict,
  PDFHexString,
  PDFName,
  PDFRef,
  PDFString,
} from "pdf-lib";
import type { PDFDocument } from "pdf-lib";
import type { PDFInput } from "../types/index.js";
import { loadPdf } from "../internal/loadPdf.js";

export const GetBookmarksSchema = z.object({});

export interface BookmarkNode {
  title: string;
  pageIndex?: number;
  children?: BookmarkNode[];
}

function asTitle(value: unknown): string {
  if (value instanceof PDFString) return value.asString();
  if (value instanceof PDFHexString) return value.decodeText();
  return "";
}

function buildPageRefMap(doc: PDFDocument): Map<PDFRef, number> {
  const map = new Map<PDFRef, number>();
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    map.set(pages[i]!.ref, i);
  }
  return map;
}

function destToPageIndex(
  dest: unknown,
  pageRefToIndex: Map<PDFRef, number>,
): number | undefined {
  if (!(dest instanceof PDFArray) || dest.size() === 0) return undefined;
  const first = dest.get(0);
  if (first instanceof PDFRef) return pageRefToIndex.get(first);
  return undefined;
}

function walkSiblings(
  doc: PDFDocument,
  firstRef: PDFRef | undefined,
  pageRefToIndex: Map<PDFRef, number>,
): BookmarkNode[] {
  const nodes: BookmarkNode[] = [];
  let cursor: PDFRef | undefined = firstRef;
  let safetyCounter = 0;
  while (cursor && safetyCounter < 10_000) {
    const itemDict = doc.context.lookup(cursor);
    if (!(itemDict instanceof PDFDict)) break;
    safetyCounter++;

    const title = asTitle(itemDict.get(PDFName.of("Title")));
    const pageIndex = destToPageIndex(itemDict.get(PDFName.of("Dest")), pageRefToIndex);

    const firstChild = itemDict.get(PDFName.of("First"));
    const children =
      firstChild instanceof PDFRef
        ? walkSiblings(doc, firstChild, pageRefToIndex)
        : undefined;

    const node: BookmarkNode = { title };
    if (pageIndex !== undefined) node.pageIndex = pageIndex;
    if (children && children.length > 0) node.children = children;
    nodes.push(node);

    const next = itemDict.get(PDFName.of("Next"));
    cursor = next instanceof PDFRef ? next : undefined;
  }
  return nodes;
}

export async function getBookmarks(input: PDFInput): Promise<BookmarkNode[]> {
  const doc = await loadPdf(input);
  const outlinesValue = doc.catalog.get(PDFName.of("Outlines"));
  let outlinesDict: PDFDict | undefined;
  if (outlinesValue instanceof PDFRef) {
    const resolved = doc.context.lookup(outlinesValue);
    if (resolved instanceof PDFDict) outlinesDict = resolved;
  } else if (outlinesValue instanceof PDFDict) {
    outlinesDict = outlinesValue;
  }
  if (!outlinesDict) return [];

  const firstRef = outlinesDict.get(PDFName.of("First"));
  if (!(firstRef instanceof PDFRef)) return [];

  const pageRefToIndex = buildPageRefMap(doc);
  return walkSiblings(doc, firstRef, pageRefToIndex);
}
