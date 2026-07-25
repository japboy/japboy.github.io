import assert from "node:assert/strict";

import type { Engine } from "@litert-lm/core";
import { describe, it } from "vitest";

import { LiteRtLmController } from "./controller.js";

describe("LiteRtLmController", () => {
  it("loads once and exposes an exhaustive ready-state progression", async () => {
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

  it("never imports or loads the model in unsupported environments", async () => {
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

  it("makes model loading failures observable as terminal state", async () => {
    const error = new Error("model unavailable");
    const controller = new LiteRtLmController({
      detectSupport: async () => ({ supported: true }),
      loadEngine: async () => Promise.reject(error),
    });

    assert.deepEqual(await controller.initialize(), { error, status: "failed" });
    assert.equal(controller.engine, undefined);
  });

  it("makes unexpected detection failures observable as terminal state", async () => {
    const error = new Error("detection failed");
    const controller = new LiteRtLmController({
      detectSupport: async () => Promise.reject(error),
      loadEngine: async () => ({}) as Engine,
    });

    assert.deepEqual(await controller.initialize(), { error, status: "failed" });
    assert.equal(controller.engine, undefined);
  });
});
