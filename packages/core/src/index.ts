// Public exports. Add new operations here as they're implemented.

export * from "./types/index.js";
export * from "./types/errors.js";

// Operations — pages
export { mergePdfs, MergeOptionsSchema } from "./operations/merge.js";
export { splitByPageCount, SplitByPageCountSchema } from "./operations/splitByPageCount.js";
export { splitByRanges, SplitByRangesSchema, PageRangeSchema } from "./operations/splitByRanges.js";
export { extractPages, ExtractPagesSchema } from "./operations/extractPages.js";
export { reorderPages, ReorderPagesSchema } from "./operations/reorderPages.js";
export { rotatePages, RotatePagesSchema } from "./operations/rotatePages.js";
export { deletePages, DeletePagesSchema } from "./operations/deletePages.js";
export {
  insertBlankPage,
  InsertBlankPageSchema,
  PageSizeSchema,
} from "./operations/insertBlankPage.js";
export {
  insertPagesFromPdf,
  InsertPagesFromPdfSchema,
} from "./operations/insertPagesFromPdf.js";
export { duplicatePages, DuplicatePagesSchema } from "./operations/duplicatePages.js";
export { cropPages, CropPagesSchema, PageRegionSchema } from "./operations/cropPages.js";
export { resizePages, ResizePagesSchema } from "./operations/resizePages.js";

// Operations — content
export {
  addWatermark,
  WatermarkSchema,
  TextWatermarkSchema,
  ImageWatermarkSchema,
  PositionSchema,
} from "./operations/addWatermark.js";
export { addPageNumbers, PageNumberOptionsSchema } from "./operations/addPageNumbers.js";
export { addHeaderFooter, HeaderFooterOptionsSchema } from "./operations/addHeaderFooter.js";
export { redactRegion, RedactRegionSchema } from "./operations/redactRegion.js";
export {
  compressPdf,
  CompressPdfSchema,
  type CompressLevel,
  type CompressOptions,
  type JpegRecompressor,
} from "./operations/compressPdf.js";

// Operations — conversion
export { imagesToPdf, ImagesToPdfSchema } from "./operations/imagesToPdf.js";
export {
  pdfToText,
  PdfToTextSchema,
  type PdfToTextOptions,
  type PdfToTextResult,
} from "./operations/pdfToText.js";
export {
  pdfToImages,
  PdfToImagesSchema,
  type PdfToImagesOptions,
  type PdfToImagesResult,
  type PageRenderer,
  type PageRenderInput,
  type ImageFormat,
} from "./operations/pdfToImages.js";
export {
  pdfToMarkdown,
  PdfToMarkdownSchema,
  type PdfToMarkdownOptions,
  type PdfToMarkdownResult,
} from "./operations/pdfToMarkdown.js";

// Operations — forms
export {
  getFormFields,
  GetFormFieldsSchema,
  type FormField,
  type FormFieldType,
} from "./operations/getFormFields.js";
export {
  fillForm,
  FillFormSchema,
  type FillFormValues,
} from "./operations/fillForm.js";
export { flattenForm, FlattenFormSchema } from "./operations/flattenForm.js";

// Operations — annotations
export {
  addTextAnnotation,
  AddTextAnnotationSchema,
  TextAnnotationOptionsSchema,
  type TextAnnotationOptions,
} from "./operations/addTextAnnotation.js";

// Add new operations here. The same name shows up in three places:
//  - this barrel file
//  - apps/mcp-server/src/tools/<name>.ts
//  - apps/web/src/components/operations/<Name>.tsx
//
// Keep them in sync.
