import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Ignore build artifacts and internal directories.
  globalIgnores([
    ".next/**",
    ".sst/**",
    ".open-next/**",
    "node_modules/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/lexicons/**",
    "coverage/**",
  ]),
]);

export default eslintConfig;
