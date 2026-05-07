// Subset embedded fonts to only the glyphs actually used by the document.
// Real subsetting requires reading TrueType/CFF font tables, walking the
// content streams to enumerate referenced glyphs, and rebuilding the font
// program — work pdf-lib doesn't expose. The operation accepts a
// FontSubsetter provider; without one it throws UnsupportedFeatureError, per
// the spec's "document and defer" allowance.

import { z } from "zod";
import type { PDFInput, PDFOutput } from "../types/index.js";
import { OperationError, UnsupportedFeatureError } from "../types/errors.js";
import { toBytes } from "../internal/loadPdf.js";

export const SubsetFontsSchema = z.object({});

export interface FontSubsetterReport {
  fontsScanned: number;
  fontsSubsetted: number;
  bytesSaved: number;
}

export interface FontSubsetter {
  subset(
    bytes: Uint8Array,
  ): Promise<{ bytes: Uint8Array; report?: Partial<FontSubsetterReport> }>;
}

export async function subsetFonts(
  input: PDFInput,
  subsetter?: FontSubsetter,
): Promise<PDFOutput> {
  if (!subsetter || typeof subsetter.subset !== "function") {
    throw new UnsupportedFeatureError(
      "subsetFonts requires a FontSubsetter provider. Real font subsetting needs " +
        "TrueType/CFF table surgery; pdf-lib's embedFont supports subsetting on initial " +
        "embed but does not subset already-embedded fonts in a loaded PDF. Inject a " +
        "provider (mupdf, fontkit + pdf-lib internals, etc.) when ready.",
    );
  }

  const inputBytes = toBytes(input);
  let result: { bytes: Uint8Array; report?: Partial<FontSubsetterReport> };
  try {
    result = await subsetter.subset(inputBytes);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new OperationError(
      "OPERATION_FAILED",
      `Font subsetting failed: ${message}`,
    );
  }

  const report = result.report ?? {};
  const scanned = report.fontsScanned ?? 0;
  const subsetted = report.fontsSubsetted ?? 0;
  const saved = report.bytesSaved ?? Math.max(0, inputBytes.byteLength - result.bytes.byteLength);

  return {
    bytes: result.bytes,
    meta: {
      pageCount: 0,
      fileSize: result.bytes.byteLength,
      operation: "subset-fonts",
      notes: [
        `Scanned ${scanned} font(s); subsetted ${subsetted}; saved ${saved} bytes.`,
      ],
    },
  };
}
