import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { detectLiteRtLmSupport, type LiteRtLmEnvironment } from "./feature-detection.js";

const navigatorWithGpu = (requestAdapter: GPU["requestAdapter"]): Navigator =>
  ({ gpu: { requestAdapter } }) as Navigator;

describe("detectLiteRtLmSupport", () => {
  it("rejects insecure contexts before accessing WebGPU", async () => {
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

  it("rejects environments without the WebGPU API", async () => {
    assert.deepEqual(
      await detectLiteRtLmSupport({
        isSecureContext: true,
        navigator: {} as Navigator,
      }),
      { reason: "webgpu-api-unavailable", supported: false },
    );
  });

  it("requires an available WebGPU adapter", async () => {
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

  it("reports rejected WebGPU adapter requests", async () => {
    assert.deepEqual(
      await detectLiteRtLmSupport({
        isSecureContext: true,
        navigator: navigatorWithGpu(async () => Promise.reject(new Error("adapter failed"))),
      }),
      { reason: "webgpu-adapter-request-failed", supported: false },
    );
  });
});
