import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("the styling architecture uses standard CSS without framework integration", async () => {
  const sourcePaths = [
    "README.md",
    "oxfmt.config.ts",
    "pnpm-lock.yaml",
    "src/components/balloon.ts",
    "src/components/hello.ts",
    "src/components/portrait.ts",
    "src/styles/app.css",
    "vite.config.ts",
  ];
  const [packageJson, ...sources] = await Promise.all([
    readFile(new URL("package.json", projectRoot), "utf8").then(
      (contents) =>
        JSON.parse(contents) as {
          dependencies: Record<string, string>;
          devDependencies: Record<string, string>;
        },
    ),
    ...sourcePaths.map((path) => readFile(new URL(path, projectRoot), "utf8")),
  ]);

  assert.equal(packageJson.dependencies.classnames, undefined);
  assert.equal(packageJson.devDependencies["@tailwindcss/vite"], undefined);
  assert.equal(packageJson.devDependencies.tailwindcss, undefined);

  for (const source of sources) {
    assert.doesNotMatch(source, /tailwind|@apply|@theme/i);
  }
});
