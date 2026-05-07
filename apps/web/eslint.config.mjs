// Flat config for ESLint 10 and Next 16. Next 16 removed the `next lint` wrapper —
// linting now goes through ESLint directly with the eslint-config-next presets.

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      // Pin React version so eslint-plugin-react skips its version-detection path —
      // that path uses `context.getFilename()`, which trips a TypeError under the
      // current flat-config / plugin combination.
      react: { version: "19" },
    },
    rules: {
      // Console only as warnings/errors. The Comlink worker uses postMessage, not console.
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // Forbid relative imports above three levels — usually a sign of misplaced files.
      "no-restricted-imports": [
        "error",
        { patterns: ["../../../*"] },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "node_modules/**"]),
]);
