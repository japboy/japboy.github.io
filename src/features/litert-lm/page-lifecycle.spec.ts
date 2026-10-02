import assert from "node:assert/strict";

import type { Engine } from "@litert-lm/core";
import { describe, it } from "vitest";

import { LiteRtLmController } from "./controller.js";
import { LiteRtLmPageLifecycle, type LiteRtLmPageSession } from "./page-lifecycle.js";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};

const fixture = () => {
  const events: string[] = [];
  const sessions: {
    completion: ReturnType<typeof deferred<void>>;
    session: LiteRtLmPageSession;
  }[] = [];
  const engine = {
    delete: async () => {
      events.push("engine deleted");
    },
  } as unknown as Engine;
  const runtime = new LiteRtLmController({
    detectSupport: async () => ({ supported: true }),
    loadEngine: async () => engine,
  });
  const createSession = async () => {
    const id = sessions.length;
    const completion = deferred<void>();
    const session = {
      start: () => {
        events.push(`start ${id}`);
        return completion.promise;
      },
      cancel: () => {
        events.push(`cancel ${id}`);
      },
      dispose: () => {
        events.push(`dispose ${id}`);
      },
    };
    sessions.push({ completion, session });
    return session;
  };
  const lifecycle = new LiteRtLmPageLifecycle(runtime, createSession, () => events.push("failure"));
  return { lifecycle, events, sessions, runtime, engine, createSession };
};

describe("LiteRtLmPageLifecycle", () => {
  it("restarts after repeated bfcache restores only after old conversation cleanup", async () => {
    const { lifecycle, events, sessions } = fixture();
    await lifecycle.show();
    await lifecycle.show();
    assert.deepEqual(events, ["start 0"]);
    const hidden = lifecycle.hide(true);
    const restored = lifecycle.show();
    await Promise.resolve();
    assert.deepEqual(events, ["start 0", "cancel 0"]);
    sessions[0]!.completion.resolve();
    await Promise.all([hidden, restored]);
    assert.deepEqual(events, ["start 0", "cancel 0", "dispose 0", "start 1"]);
    const hiddenAgain = lifecycle.hide(true);
    sessions[1]!.completion.resolve();
    await hiddenAgain;
    assert.equal(lifecycle.state, "suspended");
    await lifecycle.show();
    assert.equal(sessions.length, 3);
    const disposed = lifecycle.hide(false);
    sessions[2]!.completion.resolve();
    await disposed;
    assert.equal(events.at(-1), "engine deleted");
  });

  it("never revives a disposed page and deletes the engine after the session", async () => {
    const { lifecycle, events, sessions } = fixture();
    await lifecycle.show();
    const disposed = lifecycle.hide(false);
    const shown = lifecycle.show();
    assert.deepEqual(events, ["start 0", "cancel 0"]);
    sessions[0]!.completion.resolve();
    await Promise.all([disposed, shown, lifecycle.hide(false)]);
    assert.equal(lifecycle.state, "disposed");
    assert.deepEqual(events, ["start 0", "cancel 0", "dispose 0", "engine deleted"]);
  });

  it("does not start a session when hidden during async session preparation", async () => {
    const { runtime, events, createSession } = fixture();
    const preparation = deferred<LiteRtLmPageSession>();
    const entered = deferred<void>();
    const lifecycle = new LiteRtLmPageLifecycle(
      runtime,
      async () => {
        entered.resolve();
        return preparation.promise;
      },
      () => events.push("failure"),
    );
    const shown = lifecycle.show();
    await entered.promise;
    const hidden = lifecycle.hide(true);
    preparation.resolve(await createSession());
    await Promise.all([shown, hidden]);
    assert.deepEqual(events, ["cancel 0", "dispose 0"]);
    await lifecycle.hide(false);
  });

  it("releases late engines without starting generation after exit during loading", async () => {
    const loading = deferred<Engine>();
    const entered = deferred<void>();
    let deletions = 0;
    let sessions = 0;
    const runtime = new LiteRtLmController({
      detectSupport: async () => ({ supported: true }),
      loadEngine: () => {
        entered.resolve();
        return loading.promise;
      },
    });
    const lifecycle = new LiteRtLmPageLifecycle(
      runtime,
      async () => {
        sessions += 1;
        throw new Error("must not create");
      },
      () => assert.fail("unexpected failure"),
    );
    const shown = lifecycle.show();
    await entered.promise;
    const disposed = lifecycle.hide(false);
    loading.resolve({
      delete: async () => {
        deletions += 1;
      },
    } as unknown as Engine);
    await Promise.all([shown, disposed]);
    assert.equal(runtime.state.status, "disposed");
    assert.equal(runtime.engine, undefined);
    assert.equal(deletions, 1);
    assert.equal(sessions, 0);
  });

  it("keeps preparation failure terminal across persisted hide/show and still disposes", async () => {
    const { runtime, events } = fixture();
    let attempts = 0;
    const lifecycle = new LiteRtLmPageLifecycle(
      runtime,
      async () => {
        attempts += 1;
        throw new Error("preparation failed");
      },
      () => events.push("failure"),
    );
    await lifecycle.show();
    assert.equal(lifecycle.state, "failed");
    await lifecycle.hide(true);
    await lifecycle.show();
    assert.equal(lifecycle.state, "failed");
    assert.equal(attempts, 1);
    await lifecycle.hide(false);
    assert.equal(lifecycle.state, "disposed");
    assert.deepEqual(events, ["failure", "engine deleted"]);
  });
});
