import { describe, it, expect } from "vitest";
import { PDFArray, PDFDocument, PDFRef } from "pdf-lib";
import { addHighlight } from "./addHighlight.js";
import { addTextAnnotation } from "./addTextAnnotation.js";
import { flattenAnnotations } from "./flattenAnnotations.js";

async function blankPdfBytes(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

async function annotationCount(bytes: Uint8Array, pageIndex: number): Promise<number> {
  const doc = await PDFDocument.load(bytes);
  const ref = doc.getPage(pageIndex).node.Annots();
  if (!ref) return 0;
  let arr: PDFArray | undefined;
  if (ref instanceof PDFArray) arr = ref;
  else if (ref instanceof PDFRef) {
    const r = doc.context.lookup(ref);
    if (r instanceof PDFArray) arr = r;
  }
  return arr?.size() ?? 0;
}

describe("flattenAnnotations", () => {
  it("removes flattened text annotations from the Annots array", async () => {
    let bytes = await blankPdfBytes();
    bytes = (await addTextAnnotation(bytes, 0, { x: 50, y: 50 }, "important note")).bytes;
    expect(await annotationCount(bytes, 0)).toBe(1);

    const out = await flattenAnnotations(bytes);
    expect(await annotationCount(out.bytes, 0)).toBe(0);
    expect(out.meta.notes?.some((n) => /Flattened 1 text/.test(n))).toBe(true);
  });

  it("removes flattened highlight annotations", async () => {
    let bytes = await blankPdfBytes();
    bytes = (
      await addHighlight(bytes, 0, { x: 0, y: 0, width: 100, height: 20 })
    ).bytes;
    expect(await annotationCount(bytes, 0)).toBe(1);

    const out = await flattenAnnotations(bytes);
    expect(await annotationCount(out.bytes, 0)).toBe(0);
    expect(out.meta.notes?.some((n) => /1 highlight/.test(n))).toBe(true);
  });

  it("flattens a mix and reports both counts", async () => {
    let bytes = await blankPdfBytes();
    bytes = (await addTextAnnotation(bytes, 0, { x: 50, y: 50 }, "a")).bytes;
    bytes = (await addTextAnnotation(bytes, 0, { x: 100, y: 80 }, "b")).bytes;
    bytes = (
      await addHighlight(bytes, 0, { x: 0, y: 0, width: 100, height: 20 })
    ).bytes;
    expect(await annotationCount(bytes, 0)).toBe(3);

    const out = await flattenAnnotations(bytes);
    expect(await annotationCount(out.bytes, 0)).toBe(0);
    expect(out.meta.notes?.[0]).toMatch(/Flattened 2 text and 1 highlight/);
  });

  it("is a no-op when there are no annotations", async () => {
    const bytes = await blankPdfBytes();
    const out = await flattenAnnotations(bytes);
    expect(out.meta.notes?.[0]).toMatch(/Flattened 0 text and 0 highlight/);
  });
});
