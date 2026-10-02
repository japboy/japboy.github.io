import type { Engine } from "@litert-lm/core";

import type { LiteRtLmController } from "./controller.js";

export type LiteRtLmPageState = "active" | "suspended" | "disposed" | "failed";

export interface LiteRtLmPageSession {
  start: () => Promise<void>;
  cancel: () => void;
  dispose: () => void;
}

interface ActiveSession {
  session: LiteRtLmPageSession;
  completion: Promise<void>;
  cancelled: boolean;
}

/** Owns page presence separately from greeting visibility and engine availability. */
export class LiteRtLmPageLifecycle {
  #state: LiteRtLmPageState = "active";
  #activeSession: ActiveSession | undefined;
  #reconciliation: Promise<void> = Promise.resolve();
  readonly #runtime: LiteRtLmController;
  readonly #createSession: (engine: Engine) => Promise<LiteRtLmPageSession>;
  readonly #onFailure: () => void;

  constructor(
    runtime: LiteRtLmController,
    createSession: (engine: Engine) => Promise<LiteRtLmPageSession>,
    onFailure: () => void,
  ) {
    this.#runtime = runtime;
    this.#createSession = createSession;
    this.#onFailure = onFailure;
  }

  get state(): LiteRtLmPageState {
    return this.#state;
  }

  show(): Promise<void> {
    if (this.#state === "disposed" || this.#state === "failed") return this.#reconciliation;
    this.#state = "active";
    return this.#schedule();
  }

  hide(persisted: boolean): Promise<void> {
    if (this.#state === "disposed" || (persisted && this.#state === "failed")) {
      return this.#reconciliation;
    }
    this.#state = persisted ? "suspended" : "disposed";
    const active = this.#activeSession;
    if (active !== undefined && !active.cancelled) {
      active.cancelled = true;
      active.session.cancel();
    }
    // No session can use a loading engine; invalidate initialization immediately.
    if (!persisted && active === undefined) void this.#runtime.dispose().catch(this.#onFailure);
    return this.#schedule();
  }

  #schedule(): Promise<void> {
    this.#reconciliation = this.#reconciliation
      .then(() => this.#reconcile())
      .catch(() => {
        if (this.#state !== "disposed") this.#state = "failed";
        this.#onFailure();
      });
    return this.#reconciliation;
  }

  async #reconcile(): Promise<void> {
    const active = this.#activeSession;
    if (active?.cancelled) {
      await active.completion;
      this.#activeSession = undefined;
    }
    if (this.#state === "disposed") {
      await this.#runtime.dispose();
      return;
    }
    if (this.#state !== "active" || this.#activeSession !== undefined) return;
    await this.#runtime.initialize();
    if (!this.#isActive()) return;
    const engine = this.#runtime.engine;
    if (engine === undefined) return;
    const session = await this.#createSession(engine);
    if (!this.#isActive()) {
      session.cancel();
      session.dispose();
      return;
    }
    const record: ActiveSession = { session, cancelled: false, completion: Promise.resolve() };
    this.#activeSession = record;
    record.completion = session
      .start()
      .catch(() => {
        if (!record.cancelled && this.#isActive()) {
          this.#state = "failed";
          this.#onFailure();
        }
      })
      .finally(() => session.dispose());
  }

  #isActive(): boolean {
    return this.#state === "active";
  }
}
