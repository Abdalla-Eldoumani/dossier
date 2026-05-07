import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { flattenForm } from "./flattenForm.js";

async function pdfWithFilledForm(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const form = doc.getForm();

  const text = form.createTextField("name");
  text.setText("Margaret Hamilton");
  text.addToPage(page, { x: 100, y: 700, width: 200, height: 30 });

  const checkbox = form.createCheckBox("agree");
  checkbox.check();
  checkbox.addToPage(page, { x: 100, y: 660, width: 16, height: 16 });

  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("flattenForm", () => {
  it("removes interactive form fields", async () => {
    const input = await pdfWithFilledForm();
    const out = await flattenForm(input);
    const doc = await PDFDocument.load(out.bytes);
    expect(doc.getForm().getFields()).toHaveLength(0);
    expect(out.meta.operation).toBe("flatten-form");
  });

  it("reports the number of fields flattened in notes", async () => {
    const input = await pdfWithFilledForm();
    const out = await flattenForm(input);
    expect(out.meta.notes?.some((n) => /Flattened 2 form field/.test(n))).toBe(true);
  });

  it("notes when there were no form fields to flatten", async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const bytes = await doc.save();
    const out = await flattenForm(
      bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes),
    );
    expect(out.meta.notes?.some((n) => /No form fields present/.test(n))).toBe(true);
  });
});
