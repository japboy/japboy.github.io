import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config.js";

export default mergeConfig(
  viteConfig,
  defineConfig({
    root: import.meta.dirname,
    test: {
      environment: "node",
      globals: false,
      include: ["src/**/*.spec.ts", "test/**/*.spec.ts"],
    },
  }),
);
