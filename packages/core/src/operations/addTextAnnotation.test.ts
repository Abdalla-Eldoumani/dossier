import { describe, it, expect } from "vitest";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRef, PDFString } from "pdf-lib";
import { addTextAnnotation } from "./addTextAnnotation.js";

async function blankPdfBytes(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

async function readAnnotations(bytes: Uint8Array, pageIndex: number): Promise<PDFDict[]> {
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPage(pageIndex);
  const annotsRef = page.node.Annots();
  if (!annotsRef) return [];
  let array: PDFArray | undefined;
  if (annotsRef instanceof PDFArray) array = annotsRef;
  else if (annotsRef instanceof PDFRef) {
    const resolved = doc.context.lookup(annotsRef);
    if (resolved instanceof PDFArray) array = resolved;
  }
  if (!array) return [];
  const out: PDFDict[] = [];
  for (let i = 0; i < array.size(); i++) {
    const item = array.get(i);
    const resolved = item instanceof PDFRef ? doc.context.lookup(item) : item;
    if (resolved instanceof PDFDict) out.push(resolved);
  }
  return out;
}

describe("addTextAnnotation", () => {
  it("adds a /Text annotation with the supplied contents", async () => {
    const input = await blankPdfBytes();
    const out = await addTextAnnotation(input, 0, { x: 100, y: 100 }, "Reviewer note");
    const annots = await readAnnotations(out.bytes, 0);
    expect(annots).toHaveLength(1);
    const a = annots[0]!;
    expect(a.get(PDFName.of("Subtype"))?.toString()).toBe("/Text");
    const contents = a.get(PDFName.of("Contents"));
    expect(contents instanceof PDFString).toBe(true);
    expect((contents as PDFString).asString()).toBe("Reviewer note");
  });

  it("translates top-left position to PDF bottom-left coordinates", async () => {
    const input = await blankPdfBytes();
    const out = await addTextAnnotation(input, 0, { x: 50, y: 60 }, "x");
    const annots = await readAnnotations(out.bytes, 0);
    const rect = annots[0]!.get(PDFName.of("Rect"));
    expect(rect instanceof PDFArray).toBe(true);
    const arr = rect as PDFArray;
    // pageHeight 792 - top-left y 60 - icon size 24 = bottom y 708
    // top y is bottom + icon size = 732
    expect((arr.get(0) as { asNumber(): number }).asNumber()).toBe(50);
    expect((arr.get(1) as { asNumber(): number }).asNumber()).toBe(708);
    expect((arr.get(2) as { asNumber(): number }).asNumber()).toBe(74);
    expect((arr.get(3) as { asNumber(): number }).asNumber()).toBe(732);
  });

  it("uses the supplied icon name", async () => {
    const input = await blankPdfBytes();
    const out = await addTextAnnotation(
      input,
      0,
      { x: 0, y: 0 },
      "x",
      { iconName: "Comment" },
    );
    const annots = await readAnnotations(out.bytes, 0);
    expect(annots[0]!.get(PDFName.of("Name"))?.toString()).toBe("/Comment");
  });

  it("appends rather than replacing existing annotations", async () => {
    const input = await blankPdfBytes();
    let out = await addTextAnnotation(input, 0, { x: 10, y: 10 }, "first");
    out = await addTextAnnotation(out.bytes, 0, { x: 20, y: 20 }, "second");
    const annots = await readAnnotations(out.bytes, 0);
    expect(annots).toHaveLength(2);
  });

  it("rejects out-of-bounds pageIndex", async () => {
    const input = await blankPdfBytes();
    await expect(
      addTextAnnotation(input, 99, { x: 0, y: 0 }, "x"),
    ).rejects.toThrow(/out of bounds/i);
  });

  it("rejects empty text", async () => {
    const input = await blankPdfBytes();
    await expect(
      addTextAnnotation(input, 0, { x: 0, y: 0 }, ""),
    ).rejects.toThrow(/non-empty text/i);
  });
});
