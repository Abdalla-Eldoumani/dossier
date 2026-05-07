import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { getBookmarks } from "./getBookmarks.js";
import { setBookmarks } from "./setBookmarks.js";

async function blankPdfBytes(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("getBookmarks", () => {
  it("returns an empty array for a PDF without outlines", async () => {
    const input = await blankPdfBytes(2);
    const out = await getBookmarks(input);
    expect(out).toEqual([]);
  });

  it("round-trips a flat list of bookmarks", async () => {
    const input = await blankPdfBytes(3);
    const set = await setBookmarks(input, [
      { title: "Cover", pageIndex: 0 },
      { title: "Chapter 1", pageIndex: 1 },
      { title: "Chapter 2", pageIndex: 2 },
    ]);
    const got = await getBookmarks(set.bytes);
    expect(got).toHaveLength(3);
    expect(got[0]?.title).toBe("Cover");
    expect(got[0]?.pageIndex).toBe(0);
    expect(got[2]?.title).toBe("Chapter 2");
    expect(got[2]?.pageIndex).toBe(2);
  });

  it("round-trips nested bookmarks", async () => {
    const input = await blankPdfBytes(4);
    const set = await setBookmarks(input, [
      {
        title: "Part One",
        pageIndex: 0,
        children: [
          { title: "Section A", pageIndex: 1 },
          { title: "Section B", pageIndex: 2 },
        ],
      },
      { title: "Part Two", pageIndex: 3 },
    ]);
    const got = await getBookmarks(set.bytes);
    expect(got).toHaveLength(2);
    expect(got[0]?.children).toHaveLength(2);
    expect(got[0]?.children?.[0]?.title).toBe("Section A");
    expect(got[0]?.children?.[1]?.pageIndex).toBe(2);
    expect(got[1]?.title).toBe("Part Two");
  });

  it("preserves bookmarks without a destination", async () => {
    const input = await blankPdfBytes(1);
    const set = await setBookmarks(input, [{ title: "Index" }]);
    const got = await getBookmarks(set.bytes);
    expect(got).toHaveLength(1);
    expect(got[0]?.title).toBe("Index");
    expect(got[0]?.pageIndex).toBeUndefined();
  });

  it("rejects non-PDF input", async () => {
    const garbage = new TextEncoder().encode("not a pdf");
    await expect(getBookmarks(garbage)).rejects.toThrow();
  });
});
