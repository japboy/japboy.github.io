import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

import browserslistToEsbuild from "browserslist-to-esbuild";

const projectRoot = new URL("../", import.meta.url);

test("the browser support contract is the explicit Baseline 2024 target", async () => {
  const configuration = await readFile(new URL(".browserslistrc", projectRoot), "utf8");
  const targets = browserslistToEsbuild(undefined, { path: fileURLToPath(projectRoot) });

  assert.match(configuration, /^# Baseline 2024:/);
  assert.deepEqual(targets, ["chrome130", "edge130", "firefox132", "ios18.2", "safari18.2"]);
});
