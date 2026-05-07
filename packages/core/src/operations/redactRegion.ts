// Region redaction. Drawing a black rectangle is NOT real redaction — the text
// and images underneath remain in the page content stream and are recoverable.
// True redaction requires rewriting the content stream to strip those objects.
// Until that's wired up via PDFium, this operation refuses loudly so callers
// can warn the user instead of silently producing an insecure file.
//
// See .agent/EDGE_CASES.md for the broader policy.

import { z } from "zod";
import type { PDFInput, PDFOutput, PageRegion } from "../types/index.js";
import { OperationError, UnsupportedFeatureError } from "../types/errors.js";
import { loadPdf } from "../internal/loadPdf.js";
import { PageRegionSchema } from "./cropPages.js";

export const RedactRegionSchema = z.object({
  pageIndex: z.number().int().nonnegative(),
  region: PageRegionSchema,
});

export async function redactRegion(
  input: PDFInput,
  pageIndex: number,
  region: PageRegion,
): Promise<PDFOutput> {
  if (!Number.isInteger(pageIndex) || pageIndex < 0) {
    throw new OperationError(
      "INVALID_INPUT",
      "redactRegion requires a non-negative integer pageIndex.",
    );
  }
  if (region.width <= 0 || region.height <= 0 || region.x < 0 || region.y < 0) {
    throw new OperationError(
      "INVALID_INPUT",
      "redactRegion requires a positive region with non-negative origin.",
    );
  }

  const doc = await loadPdf(input);
  const total = doc.getPageCount();
  if (pageIndex >= total) {
    throw new OperationError(
      "INVALID_INPUT",
      `pageIndex ${pageIndex} is out of bounds for a ${total}-page PDF.`,
    );
  }

  throw new UnsupportedFeatureError(
    "redactRegion is not yet implemented. True content-stream sanitisation requires PDFium-level " +
      "work; drawing a black rectangle would not actually remove the underlying text or images, " +
      "so refusing here is safer than silently producing an insecure file.",
  );
}
