import { describe, it, expect } from "vitest";
import { PDFCheckBox, PDFDocument, PDFTextField } from "pdf-lib";
import { fillForm } from "./fillForm.js";

async function pdfWithForm(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const form = doc.getForm();

  const text = form.createTextField("fullName");
  text.setText("");
  text.addToPage(page, { x: 100, y: 700, width: 200, height: 30 });

  const checkbox = form.createCheckBox("subscribe");
  checkbox.uncheck();
  checkbox.addToPage(page, { x: 100, y: 650, width: 16, height: 16 });

  const dropdown = form.createDropdown("country");
  dropdown.setOptions(["US", "UK", "CA"]);
  dropdown.addToPage(page, { x: 100, y: 600, width: 120, height: 24 });

  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("fillForm", () => {
  it("writes string values into text fields", async () => {
    const input = await pdfWithForm();
    const out = await fillForm(input, { fullName: "Grace Hopper" });
    const doc = await PDFDocument.load(out.bytes);
    const text = doc.getForm().getField("fullName") as PDFTextField;
    expect(text.getText()).toBe("Grace Hopper");
  });

  it("writes boolean values into checkboxes", async () => {
    const input = await pdfWithForm();
    const out = await fillForm(input, { subscribe: true });
    const doc = await PDFDocument.load(out.bytes);
    const checkbox = doc.getForm().getField("subscribe") as PDFCheckBox;
    expect(checkbox.isChecked()).toBe(true);
  });

  it("selects an option in a dropdown", async () => {
    const input = await pdfWithForm();
    const out = await fillForm(input, { country: "UK" });
    const doc = await PDFDocument.load(out.bytes);
    const dropdown = doc.getForm().getField("country");
    // Dropdown's selected option(s)
    expect((dropdown as unknown as { getSelected(): string[] }).getSelected()).toContain("UK");
  });

  it("rejects unknown field names", async () => {
    const input = await pdfWithForm();
    await expect(fillForm(input, { nope: "x" })).rejects.toThrow(/Unknown form field/);
  });

  it("rejects a boolean value for a text field", async () => {
    const input = await pdfWithForm();
    await expect(fillForm(input, { fullName: true })).rejects.toThrow(/string value/);
  });

  it("rejects a string value for a checkbox", async () => {
    const input = await pdfWithForm();
    await expect(fillForm(input, { subscribe: "yes" })).rejects.toThrow(/boolean value/);
  });
});
