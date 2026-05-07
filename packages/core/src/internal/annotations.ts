// Shared helpers for annotation operations. pdf-lib doesn't expose public
// methods for adding arbitrary annotations, so each helper here reaches into
// the page node's Annots entry and updates it in place.
//
// pdf-lib's PDFPageLeaf.Annots() returns the resolved PDFArray (or undefined),
// not a PDFRef — refs are followed inside lookup() — so we never need to
// branch on PDFRef here.

import { PDFArray, PDFName, PDFRef } from "pdf-lib";
import type { PDFDocument, PDFPage } from "pdf-lib";

const ANNOTS_KEY = PDFName.of("Annots");

export function appendAnnotation(page: PDFPage, annotRef: PDFRef, doc: PDFDocument): void {
  const existing = page.node.Annots();
  if (existing instanceof PDFArray) {
    existing.push(annotRef);
    return;
  }
  page.node.set(ANNOTS_KEY, doc.context.obj([annotRef]));
}

export function getAnnotationArray(page: PDFPage, _doc: PDFDocument): PDFArray | undefined {
  const existing = page.node.Annots();
  return existing instanceof PDFArray ? existing : undefined;
}

export function clearAnnotations(page: PDFPage): void {
  page.node.delete(ANNOTS_KEY);
}
