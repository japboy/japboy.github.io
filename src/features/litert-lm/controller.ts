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
  | { error: Error; status: "failed" };

export type LiteRtLmStateListener = (state: LiteRtLmState) => void;

type LiteRtLmStatus = LiteRtLmState["status"];

const allowedTransitions = {
  detecting: ["failed", "loading", "unsupported"],
  failed: [],
  idle: ["detecting"],
  loading: ["failed", "ready"],
  ready: [],
  unsupported: [],
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
    this.#initialization ??= this.#initialize();
    return this.#initialization;
  }

  subscribe(listener: LiteRtLmStateListener): () => void {
    this.#listeners.add(listener);
    listener(this.#state);

    return () => this.#listeners.delete(listener);
  }

  async #initialize(): Promise<LiteRtLmState> {
    this.#transition({ status: "detecting" });

    let support: LiteRtLmSupport;

    try {
      support = await this.#dependencies.detectSupport();
    } catch (cause) {
      return this.#transition({ error: this.#toError(cause), status: "failed" });
    }

    if (!support.supported) {
      return this.#transition({ reason: support.reason, status: "unsupported" });
    }

    this.#transition({ status: "loading" });

    try {
      this.#engine = await this.#dependencies.loadEngine();
      return this.#transition({ status: "ready" });
    } catch (cause) {
      return this.#transition({ error: this.#toError(cause), status: "failed" });
    }
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
