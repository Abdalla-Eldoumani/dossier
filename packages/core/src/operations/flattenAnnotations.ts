// Bake /Text and /Highlight annotations into the page content stream and
// remove them from the page's Annots array. After flattening, viewers without
// annotation support still see the marks, and the annotations no longer sit
// in the file as interactive objects.
//
// What's handled:
//   - /Text  : a small yellow square + the first 60 chars of Contents drawn next to it
//   - /Highlight : a translucent coloured rectangle over the annotation's Rect
//
// Other annotation subtypes (Link, Stamp, etc.) are left intact and counted
// in the notes flag.

import { z } from "zod";
import {
  PDFArray,
  PDFDict,
  PDFName,
  PDFNumber,
  PDFRef,
  PDFString,
  StandardFonts,
  rgb,
} from "pdf-lib";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { loadPdf } from "../internal/loadPdf.js";
import { savePdf } from "../internal/savePdf.js";
import { getAnnotationArray, clearAnnotations } from "../internal/annotations.js";

export const FlattenAnnotationsSchema = z.object({});

export async function flattenAnnotations(input: PDFInput): Promise<PDFOutput> {
  const doc = await loadPdf(input);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  let textFlattened = 0;
  let highlightFlattened = 0;
  let kept = 0;

  for (const page of doc.getPages()) {
    const array = getAnnotationArray(page, doc);
    if (!array) continue;

    const survivors: PDFRef[] = [];
    const totalEntries = array.size();
    for (let i = 0; i < totalEntries; i++) {
      const item = array.get(i);
      if (!(item instanceof PDFRef)) continue;
      const annot = doc.context.lookup(item);
      if (!(annot instanceof PDFDict)) {
        survivors.push(item);
        continue;
      }
      const subtype = annot.get(PDFName.of("Subtype"));
      const subtypeName = subtype instanceof PDFName ? subtype.asString() : "";

      if (subtypeName === "/Text") {
        const rect = annot.get(PDFName.of("Rect"));
        const contents = annot.get(PDFName.of("Contents"));
        if (rect instanceof PDFArray && rect.size() >= 4) {
          const x = (rect.get(0) as PDFNumber).asNumber();
          const y = (rect.get(1) as PDFNumber).asNumber();
          const x2 = (rect.get(2) as PDFNumber).asNumber();
          const y2 = (rect.get(3) as PDFNumber).asNumber();
          page.drawRectangle({
            x,
            y,
            width: x2 - x,
            height: y2 - y,
            color: rgb(1, 0.95, 0.55),
            borderColor: rgb(0.6, 0.5, 0.1),
            borderWidth: 0.5,
            opacity: 0.9,
          });
          if (contents instanceof PDFString) {
            const note = contents.asString().slice(0, 60);
            page.drawText(note, {
              x: x2 + 4,
              y: y + 4,
              size: 9,
              font,
              color: rgb(0.2, 0.2, 0.2),
            });
          }
          textFlattened++;
          continue;
        }
      }

      if (subtypeName === "/Highlight") {
        const rect = annot.get(PDFName.of("Rect"));
        const color = annot.get(PDFName.of("C"));
        if (rect instanceof PDFArray && rect.size() >= 4) {
          const x = (rect.get(0) as PDFNumber).asNumber();
          const y = (rect.get(1) as PDFNumber).asNumber();
          const x2 = (rect.get(2) as PDFNumber).asNumber();
          const y2 = (rect.get(3) as PDFNumber).asNumber();
          let r = 1;
          let g = 1;
          let b = 0;
          if (color instanceof PDFArray && color.size() >= 3) {
            r = (color.get(0) as PDFNumber).asNumber();
            g = (color.get(1) as PDFNumber).asNumber();
            b = (color.get(2) as PDFNumber).asNumber();
          }
          page.drawRectangle({
            x,
            y,
            width: x2 - x,
            height: y2 - y,
            color: rgb(r, g, b),
            opacity: 0.35,
          });
          highlightFlattened++;
          continue;
        }
      }

      survivors.push(item);
      kept++;
    }

    if (survivors.length === 0) {
      clearAnnotations(page);
    } else {
      page.node.set(PDFName.of("Annots"), doc.context.obj(survivors));
    }
  }

  return savePdf(doc, {
    operation: "flatten-annotations",
    notes: [
      `Flattened ${textFlattened} text and ${highlightFlattened} highlight annotation(s); ${kept} other annotation(s) preserved.`,
    ],
  });
}
