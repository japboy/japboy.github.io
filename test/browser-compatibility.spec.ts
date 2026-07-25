import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import browserslistToEsbuild from "browserslist-to-esbuild";
import { describe, it } from "vitest";

const projectRoot = new URL("../", import.meta.url);

describe("browser support contract", () => {
  it("uses the explicit Baseline 2024 target", async () => {
    const configuration = await readFile(new URL(".browserslistrc", projectRoot), "utf8");
    const targets = browserslistToEsbuild(undefined, { path: fileURLToPath(projectRoot) });

    assert.match(configuration, /^# Baseline 2024:/);
    assert.deepEqual(targets, ["chrome130", "edge130", "firefox132", "ios18.2", "safari18.2"]);
  });
});
