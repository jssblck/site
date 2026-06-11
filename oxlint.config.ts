import { NEXTJS_RULES, RECOMMENDED_RULES } from "oxlint-plugin-react-doctor";
import { defineConfig } from "oxlint";

const projectRuleOverrides = {
  "react-doctor/exhaustive-deps": "off",
  "react-doctor/no-derived-state": "off",
  "react-doctor/no-effect-chain": "off",
  "react-doctor/no-event-handler": "off",
  "react-doctor/no-giant-component": "off",
  "react-doctor/no-initialize-state": "off",
  "react-doctor/no-inline-exhaustive-style": "off",
  "react-doctor/no-prevent-default": "off",
  "react-doctor/prefer-use-sync-external-store": "off",
  "react-doctor/prefer-useReducer": "off",
  "react-doctor/rendering-hydration-no-flicker": "off",
  "react-doctor/rerender-state-only-in-handlers": "off",
  "react-doctor/nextjs-missing-metadata": "off",
  "unicorn/consistent-function-scoping": "off",
  "unicorn/require-post-message-target-origin": "off",
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
    "react-doctor/no-react19-deprecated-apis": "off",
    "react-doctor/react-compiler-no-manual-memoization": "off",
    ...projectRuleOverrides,
  },
  ignorePatterns: [
    ".codex/**",
    ".next/**",
    "node_modules/**",
    "package-lock.json",
  ],
  overrides: [
    {
      files: ["app/*image.tsx"],
      rules: {
        "react-doctor/only-export-components": "off",
      },
    },
  ],
});
