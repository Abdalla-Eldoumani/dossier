// Tool registration entry point. One file per tool, each exporting a
// `registerXxx(server)` function that calls `server.registerTool` exactly once.
// Match the file name to the operation id from packages/core where possible —
// keep imports alphabetical-by-tool-id under their category for findability.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Pages
import { registerMergePdfs } from "./merge.js";
import { registerSplitPdf } from "./splitPdf.js";
import { registerExtractPages } from "./extractPages.js";
import { registerReorderPages } from "./reorderPages.js";
import { registerRotatePages } from "./rotatePages.js";
import { registerDeletePages } from "./deletePages.js";
import { registerInsertBlankPage } from "./insertBlankPage.js";
import { registerInsertPagesFromPdf } from "./insertPagesFromPdf.js";
import { registerDuplicatePages } from "./duplicatePages.js";
import { registerCropPages } from "./cropPages.js";
import { registerResizePages } from "./resizePages.js";

// Content
import { registerAddWatermark } from "./addWatermark.js";
import { registerAddPageNumbers } from "./addPageNumbers.js";
import { registerAddHeaderFooter } from "./addHeaderFooter.js";
import { registerRedactRegion } from "./redactRegion.js";
import { registerCompressPdf } from "./compressPdf.js";

// Conversion
import { registerPdfToImages } from "./pdfToImages.js";
import { registerImagesToPdf } from "./imagesToPdf.js";
import { registerPdfToText } from "./pdfToText.js";
import { registerPdfToMarkdown } from "./pdfToMarkdown.js";
import { registerHtmlToPdf } from "./htmlToPdf.js";

// Forms
import { registerGetFormFields } from "./getFormFields.js";
import { registerFillForm } from "./fillForm.js";
import { registerFlattenForm } from "./flattenForm.js";

// Annotations
import { registerAddTextAnnotation } from "./addTextAnnotation.js";
import { registerAddHighlight } from "./addHighlight.js";
import { registerAddStamp } from "./addStamp.js";
import { registerFlattenAnnotations } from "./flattenAnnotations.js";

// Security
import { registerEncryptPdf } from "./encryptPdf.js";
import { registerDecryptPdf } from "./decryptPdf.js";
import { registerSetPermissions } from "./setPermissions.js";
import { registerStripMetadata } from "./stripMetadata.js";

// Optimisation
import { registerLinearizePdf } from "./linearizePdf.js";
import { registerSubsetFonts } from "./subsetFonts.js";
import { registerDownsampleImages } from "./downsampleImages.js";

// Accessibility
import { registerRunOcr } from "./runOcr.js";
import { registerSearchText } from "./searchText.js";
import { registerGetBookmarks } from "./getBookmarks.js";
import { registerSetBookmarks } from "./setBookmarks.js";

// Diagnostics
import { registerGetInfo } from "./getInfo.js";
import { registerGetInventory } from "./getInventory.js";
import { registerRepairPdf } from "./repairPdf.js";

export function registerAllTools(server: McpServer): void {
  registerMergePdfs(server);
  registerSplitPdf(server);
  registerExtractPages(server);
  registerReorderPages(server);
  registerRotatePages(server);
  registerDeletePages(server);
  registerInsertBlankPage(server);
  registerInsertPagesFromPdf(server);
  registerDuplicatePages(server);
  registerCropPages(server);
  registerResizePages(server);

  registerAddWatermark(server);
  registerAddPageNumbers(server);
  registerAddHeaderFooter(server);
  registerRedactRegion(server);
  registerCompressPdf(server);

  registerPdfToImages(server);
  registerImagesToPdf(server);
  registerPdfToText(server);
  registerPdfToMarkdown(server);
  registerHtmlToPdf(server);

  registerGetFormFields(server);
  registerFillForm(server);
  registerFlattenForm(server);

  registerAddTextAnnotation(server);
  registerAddHighlight(server);
  registerAddStamp(server);
  registerFlattenAnnotations(server);

  registerEncryptPdf(server);
  registerDecryptPdf(server);
  registerSetPermissions(server);
  registerStripMetadata(server);

  registerLinearizePdf(server);
  registerSubsetFonts(server);
  registerDownsampleImages(server);

  registerRunOcr(server);
  registerSearchText(server);
  registerGetBookmarks(server);
  registerSetBookmarks(server);

  registerGetInfo(server);
  registerGetInventory(server);
  registerRepairPdf(server);
}
