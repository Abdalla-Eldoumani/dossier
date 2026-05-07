// Maps operation ids (from `lib/operations.ts`) to their view component.
// `OperationCanvas` looks up this map; missing entries fall back to
// `<OperationPlaceholder />`. Add an entry here when a new view ships.

import type { ComponentType } from "react";
import { InfoOperation } from "./InfoOperation";
import { StripMetadataOperation } from "./StripMetadataOperation";
import { FlattenFormOperation } from "./FlattenFormOperation";
import { FlattenAnnotationsOperation } from "./FlattenAnnotationsOperation";
import { ExtractFieldsOperation } from "./ExtractFieldsOperation";
import { DeletePagesOperation } from "./DeletePagesOperation";
import { DuplicatePagesOperation } from "./DuplicatePagesOperation";
import { ExtractPagesOperation } from "./ExtractPagesOperation";
import { RotatePagesOperation } from "./RotatePagesOperation";
import { SearchOperation } from "./SearchOperation";
import { BookmarksOperation } from "./BookmarksOperation";
import { PdfToTextOperation } from "./PdfToTextOperation";
import { PdfToMarkdownOperation } from "./PdfToMarkdownOperation";
import { CompressOperation } from "./CompressOperation";
import { MergeOperation } from "./MergeOperation";
import { LineariseOperation } from "./LineariseOperation";
import { SubsetFontsOperation } from "./SubsetFontsOperation";
import { RepairOperation } from "./RepairOperation";
import { DownsampleImagesOperation } from "./DownsampleImagesOperation";
import { OcrOperation } from "./OcrOperation";
import { DecryptOperation } from "./DecryptOperation";
import { EncryptOperation } from "./EncryptOperation";
import { SetPermissionsOperation } from "./SetPermissionsOperation";
import { WatermarkOperation } from "./WatermarkOperation";
import { PageNumbersOperation } from "./PageNumbersOperation";
import { HeaderFooterOperation } from "./HeaderFooterOperation";
import { CropPagesOperation } from "./CropPagesOperation";
import { ResizePagesOperation } from "./ResizePagesOperation";
import { InsertBlankOperation } from "./InsertBlankOperation";
import { InsertFromPdfOperation } from "./InsertFromPdfOperation";
import { AddTextAnnotationOperation } from "./AddTextAnnotationOperation";
import { HighlightOperation } from "./HighlightOperation";
import { StampOperation } from "./StampOperation";
import { RedactOperation } from "./RedactOperation";
import { PdfToImagesOperation } from "./PdfToImagesOperation";
import { ImagesToPdfOperation } from "./ImagesToPdfOperation";
import { HtmlToPdfOperation } from "./HtmlToPdfOperation";
import { FillFormOperation } from "./FillFormOperation";
import { SplitOperation } from "./SplitOperation";
import { ReorderPagesOperation } from "./ReorderPagesOperation";

export const OPERATION_VIEWS: Record<string, ComponentType> = {
  info: InfoOperation,
  "strip-meta": StripMetadataOperation,
  "flatten-form": FlattenFormOperation,
  "flatten-annots": FlattenAnnotationsOperation,
  "extract-fields": ExtractFieldsOperation,
  delete: DeletePagesOperation,
  duplicate: DuplicatePagesOperation,
  extract: ExtractPagesOperation,
  rotate: RotatePagesOperation,
  search: SearchOperation,
  bookmarks: BookmarksOperation,
  "to-text": PdfToTextOperation,
  "to-markdown": PdfToMarkdownOperation,
  compress: CompressOperation,
  merge: MergeOperation,
  linearise: LineariseOperation,
  "subset-fonts": SubsetFontsOperation,
  repair: RepairOperation,
  downsample: DownsampleImagesOperation,
  ocr: OcrOperation,
  decrypt: DecryptOperation,
  encrypt: EncryptOperation,
  permissions: SetPermissionsOperation,
  watermark: WatermarkOperation,
  "page-numbers": PageNumbersOperation,
  "header-footer": HeaderFooterOperation,
  crop: CropPagesOperation,
  resize: ResizePagesOperation,
  "insert-blank": InsertBlankOperation,
  "insert-from": InsertFromPdfOperation,
  "add-text": AddTextAnnotationOperation,
  highlight: HighlightOperation,
  stamp: StampOperation,
  redact: RedactOperation,
  "to-images": PdfToImagesOperation,
  "from-images": ImagesToPdfOperation,
  "html-to-pdf": HtmlToPdfOperation,
  "fill-form": FillFormOperation,
  split: SplitOperation,
  reorder: ReorderPagesOperation,
};
