import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { Engine } from "@litert-lm/core";

import { liteRtLmConfiguration } from "../src/features/litert-lm/config.js";
import { LiteRtLmController } from "../src/features/litert-lm/controller.js";
import {
  detectLiteRtLmSupport,
  type LiteRtLmEnvironment,
} from "../src/features/litert-lm/feature-detection.js";

const navigatorWithGpu = (requestAdapter: GPU["requestAdapter"]): Navigator =>
  ({ gpu: { requestAdapter } }) as Navigator;

const projectRoot = new URL("../", import.meta.url);

test("the LiteRT-LM runtime and supported Gemma model are pinned explicitly", async () => {
  const packageJson = JSON.parse(await readFile(new URL("package.json", projectRoot), "utf8")) as {
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

test("feature detection rejects insecure contexts before accessing WebGPU", async () => {
  let adapterRequested = false;
  const environment: LiteRtLmEnvironment = {
    isSecureContext: false,
    navigator: navigatorWithGpu(async () => {
      adapterRequested = true;
      return {} as GPUAdapter;
    }),
  };

  assert.deepEqual(await detectLiteRtLmSupport(environment), {
    reason: "insecure-context",
    supported: false,
  });
  assert.equal(adapterRequested, false);
});

test("feature detection rejects environments without the WebGPU API", async () => {
  assert.deepEqual(
    await detectLiteRtLmSupport({
      isSecureContext: true,
      navigator: {} as Navigator,
    }),
    { reason: "webgpu-api-unavailable", supported: false },
  );
});

test("feature detection requires an available WebGPU adapter", async () => {
  assert.deepEqual(
    await detectLiteRtLmSupport({
      isSecureContext: true,
      navigator: navigatorWithGpu(async () => null),
    }),
    { reason: "webgpu-adapter-unavailable", supported: false },
  );

  assert.deepEqual(
    await detectLiteRtLmSupport({
      isSecureContext: true,
      navigator: navigatorWithGpu(async () => ({}) as GPUAdapter),
    }),
    { supported: true },
  );
});

test("feature detection reports rejected WebGPU adapter requests", async () => {
  assert.deepEqual(
    await detectLiteRtLmSupport({
      isSecureContext: true,
      navigator: navigatorWithGpu(async () => Promise.reject(new Error("adapter failed"))),
    }),
    { reason: "webgpu-adapter-request-failed", supported: false },
  );
});

test("the controller loads once and exposes an exhaustive ready-state progression", async () => {
  const engine = {} as Engine;
  let loadCount = 0;
  const controller = new LiteRtLmController({
    detectSupport: async () => ({ supported: true }),
    loadEngine: async () => {
      loadCount += 1;
      return engine;
    },
  });
  const statuses: string[] = [];

  controller.subscribe((state) => statuses.push(state.status));
  const [firstState, secondState] = await Promise.all([
    controller.initialize(),
    controller.initialize(),
  ]);

  assert.deepEqual(statuses, ["idle", "detecting", "loading", "ready"]);
  assert.deepEqual(firstState, { status: "ready" });
  assert.equal(secondState, firstState);
  assert.equal(controller.engine, engine);
  assert.equal(loadCount, 1);
});

test("unsupported environments never import or load the model", async () => {
  let loadCount = 0;
  const controller = new LiteRtLmController({
    detectSupport: async () => ({
      reason: "webgpu-api-unavailable",
      supported: false,
    }),
    loadEngine: async () => {
      loadCount += 1;
      return {} as Engine;
    },
  });

  assert.deepEqual(await controller.initialize(), {
    reason: "webgpu-api-unavailable",
    status: "unsupported",
  });
  assert.equal(controller.engine, undefined);
  assert.equal(loadCount, 0);
});

test("model loading failures become observable terminal state", async () => {
  const error = new Error("model unavailable");
  const controller = new LiteRtLmController({
    detectSupport: async () => ({ supported: true }),
    loadEngine: async () => Promise.reject(error),
  });

  assert.deepEqual(await controller.initialize(), { error, status: "failed" });
  assert.equal(controller.engine, undefined);
});

test("unexpected detection failures become observable terminal state", async () => {
  const error = new Error("detection failed");
  const controller = new LiteRtLmController({
    detectSupport: async () => Promise.reject(error),
    loadEngine: async () => ({}) as Engine,
  });

  assert.deepEqual(await controller.initialize(), { error, status: "failed" });
  assert.equal(controller.engine, undefined);
});
