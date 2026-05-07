import { describe, it, expect } from "vitest";
import { PDFDocument, PDFName } from "pdf-lib";
import { setBookmarks } from "./setBookmarks.js";
import { getBookmarks } from "./getBookmarks.js";

async function blankPdfBytes(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([612, 792]);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("setBookmarks", () => {
  it("writes a flat list with proper sibling links", async () => {
    const input = await blankPdfBytes(3);
    const out = await setBookmarks(input, [
      { title: "One", pageIndex: 0 },
      { title: "Two", pageIndex: 1 },
      { title: "Three", pageIndex: 2 },
    ]);
    expect(out.meta.operation).toBe("set-bookmarks");
    expect(out.meta.notes?.[0]).toMatch(/Wrote 3 bookmark/);
  });

  it("writes nested children with parent links", async () => {
    const input = await blankPdfBytes(3);
    const out = await setBookmarks(input, [
      {
        title: "Parent",
        pageIndex: 0,
        children: [
          { title: "Child 1", pageIndex: 1 },
          { title: "Child 2", pageIndex: 2 },
        ],
      },
    ]);
    // Total visible descendants = 1 parent + 2 children = 3
    expect(out.meta.notes?.[0]).toMatch(/Wrote 3 bookmark/);
    const back = await getBookmarks(out.bytes);
    expect(back[0]?.children).toHaveLength(2);
  });

  it("clears outlines when passed an empty array", async () => {
    let bytes = await blankPdfBytes(2);
    bytes = (await setBookmarks(bytes, [{ title: "Cover", pageIndex: 0 }])).bytes;
    expect((await getBookmarks(bytes)).length).toBe(1);

    const cleared = await setBookmarks(bytes, []);
    expect(await getBookmarks(cleared.bytes)).toEqual([]);
    const doc = await PDFDocument.load(cleared.bytes);
    expect(doc.catalog.get(PDFName.of("Outlines"))).toBeUndefined();
  });

  it("rejects a non-array argument", async () => {
    const input = await blankPdfBytes(1);
    await expect(
      setBookmarks(input, "nope" as unknown as never),
    ).rejects.toThrow(/array of BookmarkNode/);
  });
});
