import { describe, it, expect } from "vitest";
import {
  PDFArray,
  PDFDocument,
  PDFRawStream,
  StandardFonts,
  decodePDFRawStream,
} from "pdf-lib";
import { redactRegion } from "./redactRegion.js";

async function pdfWithText(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  page.drawText("PUBLIC HEADER", { x: 100, y: 740, font, size: 14 });
  page.drawText("SECRET PHRASE", { x: 100, y: 400, font, size: 14 });
  page.drawText("PUBLIC FOOTER", { x: 100, y: 50, font, size: 14 });
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

// PDF strings can be encoded as literal `(text)` or hex `<48...>`. The hex form
// is what pdf-lib emits for non-WinAnsi text. To check whether a phrase
// survives in the saved content stream, decode hex strings back to ASCII first.
function decodeHexStrings(content: string): string {
  return content.replace(/<([0-9a-fA-F\s]+)>/g, (_, hex: string) => {
    const cleaned = hex.replace(/\s/g, "");
    let out = "";
    for (let i = 0; i + 1 < cleaned.length; i += 2) {
      out += String.fromCharCode(parseInt(cleaned.slice(i, i + 2), 16));
    }
    return out;
  });
}

async function readContentStreams(bytes: Uint8Array, pageIndex: number): Promise<string> {
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPage(pageIndex);
  const ref = page.node.Contents();
  if (!ref) return "";

  const parts: string[] = [];
  const collect = (refMaybe: unknown): void => {
    const resolved = doc.context.lookup(refMaybe);
    if (resolved instanceof PDFRawStream) {
      const decoded = decodePDFRawStream(resolved).decode();
      parts.push(new TextDecoder("latin1").decode(decoded));
    }
  };
  if (ref instanceof PDFArray) {
    for (let i = 0; i < ref.size(); i++) collect(ref.get(i));
  } else {
    collect(ref);
  }
  return decodeHexStrings(parts.join("\n"));
}

describe("redactRegion", () => {
  it("removes the secret text from the saved content stream", async () => {
    const input = await pdfWithText();
    expect(await readContentStreams(input, 0)).toContain("SECRET PHRASE");

    // Region targeting the middle "SECRET PHRASE" at PDF y=400.
    // Top-left coords: y_top = 380, height = 40 → covers PDF y in [372, 412].
    const out = await redactRegion(input, 0, { x: 50, y: 380, width: 300, height: 40 });
    const after = await readContentStreams(out.bytes, 0);

    expect(out.meta.operation).toBe("redact");
    expect(after).not.toContain("SECRET PHRASE");
  });

  it("preserves text outside the redact region", async () => {
    const input = await pdfWithText();
    const out = await redactRegion(input, 0, { x: 50, y: 380, width: 300, height: 40 });
    const after = await readContentStreams(out.bytes, 0);

    expect(after).toContain("PUBLIC HEADER");
    expect(after).toContain("PUBLIC FOOTER");
  });

  it("reports how many text blocks were dropped in the notes", async () => {
    const input = await pdfWithText();
    const out = await redactRegion(input, 0, { x: 50, y: 380, width: 300, height: 40 });
    expect(out.meta.notes?.some((n) => /Dropped 1 text block/.test(n))).toBe(true);
  });

  it("rejects out-of-bounds pageIndex", async () => {
    const input = await pdfWithText();
    await expect(
      redactRegion(input, 99, { x: 0, y: 0, width: 100, height: 100 }),
    ).rejects.toThrow(/out of bounds/i);
  });

  it("rejects an invalid region", async () => {
    const input = await pdfWithText();
    await expect(
      redactRegion(input, 0, { x: 0, y: 0, width: 0, height: 100 }),
    ).rejects.toThrow(/positive region/i);
  });
});
