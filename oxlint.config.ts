import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "error",
    suspicious: "error",
    pedantic: "off",
    perf: "off",
    style: "off",
    restriction: "off",
    nursery: "off",
  },
  plugins: ["oxc", "typescript", "unicorn", "vitest"],
  ignorePatterns: [".build/", ".serena/", "dist/", "node_modules/"],
  options: {
    maxWarnings: 0,
    typeAware: false,
  },
  rules: {
    "vitest/consistent-test-it": ["error", { fn: "it", withinDescribe: "it" }],
    "vitest/max-nested-describe": ["error", { max: 2 }],
    "vitest/require-top-level-describe": ["error", { maxNumberOfTopLevelDescribes: 1 }],
  },
});
