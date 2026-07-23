import type {
  Conversation,
  ConversationConfig,
  Engine,
  Message,
  SamplerParameters,
} from "@litert-lm/core";

import {
  selectRandomCareerIntroductionTopic,
  type CareerIntroductionTopic,
  type CareerIntroductionTopicKind,
} from "../../data/career-introduction-topic.js";
import type { CvData } from "../../data/cv.js";

export type CareerIntroductionState =
  | { status: "idle" }
  | { status: "generating"; text: string; topic: CareerIntroductionTopicKind }
  | { status: "waiting"; text: string; topic: CareerIntroductionTopicKind }
  | { error: Error; status: "failed" }
  | { status: "cancelled" };

export type CareerIntroductionStateListener = (state: CareerIntroductionState) => void;

type CareerIntroductionStatus = CareerIntroductionState["status"];

const allowedTransitions = {
  cancelled: [],
  failed: [],
  generating: ["cancelled", "failed", "generating", "waiting"],
  idle: ["cancelled", "failed", "generating"],
  waiting: ["cancelled", "failed", "generating"],
} as const satisfies Record<CareerIntroductionStatus, readonly CareerIntroductionStatus[]>;

export const careerIntroductionRepeatDelayMs = 6_000;
export const careerIntroductionRepeatJitterMs = 999;

export interface CareerIntroductionControllerDependencies {
  random: () => number;
  repeatDelayMs: number;
  repeatJitterMs: number;
  wait: (durationMs: number, signal: AbortSignal) => Promise<void>;
}

export const createRandomizedCareerIntroductionDelayMs = (
  random: () => number = Math.random,
  repeatDelayMs: number = careerIntroductionRepeatDelayMs,
  repeatJitterMs: number = careerIntroductionRepeatJitterMs,
): number => {
  if (!Number.isSafeInteger(repeatDelayMs) || repeatDelayMs <= 0) {
    throw new RangeError("Repeat delay must be a positive integer");
  }

  if (
    !Number.isSafeInteger(repeatJitterMs) ||
    repeatJitterMs < 0 ||
    repeatJitterMs >= repeatDelayMs
  ) {
    throw new RangeError("Repeat jitter must be a non-negative integer below the repeat delay");
  }

  const sample = random();

  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
    throw new RangeError("Random source must return a finite number from 0 (inclusive) to 1");
  }

  return repeatDelayMs + Math.floor(sample * (repeatJitterMs * 2 + 1)) - repeatJitterMs;
};

// Mirrors SamplerType.GREEDY without a runtime import that would bypass capability-gated loading.
const greedySamplerType = 3 satisfies SamplerParameters["type"];

const conversationConfiguration = {
  preface: {
    messages: [
      {
        content:
          "You write factual first-person portfolio introductions. Use only facts supplied by the user. Do not infer current employment, clients, achievements, locations, or dates. Return plain English text without a heading, Markdown, bullets, or quotation marks.",
        role: "system",
      },
    ],
  },
  sessionConfig: {
    maxOutputTokens: 160,
    samplerParams: {
      type: greedySamplerType,
    },
  },
} as const satisfies ConversationConfig;

const createTopicRecord = (topic: CareerIntroductionTopic): unknown => {
  switch (topic.kind) {
    case "profile":
      return topic.profile;
    case "skill":
      return {
        group: topic.group.label,
        skill: topic.skill,
      };
    case "engagement":
      return {
        engagement: topic.engagement,
        organization: topic.organization,
      };
    case "highlight":
      return {
        engagement: {
          headline: topic.engagement.headline,
          period: topic.engagement.period,
          roles: topic.engagement.roles,
        },
        highlight: topic.highlight,
        organization: topic.organization,
      };
    case "activity":
      return {
        activity: topic.activity,
        organization: topic.organization,
      };
    case "statement":
      return topic.statement;
  }
};

const createPrompt = (topic: CareerIntroductionTopic): string =>
  [
    "Introduce one selected aspect of my public CV in two short paragraphs totaling 45 to 70 words.",
    `Focus on the selected ${topic.kind} record.`,
    "Present dated experience as listed experience, not necessarily as my current status.",
    "Do not calculate or update durations beyond the supplied record.",
    "Use the following public CV record as the only factual source:",
    JSON.stringify(createTopicRecord(topic)),
  ].join("\n");

const waitForDelay = (durationMs: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    const complete = (): void => {
      clearTimeout(timer);
      signal.removeEventListener("abort", complete);
      resolve();
    };
    const timer = setTimeout(complete, durationMs);

    signal.addEventListener("abort", complete, { once: true });
  });

const defaultDependencies: CareerIntroductionControllerDependencies = {
  random: Math.random,
  repeatDelayMs: careerIntroductionRepeatDelayMs,
  repeatJitterMs: careerIntroductionRepeatJitterMs,
  wait: waitForDelay,
};

const getText = ({ content }: Message): string => {
  if (typeof content === "string") {
    return content;
  }

  return (content ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
};

export class CareerIntroductionController {
  readonly #engine: Pick<Engine, "createConversation">;
  readonly #cv: CvData;
  readonly #dependencies: CareerIntroductionControllerDependencies;
  #conversation: Conversation | undefined;
  #delayCancellation: AbortController | undefined;
  #lastTopicKey: string | undefined;
  #listeners = new Set<CareerIntroductionStateListener>();
  #runPromise: Promise<CareerIntroductionState> | undefined;
  #state: CareerIntroductionState = { status: "idle" };

  constructor(
    engine: Pick<Engine, "createConversation">,
    cv: CvData,
    dependencies: Partial<CareerIntroductionControllerDependencies> = {},
  ) {
    this.#engine = engine;
    this.#cv = cv;
    this.#dependencies = { ...defaultDependencies, ...dependencies };
  }

  get state(): CareerIntroductionState {
    return this.#state;
  }

  start(): Promise<CareerIntroductionState> {
    this.#runPromise ??= this.#run();
    return this.#runPromise;
  }

  subscribe(listener: CareerIntroductionStateListener): () => void {
    this.#listeners.add(listener);
    listener(this.#state);

    return () => this.#listeners.delete(listener);
  }

  cancel(): void {
    if (this.#state.status === "cancelled" || this.#state.status === "failed") {
      return;
    }

    this.#conversation?.cancel();
    this.#delayCancellation?.abort();
    this.#transition({ status: "cancelled" });
  }

  async #run(): Promise<CareerIntroductionState> {
    let visibleText = "";

    while (!this.#isCancelled()) {
      let topic: CareerIntroductionTopic;

      try {
        topic = selectRandomCareerIntroductionTopic(
          this.#cv,
          this.#dependencies.random,
          this.#lastTopicKey,
        );
      } catch (cause) {
        this.#transition({ error: this.#toError(cause), status: "failed" });
        return this.#state;
      }

      this.#lastTopicKey = topic.key;
      const text = await this.#generate(topic, visibleText);

      if (text === undefined || this.#isCancelled()) {
        return this.#state;
      }

      visibleText = text;
      const delayCancellation = new AbortController();
      this.#delayCancellation = delayCancellation;
      this.#transition({ status: "waiting", text, topic: topic.kind });

      if (this.#isCancelled()) {
        return this.#state;
      }

      try {
        const randomizedDelayMs = createRandomizedCareerIntroductionDelayMs(
          this.#dependencies.random,
          this.#dependencies.repeatDelayMs,
          this.#dependencies.repeatJitterMs,
        );
        await this.#dependencies.wait(randomizedDelayMs, delayCancellation.signal);
      } catch (cause) {
        if (!this.#isCancelled()) {
          this.#transition({ error: this.#toError(cause), status: "failed" });
        }

        return this.#state;
      } finally {
        this.#delayCancellation = undefined;
      }
    }

    return this.#state;
  }

  async #generate(
    topic: CareerIntroductionTopic,
    visibleText: string,
  ): Promise<string | undefined> {
    this.#transition({ status: "generating", text: visibleText, topic: topic.kind });
    let conversation: Conversation | undefined;
    let deletionAttempted = false;

    try {
      conversation = await this.#engine.createConversation(conversationConfiguration);
      this.#conversation = conversation;

      if (this.#isCancelled()) {
        conversation.cancel();
        return undefined;
      }

      let generatedText = "";

      for await (const chunk of conversation.sendMessageStreaming(createPrompt(topic))) {
        if (this.#isCancelled()) {
          break;
        }

        const appendedText = getText(chunk);

        if (appendedText.length > 0) {
          generatedText += appendedText;
          const visibleText = generatedText.trimStart();

          if (visibleText.length > 0) {
            this.#transition({ status: "generating", text: visibleText, topic: topic.kind });
          }
        }
      }

      if (this.#isCancelled()) {
        return undefined;
      }

      const text = generatedText.trim();

      if (text.length === 0) {
        throw new Error("LiteRT-LM returned an empty career introduction");
      }

      deletionAttempted = true;
      await conversation.delete();
      conversation = undefined;
      this.#conversation = undefined;

      return text;
    } catch (cause) {
      if (this.#isCancelled()) {
        return undefined;
      }

      this.#transition({ error: this.#toError(cause), status: "failed" });
      return undefined;
    } finally {
      this.#conversation = undefined;

      if (conversation !== undefined && !deletionAttempted) {
        try {
          await conversation.delete();
        } catch {
          // Preserve the generation or cancellation result when best-effort cleanup fails.
        }
      }
    }
  }

  #toError(cause: unknown): Error {
    return cause instanceof Error ? cause : new Error(String(cause));
  }

  #isCancelled(): boolean {
    return this.#state.status === "cancelled";
  }

  #transition(state: CareerIntroductionState): CareerIntroductionState {
    const allowedNextStates: readonly CareerIntroductionStatus[] =
      allowedTransitions[this.#state.status];

    if (!allowedNextStates.includes(state.status)) {
      throw new Error(
        `Invalid career introduction transition: ${this.#state.status} -> ${state.status}`,
      );
    }

    this.#state = state;

    for (const listener of this.#listeners) {
      listener(state);
    }

    return state;
  }
}
