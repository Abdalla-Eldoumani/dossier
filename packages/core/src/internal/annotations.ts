// Shared helpers for annotation operations. pdf-lib doesn't expose public
// methods for adding arbitrary annotations, so each helper here reaches into
// the page node's Annots entry and updates it in place.

import { PDFArray, PDFName, PDFRef } from "pdf-lib";
import type { PDFDocument, PDFPage } from "pdf-lib";

const ANNOTS_KEY = PDFName.of("Annots");

export function appendAnnotation(page: PDFPage, annotRef: PDFRef, doc: PDFDocument): void {
  const existing = page.node.Annots();
  if (!existing) {
    page.node.set(ANNOTS_KEY, doc.context.obj([annotRef]));
    return;
  }
  let array: PDFArray | undefined;
  if (existing instanceof PDFArray) {
    array = existing;
  } else if (existing instanceof PDFRef) {
    const resolved = doc.context.lookup(existing);
    if (resolved instanceof PDFArray) array = resolved;
  }
  if (array) {
    array.push(annotRef);
  } else {
    page.node.set(ANNOTS_KEY, doc.context.obj([annotRef]));
  }
}

export function getAnnotationArray(page: PDFPage, doc: PDFDocument): PDFArray | undefined {
  const existing = page.node.Annots();
  if (!existing) return undefined;
  if (existing instanceof PDFArray) return existing;
  if (existing instanceof PDFRef) {
    const resolved = doc.context.lookup(existing);
    if (resolved instanceof PDFArray) return resolved;
  }
  return undefined;
}

export function clearAnnotations(page: PDFPage): void {
  page.node.delete(ANNOTS_KEY);
}
