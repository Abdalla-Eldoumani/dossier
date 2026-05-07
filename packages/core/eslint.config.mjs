// Minimal flat config. Lint-side checks live behind `tsc --noEmit` for now —
// adding a TypeScript-aware ESLint pipeline (typescript-eslint) is a follow-up.

import js from "@eslint/js";

export default [
  {
    ...js.configs.recommended,
    files: ["**/*.{js,mjs,cjs}"],
  },
  {
    ignores: ["**/*.ts", "**/*.tsx", "dist/**", "node_modules/**", "coverage/**"],
  },
];
