// Read every AcroForm field on a PDF and surface a JSON-friendly snapshot.
// XFA forms aren't supported by pdf-lib; on a pure-XFA PDF this returns an
// empty array (form.getFields() finds nothing), which is the same signal a
// caller would get from a PDF with no form at all. The MCP tool layer can
// detect XFA separately and warn.

import { z } from "zod";
import {
  PDFButton,
  PDFCheckBox,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFSignature,
  PDFTextField,
} from "pdf-lib";
import type { PDFInput } from "../types/index.js";
import { loadPdf } from "../internal/loadPdf.js";

export const GetFormFieldsSchema = z.object({});

export type FormFieldType =
  | "text"
  | "checkbox"
  | "radio"
  | "dropdown"
  | "optionlist"
  | "button"
  | "signature"
  | "unknown";

export interface FormField {
  name: string;
  type: FormFieldType;
  value: string | boolean | string[] | undefined;
  options?: string[];
  readOnly: boolean;
}

export async function getFormFields(input: PDFInput): Promise<FormField[]> {
  const doc = await loadPdf(input);
  const form = doc.getForm();
  const fields = form.getFields();

  return fields.map((field): FormField => {
    const name = field.getName();
    const readOnly = field.isReadOnly();

    if (field instanceof PDFTextField) {
      return { name, type: "text", value: field.getText() ?? "", readOnly };
    }
    if (field instanceof PDFCheckBox) {
      return { name, type: "checkbox", value: field.isChecked(), readOnly };
    }
    if (field instanceof PDFRadioGroup) {
      return {
        name,
        type: "radio",
        value: field.getSelected() ?? "",
        options: field.getOptions(),
        readOnly,
      };
    }
    if (field instanceof PDFDropdown) {
      return {
        name,
        type: "dropdown",
        value: field.getSelected() ?? [],
        options: field.getOptions(),
        readOnly,
      };
    }
    if (field instanceof PDFOptionList) {
      return {
        name,
        type: "optionlist",
        value: field.getSelected() ?? [],
        options: field.getOptions(),
        readOnly,
      };
    }
    if (field instanceof PDFButton) {
      return { name, type: "button", value: undefined, readOnly };
    }
    if (field instanceof PDFSignature) {
      return { name, type: "signature", value: undefined, readOnly };
    }
    return { name, type: "unknown", value: undefined, readOnly };
  });
}
