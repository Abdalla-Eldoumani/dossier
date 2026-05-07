import { describe, it, expect } from "vitest";
import {
  PDFArray,
  PDFDocument,
  PDFRawStream,
  decodePDFRawStream,
} from "pdf-lib";
import { addStamp } from "./addStamp.js";

const PNG_1X1_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const png1x1 = Uint8Array.from(atob(PNG_1X1_BASE64), (c) => c.charCodeAt(0));

async function blankPdfBytes(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

async function readContentStreams(bytes: Uint8Array): Promise<string> {
  const doc = await PDFDocument.load(bytes);
  const ref = doc.getPage(0).node.Contents();
  if (!ref) return "";
  const parts: string[] = [];
  const collect = (refMaybe: unknown): void => {
    const resolved = doc.context.lookup(refMaybe);
    if (resolved instanceof PDFRawStream) {
      parts.push(new TextDecoder("latin1").decode(decodePDFRawStream(resolved).decode()));
    }
  };
  if (ref instanceof PDFArray) {
    for (let i = 0; i < ref.size(); i++) collect(ref.get(i));
  } else {
    collect(ref);
  }
  // Decode hex strings (pdf-lib emits text as hex) so we can grep for labels.
  return parts.join("\n").replace(/<([0-9a-fA-F\s]+)>/g, (_, hex: string) => {
    const cleaned = hex.replace(/\s/g, "");
    let s = "";
    for (let i = 0; i + 1 < cleaned.length; i += 2) {
      s += String.fromCharCode(parseInt(cleaned.slice(i, i + 2), 16));
    }
    return s;
  });
}

describe("addStamp", () => {
  it("draws the built-in label as text on the page", async () => {
    const input = await blankPdfBytes();
    const out = await addStamp(input, 0, { x: 100, y: 100 }, {
      kind: "builtin",
      name: "Approved",
    });
    const content = await readContentStreams(out.bytes);
    expect(content).toContain("APPROVED");
    expect(out.meta.operation).toBe("stamp");
  });

  it("supports a custom color", async () => {
    const input = await blankPdfBytes();
    const out = await addStamp(input, 0, { x: 100, y: 100 }, {
      kind: "builtin",
      name: "Draft",
      color: [0, 0, 0],
    });
    expect(out.meta.operation).toBe("stamp");
  });

  it("draws a PNG image stamp", async () => {
    const input = await blankPdfBytes();
    const out = await addStamp(input, 0, { x: 100, y: 100 }, {
      kind: "image",
      image: png1x1,
    });
    expect(out.meta.operation).toBe("stamp");
    expect(out.meta.notes?.some((n) => /image \(1x1\)/.test(n))).toBe(true);
  });

  it("rejects non-PNG/JPEG image bytes", async () => {
    const input = await blankPdfBytes();
    const garbage = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    await expect(
      addStamp(input, 0, { x: 0, y: 0 }, { kind: "image", image: garbage }),
    ).rejects.toThrow(/PNG or JPEG/);
  });

  it("rejects out-of-bounds pageIndex", async () => {
    const input = await blankPdfBytes();
    await expect(
      addStamp(input, 99, { x: 0, y: 0 }, { kind: "builtin", name: "Final" }),
    ).rejects.toThrow(/out of bounds/i);
  });
});
