// Clear the Info dict (Title, Author, Subject, Keywords, Creator, Producer)
// and remove the XMP /Metadata stream from the document catalog. pdf-lib will
// still write a Producer string of its own on save — that's a library
// signature rather than user metadata; the notes flag calls it out.

import { z } from "zod";
import { PDFName } from "pdf-lib";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { loadPdf } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";

export const StripMetadataSchema = z.object({});

export async function stripMetadata(input: PDFInput): Promise<PDFOutput> {
  const doc = await loadPdf(input);

  doc.setTitle("");
  doc.setAuthor("");
  doc.setSubject("");
  doc.setKeywords([]);
  doc.setProducer("");
  doc.setCreator("");

  doc.catalog.delete(PDFName.of("Metadata"));

  return savePdf(doc, {
    operation: "strip-metadata",
    notes: [
      "Cleared Title/Author/Subject/Keywords/Creator/Producer and removed XMP metadata. pdf-lib re-emits its own Producer string on save; that's library identification, not user data.",
    ],
  });
}
