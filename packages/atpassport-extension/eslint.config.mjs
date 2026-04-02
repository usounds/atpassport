import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  ...tseslint.configs.recommended,
  // Ignore build artifacts and internal directories.
  globalIgnores([
    "dist/**",
    "node_modules/**",
    "web-ext-artifacts/**",
    "coverage/**",
  ]),
]);

export default eslintConfig;
