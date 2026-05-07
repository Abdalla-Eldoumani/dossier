// Web Worker that runs every PDF operation off the main thread.
// The main thread talks to this worker through Comlink, so the call site reads like a regular async function.
//
// To add a new core operation: import it from @dossier/core and reference it in the api map.
// The proxy type at the call site (`PdfWorkerApi`) picks it up automatically.
//
// Provider-injected operations (encrypt/decrypt/setPermissions, linearizePdf, subsetFonts,
// downsampleImages, runOcr, pdfToImages, optional JpegRecompressor for compressPdf, optional
// PdfRepairer for repair) are exposed here as bare passthroughs. Browser-side providers
// (OffscreenCanvas-based encoders, tesseract.js, qpdf-wasm, PDFium-WASM) wire up alongside
// each operation's UI view as the corresponding TASKS.md task is addressed.

import * as Comlink from "comlink";
import {
  mergePdfs,
  splitByPageCount,
  splitByRanges,
  extractPages,
  reorderPages,
  rotatePages,
  deletePages,
  insertBlankPage,
  insertPagesFromPdf,
  duplicatePages,
  cropPages,
  resizePages,
  addWatermark,
  addPageNumbers,
  addHeaderFooter,
  redactRegion,
  compressPdf,
  imagesToPdf,
  pdfToText,
  pdfToImages,
  pdfToMarkdown,
  getFormFields,
  fillForm,
  flattenForm,
  addTextAnnotation,
  addHighlight,
  addStamp,
  flattenAnnotations,
  encryptPdf,
  decryptPdf,
  setPermissions,
  stripMetadata,
  linearizePdf,
  subsetFonts,
  downsampleImages,
  runOcr,
  searchText,
  getBookmarks,
  setBookmarks,
  getInfo,
  getInventory,
  repair,
} from "@dossier/core";

const api = {
  mergePdfs,
  splitByPageCount,
  splitByRanges,
  extractPages,
  reorderPages,
  rotatePages,
  deletePages,
  insertBlankPage,
  insertPagesFromPdf,
  duplicatePages,
  cropPages,
  resizePages,
  addWatermark,
  addPageNumbers,
  addHeaderFooter,
  redactRegion,
  compressPdf,
  imagesToPdf,
  pdfToText,
  pdfToImages,
  pdfToMarkdown,
  getFormFields,
  fillForm,
  flattenForm,
  addTextAnnotation,
  addHighlight,
  addStamp,
  flattenAnnotations,
  encryptPdf,
  decryptPdf,
  setPermissions,
  stripMetadata,
  linearizePdf,
  subsetFonts,
  downsampleImages,
  runOcr,
  searchText,
  getBookmarks,
  setBookmarks,
  getInfo,
  getInventory,
  repair,
};

export type PdfWorkerApi = typeof api;

Comlink.expose(api);
