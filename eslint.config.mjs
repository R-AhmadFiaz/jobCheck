import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Not part of this Next.js app — unrelated content that now sits
    // alongside it at the repo root since the project root moved up from
    // web/ to here. Never in scope for this app's lint/typecheck.
    "Design JobCheck SaaS Application/**",
    "Results.tsx",
  ]),
]);

export default eslintConfig;
