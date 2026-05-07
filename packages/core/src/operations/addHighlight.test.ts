import { describe, it, expect } from "vitest";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRef } from "pdf-lib";
import { addHighlight } from "./addHighlight.js";

async function blankPdfBytes(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

async function readAnnotations(bytes: Uint8Array): Promise<PDFDict[]> {
  const doc = await PDFDocument.load(bytes);
  const ref = doc.getPage(0).node.Annots();
  if (!ref) return [];
  let arr: PDFArray | undefined;
  if (ref instanceof PDFArray) arr = ref;
  else if (ref instanceof PDFRef) {
    const r = doc.context.lookup(ref);
    if (r instanceof PDFArray) arr = r;
  }
  if (!arr) return [];
  const out: PDFDict[] = [];
  for (let i = 0; i < arr.size(); i++) {
    const item = arr.get(i);
    const resolved = item instanceof PDFRef ? doc.context.lookup(item) : item;
    if (resolved instanceof PDFDict) out.push(resolved);
  }
  return out;
}

describe("addHighlight", () => {
  it("adds a /Highlight annotation with the right Rect and QuadPoints", async () => {
    const input = await blankPdfBytes();
    const out = await addHighlight(input, 0, { x: 50, y: 100, width: 200, height: 30 });
    const annots = await readAnnotations(out.bytes);
    expect(annots).toHaveLength(1);
    const a = annots[0]!;
    expect(a.get(PDFName.of("Subtype"))?.toString()).toBe("/Highlight");
    // pageHeight 792, region y=100, height=30 → pdf y1=662 (bottom), y2=692 (top), x1=50, x2=250
    const rect = a.get(PDFName.of("Rect")) as PDFArray;
    expect((rect.get(0) as { asNumber(): number }).asNumber()).toBe(50);
    expect((rect.get(1) as { asNumber(): number }).asNumber()).toBe(662);
    expect((rect.get(2) as { asNumber(): number }).asNumber()).toBe(250);
    expect((rect.get(3) as { asNumber(): number }).asNumber()).toBe(692);

    const quads = a.get(PDFName.of("QuadPoints")) as PDFArray;
    expect(quads.size()).toBe(8);
    // top-left, top-right, bottom-left, bottom-right
    expect((quads.get(0) as { asNumber(): number }).asNumber()).toBe(50);
    expect((quads.get(1) as { asNumber(): number }).asNumber()).toBe(692);
    expect((quads.get(6) as { asNumber(): number }).asNumber()).toBe(250);
    expect((quads.get(7) as { asNumber(): number }).asNumber()).toBe(662);
  });

  it("uses yellow as the default color", async () => {
    const input = await blankPdfBytes();
    const out = await addHighlight(input, 0, { x: 0, y: 0, width: 100, height: 20 });
    const annots = await readAnnotations(out.bytes);
    const color = annots[0]!.get(PDFName.of("C")) as PDFArray;
    expect((color.get(0) as { asNumber(): number }).asNumber()).toBe(1);
    expect((color.get(1) as { asNumber(): number }).asNumber()).toBe(1);
    expect((color.get(2) as { asNumber(): number }).asNumber()).toBe(0);
  });

  it("respects a custom color", async () => {
    const input = await blankPdfBytes();
    const out = await addHighlight(
      input,
      0,
      { x: 0, y: 0, width: 100, height: 20 },
      { color: [0.5, 0.8, 0.2] },
    );
    const annots = await readAnnotations(out.bytes);
    const color = annots[0]!.get(PDFName.of("C")) as PDFArray;
    expect((color.get(0) as { asNumber(): number }).asNumber()).toBe(0.5);
    expect((color.get(2) as { asNumber(): number }).asNumber()).toBe(0.2);
  });

  it("rejects a region that exceeds the page", async () => {
    const input = await blankPdfBytes();
    await expect(
      addHighlight(input, 0, { x: 0, y: 0, width: 1000, height: 1000 }),
    ).rejects.toThrow(/exceeds page bounds/i);
  });

  it("rejects out-of-bounds pageIndex", async () => {
    const input = await blankPdfBytes();
    await expect(
      addHighlight(input, 99, { x: 0, y: 0, width: 100, height: 20 }),
    ).rejects.toThrow(/out of bounds/i);
  });
});
