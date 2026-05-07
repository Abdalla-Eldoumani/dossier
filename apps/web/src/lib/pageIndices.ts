// Parse a human-friendly page-range string into a sorted, deduplicated array of
// zero-based page indices. Accepts comma-separated 1-based numbers and ranges:
//
//   "1, 3, 5-9"   → [0, 2, 4, 5, 6, 7, 8]
//   "10"          → [9]
//   "2-4, 1"      → [0, 1, 2, 3]
//
// Throws when an entry is malformed, out of bounds, or empty. Operation views
// catch and surface via the toast pipeline.

export class PageIndicesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PageIndicesError";
  }
}

export function parsePageIndices(input: string, pageCount: number): number[] {
  if (pageCount <= 0) throw new PageIndicesError("Document has no pages.");
  const trimmed = input.trim();
  if (!trimmed) throw new PageIndicesError("Enter at least one page or range.");

  const set = new Set<number>();
  for (const raw of trimmed.split(",")) {
    const part = raw.trim();
    if (!part) continue;
    const dash = part.indexOf("-");
    if (dash === -1) {
      const n = Number(part);
      if (!Number.isInteger(n) || n < 1 || n > pageCount) {
        throw new PageIndicesError(`"${part}" is not a page in 1..${pageCount}.`);
      }
      set.add(n - 1);
      continue;
    }
    const fromStr = part.slice(0, dash).trim();
    const toStr = part.slice(dash + 1).trim();
    const from = Number(fromStr);
    const to = Number(toStr);
    if (!Number.isInteger(from) || !Number.isInteger(to)) {
      throw new PageIndicesError(`"${part}" is not a valid range.`);
    }
    if (from < 1 || to > pageCount || from > to) {
      throw new PageIndicesError(`"${part}" is outside 1..${pageCount}.`);
    }
    for (let i = from; i <= to; i++) set.add(i - 1);
  }

  if (set.size === 0) throw new PageIndicesError("No pages selected.");
  return Array.from(set).sort((a, b) => a - b);
}
