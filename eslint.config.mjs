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
    // Ignore scripts and tests for now
    "scripts/**",
    "tests/**",
    "proxy.ts",
  ]),
  // Rule overrides - convert strict rules to warnings for gradual migration
  {
    rules: {
      // TypeScript rules - warn instead of error to allow gradual migration
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      // React rules
      "react/no-unescaped-entities": "warn",
      // React Compiler rules - these are new and can be warnings
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/incompatible-library": "warn",
      "react-hooks/static-components": "warn",
      // General JS rules
      "prefer-const": "warn",
    },
  },
]);

export default eslintConfig;
