import type { Engine } from "@litert-lm/core";

import { liteRtLmConfiguration } from "./config.js";
import {
  detectLiteRtLmSupport,
  type LiteRtLmSupport,
  type LiteRtLmUnsupportedReason,
} from "./feature-detection.js";

export type LiteRtLmState =
  | { status: "idle" }
  | { status: "detecting" }
  | { reason: LiteRtLmUnsupportedReason; status: "unsupported" }
  | { status: "loading" }
  | { status: "ready" }
  | { error: Error; status: "failed" }
  | { status: "disposed" };

export type LiteRtLmStateListener = (state: LiteRtLmState) => void;

type LiteRtLmStatus = LiteRtLmState["status"];

const allowedTransitions = {
  detecting: ["disposed", "failed", "loading", "unsupported"],
  disposed: [],
  failed: ["disposed"],
  idle: ["detecting", "disposed"],
  loading: ["disposed", "failed", "ready"],
  ready: ["disposed"],
  unsupported: ["disposed"],
} as const satisfies Record<LiteRtLmStatus, readonly LiteRtLmStatus[]>;

export interface LiteRtLmControllerDependencies {
  detectSupport: () => Promise<LiteRtLmSupport>;
  loadEngine: () => Promise<Engine>;
}

const loadConfiguredEngine = async (): Promise<Engine> => {
  const { Backend, Engine, loadLiteRtLm } = await import("@litert-lm/core");

  await loadLiteRtLm(liteRtLmConfiguration.runtime.wasmUrl);

  return Engine.create({
    backend: Backend.GPU_ARTISAN,
    mainExecutorSettings: {
      maxNumTokens: liteRtLmConfiguration.runtime.maxNumTokens,
    },
    model: liteRtLmConfiguration.model.url,
  });
};

const defaultDependencies: LiteRtLmControllerDependencies = {
  detectSupport: detectLiteRtLmSupport,
  loadEngine: loadConfiguredEngine,
};

export class LiteRtLmController {
  #dependencies: LiteRtLmControllerDependencies;
  #engine: Engine | undefined;
  #initialization: Promise<LiteRtLmState> | undefined;
  #disposal: Promise<void> | undefined;
  #listeners = new Set<LiteRtLmStateListener>();
  #state: LiteRtLmState = { status: "idle" };

  constructor(dependencies: LiteRtLmControllerDependencies = defaultDependencies) {
    this.#dependencies = dependencies;
  }

  get engine(): Engine | undefined {
    return this.#engine;
  }

  get state(): LiteRtLmState {
    return this.#state;
  }

  initialize(): Promise<LiteRtLmState> {
    if (this.#state.status === "disposed") return Promise.resolve(this.#state);
    this.#initialization ??= Promise.resolve().then(() => this.#initialize());
    return this.#initialization;
  }

  dispose(): Promise<void> {
    if (this.#disposal !== undefined) return this.#disposal;
    const engine = this.#engine;
    this.#engine = undefined;
    this.#disposal = Promise.resolve().then(async () => {
      await engine?.delete();
      await this.#initialization;
    });
    this.#transition({ status: "disposed" });
    this.#listeners.clear();
    return this.#disposal;
  }

  subscribe(listener: LiteRtLmStateListener): () => void {
    this.#listeners.add(listener);
    listener(this.#state);

    return () => this.#listeners.delete(listener);
  }

  async #initialize(): Promise<LiteRtLmState> {
    if (this.#isDisposed()) return this.#state;
    this.#transition({ status: "detecting" });

    let support: LiteRtLmSupport;

    try {
      support = await this.#dependencies.detectSupport();
    } catch (cause) {
      if (this.#isDisposed()) return this.#state;
      return this.#transition({ error: this.#toError(cause), status: "failed" });
    }

    if (this.#isDisposed()) return this.#state;

    if (!support.supported) {
      return this.#transition({ reason: support.reason, status: "unsupported" });
    }

    this.#transition({ status: "loading" });

    try {
      const engine = await this.#dependencies.loadEngine();
      if (this.#isDisposed()) {
        await engine.delete();
        return this.#state;
      }
      this.#engine = engine;
      return this.#transition({ status: "ready" });
    } catch (cause) {
      if (this.#isDisposed()) return this.#state;
      return this.#transition({ error: this.#toError(cause), status: "failed" });
    }
  }

  #isDisposed(): boolean {
    return this.#state.status === "disposed";
  }

  #toError(cause: unknown): Error {
    return cause instanceof Error ? cause : new Error(String(cause));
  }

  #transition(state: LiteRtLmState): LiteRtLmState {
    const allowedNextStates: readonly LiteRtLmStatus[] = allowedTransitions[this.#state.status];

    if (!allowedNextStates.includes(state.status)) {
      throw new Error(`Invalid LiteRT-LM transition: ${this.#state.status} -> ${state.status}`);
    }

    this.#state = state;

    for (const listener of this.#listeners) {
      listener(state);
    }

    return state;
  }
}

export const liteRtLmController = new LiteRtLmController();
