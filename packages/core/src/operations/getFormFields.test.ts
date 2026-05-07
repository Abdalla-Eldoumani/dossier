import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { getFormFields } from "./getFormFields.js";

async function pdfWithForm(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const form = doc.getForm();

  const text = form.createTextField("fullName");
  text.setText("Ada Lovelace");
  text.addToPage(page, { x: 100, y: 700, width: 200, height: 30 });

  const checkbox = form.createCheckBox("subscribe");
  checkbox.check();
  checkbox.addToPage(page, { x: 100, y: 650, width: 16, height: 16 });

  const dropdown = form.createDropdown("country");
  dropdown.setOptions(["US", "UK", "CA"]);
  dropdown.select("UK");
  dropdown.addToPage(page, { x: 100, y: 600, width: 120, height: 24 });

  const radio = form.createRadioGroup("colour");
  radio.addOptionToPage("red", page, { x: 100, y: 560, width: 16, height: 16 });
  radio.addOptionToPage("green", page, { x: 130, y: 560, width: 16, height: 16 });
  radio.select("green");

  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("getFormFields", () => {
  it("returns one entry per field with correct types", async () => {
    const input = await pdfWithForm();
    const fields = await getFormFields(input);
    expect(fields).toHaveLength(4);
    const byName = new Map(fields.map((f) => [f.name, f]));
    expect(byName.get("fullName")?.type).toBe("text");
    expect(byName.get("subscribe")?.type).toBe("checkbox");
    expect(byName.get("country")?.type).toBe("dropdown");
    expect(byName.get("colour")?.type).toBe("radio");
  });

  it("captures the current value of each field", async () => {
    const input = await pdfWithForm();
    const fields = await getFormFields(input);
    const byName = new Map(fields.map((f) => [f.name, f]));
    expect(byName.get("fullName")?.value).toBe("Ada Lovelace");
    expect(byName.get("subscribe")?.value).toBe(true);
    expect(byName.get("colour")?.value).toBe("green");
  });

  it("includes options for dropdowns and radios", async () => {
    const input = await pdfWithForm();
    const fields = await getFormFields(input);
    const byName = new Map(fields.map((f) => [f.name, f]));
    expect(byName.get("country")?.options).toEqual(["US", "UK", "CA"]);
    expect(byName.get("colour")?.options).toEqual(["red", "green"]);
  });

  it("returns an empty array for a PDF with no form", async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const bytes = await doc.save();
    const fields = await getFormFields(
      bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes),
    );
    expect(fields).toEqual([]);
  });

  it("rejects non-PDF input", async () => {
    const garbage = new TextEncoder().encode("not a pdf");
    await expect(getFormFields(garbage)).rejects.toThrow();
  });
});
