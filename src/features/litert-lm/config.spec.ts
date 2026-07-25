import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { describe, it } from "vitest";

import { liteRtLmConfiguration } from "./config.js";

const projectRoot = new URL("../../../", import.meta.url);

describe("liteRtLmConfiguration", () => {
  it("pins the LiteRT-LM runtime and supported Gemma model explicitly", async () => {
    const packageJson = JSON.parse(
      await readFile(new URL("package.json", projectRoot), "utf8"),
    ) as {
      dependencies: Record<string, string>;
    };

    assert.equal(packageJson.dependencies["@litert-lm/core"], "0.14.0");
    assert.deepEqual(liteRtLmConfiguration, {
      model: {
        name: "Gemma 4 E2B IT",
        sizeInBytes: 2_008_432_640,
        url: "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.litertlm",
      },
      runtime: {
        maxNumTokens: 4_096,
        wasmUrl: "https://cdn.jsdelivr.net/npm/@litert-lm/core@0.14.0/wasm/",
      },
    });
  });
});
