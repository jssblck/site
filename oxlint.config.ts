import { NEXTJS_RULES, RECOMMENDED_RULES } from "oxlint-plugin-react-doctor";
import { defineConfig } from "oxlint";

const ruleOverrides = {
  // React Doctor only enables this check when React Compiler is configured.
  // Oxlint loads the plugin statically, so keep this compiler-only rule gated.
  "react-doctor/react-compiler-no-manual-memoization": "off",
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
  overrides: [
    {
      files: ["app/*image.tsx"],
      rules: {
        // Next.js image routes require metadata exports next to the component.
        "react-doctor/only-export-components": "off",
      },
    },
    {
      files: ["scripts/threebody-search.mjs"],
      rules: {
        // This script uses Node worker_threads postMessage, not browser postMessage.
        "unicorn/require-post-message-target-origin": "off",
      },
    },
  ],
  ignorePatterns: [
    ".agents/**",
    ".codex/**",
    ".next/**",
    "node_modules/**",
    "package-lock.json",
  ],
});
