// Fill AcroForm fields from a name → value map. Rejects unknown field names
// and type-mismatched values with INVALID_INPUT so the caller can fix the
// payload rather than get a surprise. Multi-select option lists accept the
// same shape as dropdowns (one selected value at a time); for richer
// multi-selection, switch to a dedicated tool.

import { z } from "zod";
import {
  PDFCheckBox,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
} from "pdf-lib";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { OperationError } from "../types/errors.js";
import { loadPdf } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";

export const FillFormSchema = z.record(z.string(), z.union([z.string(), z.boolean()]));

export type FillFormValues = Record<string, string | boolean>;

export async function fillForm(input: PDFInput, values: FillFormValues): Promise<PDFOutput> {
  if (typeof values !== "object" || values === null || Array.isArray(values)) {
    throw new OperationError("INVALID_INPUT", "fillForm requires a values object.");
  }

  const doc = await loadPdf(input);
  const form = doc.getForm();
  const knownNames = new Set(form.getFields().map((f) => f.getName()));

  for (const [name, value] of Object.entries(values)) {
    if (!knownNames.has(name)) {
      throw new OperationError(
        "INVALID_INPUT",
        `Unknown form field "${name}". Available fields: ${[...knownNames].join(", ") || "(none)"}.`,
      );
    }
    const field = form.getField(name);

    if (field instanceof PDFTextField) {
      if (typeof value !== "string") {
        throw new OperationError(
          "INVALID_INPUT",
          `Text field "${name}" requires a string value, got ${typeof value}.`,
        );
      }
      field.setText(value);
      continue;
    }
    if (field instanceof PDFCheckBox) {
      if (typeof value !== "boolean") {
        throw new OperationError(
          "INVALID_INPUT",
          `Checkbox "${name}" requires a boolean value, got ${typeof value}.`,
        );
      }
      if (value) field.check();
      else field.uncheck();
      continue;
    }
    if (
      field instanceof PDFRadioGroup ||
      field instanceof PDFDropdown ||
      field instanceof PDFOptionList
    ) {
      if (typeof value !== "string") {
        throw new OperationError(
          "INVALID_INPUT",
          `Selection field "${name}" requires a string value, got ${typeof value}.`,
        );
      }
      field.select(value);
      continue;
    }
    throw new OperationError(
      "UNSUPPORTED_FEATURE",
      `Field "${name}" has a type fillForm does not support (e.g. signature, button).`,
    );
  }

  return savePdf(doc, { operation: "fill-form" });
}
