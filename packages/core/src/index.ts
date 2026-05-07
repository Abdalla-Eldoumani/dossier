// Public exports. Add new operations here as they're implemented.

export * from "./types/index.js";
export * from "./types/errors.js";

// Operations — pages
export { mergePdfs, MergeOptionsSchema } from "./operations/merge.js";
export { splitByPageCount, SplitByPageCountSchema } from "./operations/splitByPageCount.js";
export { splitByRanges, SplitByRangesSchema, PageRangeSchema } from "./operations/splitByRanges.js";

// Add new operations here. The same name shows up in three places:
//  - this barrel file
//  - apps/mcp-server/src/tools/<name>.ts
//  - apps/web/src/components/operations/<Name>.tsx
//
// Keep them in sync.
