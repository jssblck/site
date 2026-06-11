import { NEXTJS_RULES, RECOMMENDED_RULES } from "oxlint-plugin-react-doctor";
import { defineConfig } from "oxlint";

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
  },
  ignorePatterns: [
    ".codex/**",
    ".next/**",
    "node_modules/**",
    "package-lock.json",
  ],
});
