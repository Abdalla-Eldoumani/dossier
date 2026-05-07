// Replace the document outline with a fresh tree of bookmarks. Each
// BookmarkNode becomes an outline-item dict with the right Parent / First /
// Last / Next / Prev / Count / Dest links wired up. Passing an empty array
// removes the outline entirely.

import { z } from "zod";
import { PDFDict, PDFName, PDFNumber, PDFRef, PDFString } from "pdf-lib";
import type { PDFDocument } from "pdf-lib";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { loadPdf } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";
import type { BookmarkNode } from "./getBookmarks.js";

export const BookmarkNodeSchema: z.ZodType<BookmarkNode> = z.lazy(() =>
  z.object({
    title: z.string(),
    pageIndex: z.number().int().nonnegative().optional(),
    children: z.array(BookmarkNodeSchema).optional(),
  }),
);

export const SetBookmarksSchema = z.array(BookmarkNodeSchema);

interface BuildResult {
  firstRef: PDFRef;
  lastRef: PDFRef;
  visibleDescendants: number;
}

function destForPage(doc: PDFDocument, pageIndex: number): unknown {
  const pages = doc.getPages();
  const page = pages[pageIndex];
  if (!page) return undefined;
  return doc.context.obj([page.ref, PDFName.of("Fit")]);
}

function buildSiblings(
  doc: PDFDocument,
  siblings: BookmarkNode[],
  parentRef: PDFRef,
): BuildResult {
  const dicts: PDFDict[] = [];
  const refs: PDFRef[] = [];
  for (const node of siblings) {
    const dest =
      node.pageIndex !== undefined ? destForPage(doc, node.pageIndex) : undefined;
    const dict = doc.context.obj({
      Title: PDFString.of(node.title),
      Parent: parentRef,
      ...(dest ? { Dest: dest } : {}),
    });
    if (!(dict instanceof PDFDict)) {
      throw new OperationError(
        "OPERATION_FAILED",
        "Could not construct outline item dict.",
      );
    }
    const ref = doc.context.register(dict);
    dicts.push(dict);
    refs.push(ref);
  }

  // Sibling links
  for (let i = 0; i < dicts.length; i++) {
    if (i > 0) dicts[i]!.set(PDFName.of("Prev"), refs[i - 1]!);
    if (i < dicts.length - 1) dicts[i]!.set(PDFName.of("Next"), refs[i + 1]!);
  }

  let descendants = siblings.length;
  for (let i = 0; i < siblings.length; i++) {
    const node = siblings[i]!;
    if (node.children && node.children.length > 0) {
      const child = buildSiblings(doc, node.children, refs[i]!);
      dicts[i]!.set(PDFName.of("First"), child.firstRef);
      dicts[i]!.set(PDFName.of("Last"), child.lastRef);
      dicts[i]!.set(
        PDFName.of("Count"),
        PDFNumber.of(child.visibleDescendants),
      );
      descendants += child.visibleDescendants;
    }
  }

  return {
    firstRef: refs[0]!,
    lastRef: refs[refs.length - 1]!,
    visibleDescendants: descendants,
  };
}

export async function setBookmarks(
  input: PDFInput,
  bookmarks: BookmarkNode[],
): Promise<PDFOutput> {
  if (!Array.isArray(bookmarks)) {
    throw new OperationError(
      "INVALID_INPUT",
      "setBookmarks requires an array of BookmarkNode.",
    );
  }

  const doc = await loadPdf(input);

  if (bookmarks.length === 0) {
    doc.catalog.delete(PDFName.of("Outlines"));
    return savePdf(doc, {
      operation: "set-bookmarks",
      notes: ["Bookmarks cleared (input had an Outlines entry; output does not)."],
    });
  }

  const rootDict = doc.context.obj({ Type: "Outlines" });
  if (!(rootDict instanceof PDFDict)) {
    throw new OperationError(
      "OPERATION_FAILED",
      "Could not construct outline root dict.",
    );
  }
  const rootRef = doc.context.register(rootDict);

  const built = buildSiblings(doc, bookmarks, rootRef);
  rootDict.set(PDFName.of("First"), built.firstRef);
  rootDict.set(PDFName.of("Last"), built.lastRef);
  rootDict.set(PDFName.of("Count"), PDFNumber.of(built.visibleDescendants));

  doc.catalog.set(PDFName.of("Outlines"), rootRef);

  return savePdf(doc, {
    operation: "set-bookmarks",
    notes: [`Wrote ${built.visibleDescendants} bookmark(s).`],
  });
}
