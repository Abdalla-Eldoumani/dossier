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
};
