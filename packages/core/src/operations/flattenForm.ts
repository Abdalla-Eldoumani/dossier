// Bake AcroForm fields into static page content. After flattening, fields are
// no longer interactive and getFormFields will return an empty array.

import { z } from "zod";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { loadPdf } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";

export const FlattenFormSchema = z.object({});

export async function flattenForm(input: PDFInput): Promise<PDFOutput> {
  const doc = await loadPdf(input);
  const form = doc.getForm();
  const fieldCount = form.getFields().length;
  if (fieldCount === 0) {
    return savePdf(doc, {
      operation: "flatten-form",
      notes: ["No form fields present — output is the input parsed and re-saved."],
    });
  }
  form.flatten();
  return savePdf(doc, {
    operation: "flatten-form",
    notes: [`Flattened ${fieldCount} form field(s).`],
  });
}
