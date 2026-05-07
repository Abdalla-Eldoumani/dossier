import { describe, it, expect } from "vitest";
import { PDFDocument, PDFName } from "pdf-lib";
import { stripMetadata } from "./stripMetadata.js";

async function pdfWithMetadata(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage();
  doc.setTitle("Secret Title");
  doc.setAuthor("Bob");
  doc.setSubject("Confidential Subject");
  doc.setKeywords(["secret", "internal"]);
  doc.setProducer("ProductionCorp 9000");
  doc.setCreator("Alice's Editor");
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

async function pdfWithXmpMetadata(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage();
  // Attach a stub XMP stream to the catalog.
  const xmp = doc.context.stream("<?xpacket begin?>fake xmp<?xpacket end?>", {
    Type: "Metadata",
    Subtype: "XML",
  });
  const ref = doc.context.register(xmp);
  doc.catalog.set(PDFName.of("Metadata"), ref);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("stripMetadata", () => {
  it("clears the user Info dict fields", async () => {
    const input = await pdfWithMetadata();
    const out = await stripMetadata(input);
    const doc = await PDFDocument.load(out.bytes);
    expect(doc.getTitle()).toBe("");
    expect(doc.getAuthor()).toBe("");
    expect(doc.getSubject()).toBe("");
    expect(doc.getKeywords() ?? "").toBe("");
    expect(doc.getCreator()).toBe("");
  });

  it("removes the XMP metadata stream from the catalog", async () => {
    const input = await pdfWithXmpMetadata();
    const before = await PDFDocument.load(input);
    expect(before.catalog.get(PDFName.of("Metadata"))).toBeDefined();

    const out = await stripMetadata(input);
    const after = await PDFDocument.load(out.bytes);
    expect(after.catalog.get(PDFName.of("Metadata"))).toBeUndefined();
  });

  it("emits an explanatory notes entry", async () => {
    const input = await pdfWithMetadata();
    const out = await stripMetadata(input);
    expect(out.meta.operation).toBe("strip-metadata");
    expect(out.meta.notes?.[0]).toMatch(/Cleared/);
  });

  it("is a no-op safe-pass for a PDF with no metadata", async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const bytes = await doc.save();
    const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const out = await stripMetadata(input);
    expect(out.meta.operation).toBe("strip-metadata");
  });

  it("rejects non-PDF input", async () => {
    const garbage = new TextEncoder().encode("not a pdf");
    await expect(stripMetadata(garbage)).rejects.toThrow();
  });
});
