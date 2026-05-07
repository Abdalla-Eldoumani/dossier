// The operation registry is the single source of truth for what's exposed in the UI.
// Adding a new operation? Add it here, then add a view component, then it shows up in the sidebar.
//
// Keep this list in sync with packages/core/src/index.ts and apps/mcp-server/src/tools/.

import type { LucideIcon } from "lucide-react";
import {
  Files,
  Scissors,
  ListOrdered,
  RotateCw,
  Trash2,
  Plus,
  Copy,
  Crop,
  Maximize,
  FileArchive,
  Stamp,
  Hash,
  AlignVerticalJustifyCenter,
  EyeOff,
  ImageDown,
  ImagePlus,
  FileText,
  FileType,
  Globe,
  FormInput,
  PenLine,
  Highlighter,
  Lock,
  Unlock,
  ShieldCheck,
  Eraser,
  Wand,
  Type,
  Layers,
  ScanText,
  Search,
  Bookmark,
  Info,
  Wrench,
} from "lucide-react";

export type OperationCategory =
  | "pages"
  | "content"
  | "conversion"
  | "forms"
  | "annotations"
  | "security"
  | "optimisation"
  | "accessibility"
  | "diagnostics";

export interface Operation {
  id: string;
  name: string;
  description: string;
  category: OperationCategory;
  icon: LucideIcon;
}

export const CATEGORIES: Record<OperationCategory, string> = {
  pages: "Pages",
  content: "Content",
  conversion: "Convert",
  forms: "Forms",
  annotations: "Annotations",
  security: "Security",
  optimisation: "Optimise",
  accessibility: "Accessibility",
  diagnostics: "Diagnose",
};

export const OPERATIONS: Operation[] = [
  // Pages
  { id: "merge",          name: "Merge",          description: "Combine multiple PDFs into one.",          category: "pages",         icon: Files },
  { id: "split",          name: "Split",          description: "Break a PDF into smaller files.",          category: "pages",         icon: Scissors },
  { id: "extract",        name: "Extract pages",  description: "Pull a page range into a new PDF.",        category: "pages",         icon: Plus },
  { id: "reorder",        name: "Reorder",        description: "Drag pages into a new sequence.",          category: "pages",         icon: ListOrdered },
  { id: "rotate",         name: "Rotate",         description: "Rotate pages in 90° increments.",          category: "pages",         icon: RotateCw },
  { id: "delete",         name: "Delete pages",   description: "Remove selected pages.",                   category: "pages",         icon: Trash2 },
  { id: "insert-blank",   name: "Insert blank",   description: "Add a blank page at any position.",        category: "pages",         icon: Plus },
  { id: "insert-from",    name: "Insert pages",   description: "Insert pages from another PDF.",           category: "pages",         icon: Plus },
  { id: "duplicate",      name: "Duplicate",      description: "Repeat a page or range.",                  category: "pages",         icon: Copy },
  { id: "crop",           name: "Crop",           description: "Trim pages to a region.",                  category: "pages",         icon: Crop },
  { id: "resize",         name: "Resize",         description: "Change page dimensions.",                  category: "pages",         icon: Maximize },

  // Content
  { id: "compress",       name: "Compress",       description: "Reduce file size.",                        category: "content",       icon: FileArchive },
  { id: "watermark",      name: "Watermark",      description: "Add a text or image watermark.",           category: "content",       icon: Stamp },
  { id: "page-numbers",   name: "Page numbers",   description: "Add numbered footers or headers.",         category: "content",       icon: Hash },
  { id: "header-footer",  name: "Header / footer",description: "Add running text to every page.",          category: "content",       icon: AlignVerticalJustifyCenter },
  { id: "redact",         name: "Redact",         description: "Permanently remove a region.",             category: "content",       icon: EyeOff },

  // Conversion
  { id: "to-images",      name: "PDF to images",  description: "Export pages as PNG, JPEG, or WebP.",      category: "conversion",    icon: ImageDown },
  { id: "from-images",    name: "Images to PDF",  description: "Combine images into a single PDF.",        category: "conversion",    icon: ImagePlus },
  { id: "to-text",        name: "PDF to text",    description: "Extract the text content.",                category: "conversion",    icon: FileText },
  { id: "to-markdown",    name: "PDF to Markdown",description: "Best-effort structural conversion.",       category: "conversion",    icon: FileType },
  { id: "html-to-pdf",    name: "HTML to PDF",    description: "Render HTML as a PDF page.",               category: "conversion",    icon: Globe },

  // Forms
  { id: "fill-form",      name: "Fill form",      description: "Set values for AcroForm fields.",          category: "forms",         icon: FormInput },
  { id: "flatten-form",   name: "Flatten form",   description: "Bake fields into the page content.",       category: "forms",         icon: Layers },
  { id: "extract-fields", name: "Extract fields", description: "Read the form's field map.",               category: "forms",         icon: FormInput },

  // Annotations
  { id: "add-text",       name: "Add note",       description: "Place a text annotation.",                 category: "annotations",   icon: PenLine },
  { id: "highlight",      name: "Highlight",      description: "Highlight, underline, strikethrough.",     category: "annotations",   icon: Highlighter },
  { id: "stamp",          name: "Stamp",          description: "Apply a stamp or seal.",                   category: "annotations",   icon: Stamp },
  { id: "flatten-annots", name: "Flatten",        description: "Bake annotations into the page.",          category: "annotations",   icon: Layers },

  // Security
  { id: "encrypt",        name: "Encrypt",        description: "Set a password (AES-256).",                category: "security",      icon: Lock },
  { id: "decrypt",        name: "Decrypt",        description: "Remove the password.",                     category: "security",      icon: Unlock },
  { id: "permissions",    name: "Permissions",    description: "Allow or block print, copy, edit.",        category: "security",      icon: ShieldCheck },
  { id: "strip-meta",     name: "Strip metadata", description: "Remove author, title, dates.",             category: "security",      icon: Eraser },

  // Optimisation
  { id: "linearise",      name: "Linearise",      description: "Rewrite for fast web view.",               category: "optimisation",  icon: Wand },
  { id: "subset-fonts",   name: "Subset fonts",   description: "Embed only the glyphs in use.",            category: "optimisation",  icon: Type },
  { id: "downsample",     name: "Downsample",     description: "Reduce image resolution.",                 category: "optimisation",  icon: ImageDown },

  // Accessibility
  { id: "ocr",            name: "OCR",            description: "Add a text layer to scanned pages.",       category: "accessibility", icon: ScanText },
  { id: "search",         name: "Search",         description: "Find text across the document.",           category: "accessibility", icon: Search },
  { id: "bookmarks",      name: "Bookmarks",      description: "Edit the table of contents.",              category: "accessibility", icon: Bookmark },

  // Diagnostics
  { id: "info",           name: "Inspect",        description: "Page count, sizes, fonts, attachments.",   category: "diagnostics",   icon: Info },
  { id: "repair",         name: "Repair",         description: "Best-effort recovery for damaged PDFs.",   category: "diagnostics",   icon: Wrench },
];

export const OPERATIONS_BY_CATEGORY: Record<OperationCategory, Operation[]> = OPERATIONS.reduce(
  (acc, op) => {
    (acc[op.category] ||= []).push(op);
    return acc;
  },
  {} as Record<OperationCategory, Operation[]>,
);
