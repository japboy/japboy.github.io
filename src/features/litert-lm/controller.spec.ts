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

  it("invalidates pending detection without loading and cannot reinitialize", async () => {
    let detect!: (value: { supported: true }) => void;
    let loads = 0;
    const controller = new LiteRtLmController({
      detectSupport: () =>
        new Promise((resolve) => {
          detect = resolve;
        }),
      loadEngine: async () => {
        loads += 1;
        return {} as Engine;
      },
    });
    const initialization = controller.initialize();
    await Promise.resolve();
    const disposal = controller.dispose();
    detect({ supported: true });
    await Promise.all([initialization, disposal]);
    assert.deepEqual(await controller.initialize(), { status: "disposed" });
    assert.equal(loads, 0);
  });

  it("releases an initialized engine exactly once", async () => {
    let deletes = 0;
    const controller = new LiteRtLmController({
      detectSupport: async () => ({ supported: true }),
      loadEngine: async () =>
        ({
          delete: async () => {
            deletes += 1;
          },
        }) as unknown as Engine,
    });
    await controller.initialize();
    await Promise.all([controller.dispose(), controller.dispose()]);
    assert.equal(controller.engine, undefined);
    assert.equal(deletes, 1);
  });

  it("publishes disposal with no engine and shares cleanup with reentrant observers", async () => {
    let release!: () => void;
    let observerDisposal: Promise<void> | undefined;
    const controller = new LiteRtLmController({
      detectSupport: async () => ({ supported: true }),
      loadEngine: async () =>
        ({
          delete: () =>
            new Promise<void>((resolve) => {
              release = resolve;
            }),
        }) as unknown as Engine,
    });
    await controller.initialize();
    controller.subscribe((state) => {
      if (state.status !== "disposed") return;
      assert.equal(controller.engine, undefined);
      observerDisposal = controller.dispose();
    });
    const disposal = controller.dispose();
    assert.equal(observerDisposal, disposal);
    let completed = false;
    void disposal.then(() => {
      completed = true;
    });
    await Promise.resolve();
    assert.equal(completed, false);
    release();
    await disposal;
  });
});
