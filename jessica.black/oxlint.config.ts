import { NEXTJS_RULES, RECOMMENDED_RULES } from "oxlint-plugin-react-doctor";
import { defineConfig } from "oxlint";

const ruleOverrides = {
  // React Doctor only enables this check when React Compiler is configured.
  // Oxlint loads the plugin statically, so keep this compiler-only rule gated.
  "react-doctor/react-compiler-no-manual-memoization": "off",
  // Next.js app-router files must export `metadata` and image-route constants
  // next to the component.
  "react-doctor/only-export-components": "off",
  // `next/og` renders `ImageResponse` once at build time from inline style
  // objects, so there is no re-render to protect.
  "react-doctor/jsx-no-new-object-as-prop": "off",
  // A single static page nests JSX past the rule's limit of 2 by design.
  "react-doctor/jsx-max-depth": "off",
} as const;

export default defineConfig({
  options: {
    maxWarnings: 0,
  },
  categories: {
    correctness: "error",
    suspicious: "warn",
    perf: "warn",
  },
  jsPlugins: [
    {
      name: "react-doctor",
      specifier: "oxlint-plugin-react-doctor",
    },
  ],
  rules: {
    ...RECOMMENDED_RULES,
    ...NEXTJS_RULES,
    ...ruleOverrides,
  },
  ignorePatterns: [
    ".agents/**",
    ".codex/**",
    ".next/**",
    "node_modules/**",
    "package-lock.json",
  ],
});
