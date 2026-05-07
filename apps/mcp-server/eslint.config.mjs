// Minimal flat config. TypeScript checking lives in `tsc --noEmit` for now;
// a typescript-eslint pipeline is a follow-up once the tool surface stabilises.

import js from "@eslint/js";

export default [
  {
    ...js.configs.recommended,
    files: ["**/*.{js,mjs,cjs}"],
  },
  {
    ignores: ["**/*.ts", "**/*.tsx", "dist/**", "node_modules/**"],
  },
];
