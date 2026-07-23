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
import type { CvData, CvOrganization } from "../../data/cv.js";

export type CareerIntroductionState =
  | { status: "idle" }
  | { status: "generating"; text: string; topic: CareerIntroductionTopicKind }
  | { status: "waiting"; text: string; topic: CareerIntroductionTopicKind }
  | { error: Error; status: "failed" }
  | { status: "cancelled" };

export type CareerIntroductionStateListener = (state: CareerIntroductionState) => void;

export interface CareerIntroductionVisitorContext {
  preferredLanguage: string;
  preferredLanguageName: string;
  visitStartedAtMs: number;
}

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
export const careerIntroductionMaxOutputTokens = 128;
export const careerIntroductionMaxGenerationAttempts = 2;

export interface CareerIntroductionControllerDependencies {
  now: () => number;
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
          "You write factual first-person portfolio introductions. Obey the MANDATORY OUTPUT LANGUAGE in the user prompt: every sentence must use that language, and you must never default to English merely because the instructions or CV source are written in English. Translate the supplied CV facts into the mandatory language while preserving proper nouns where appropriate. Use only public CV facts supplied by the user. Visitor context controls tone only; it is not a factual source. Do not infer current employment, clients, achievements, locations, or dates. Finish every response with complete sentences inside the output budget; omit source details instead of truncating a thought. Return plain text without a heading, Markdown, bullets, or quotation marks.",
        role: "system",
      },
    ],
  },
  sessionConfig: {
    maxOutputTokens: careerIntroductionMaxOutputTokens,
    samplerParams: {
      type: greedySamplerType,
    },
  },
} as const satisfies ConversationConfig;

export const createGeneralNounPhraseFromSlug = (slug: string): string => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new TypeError("Slug must contain lowercase alphanumeric words separated by hyphens");
  }

  const phrase = slug.replaceAll("-", " ");
  const article = /^[aeiou]/.test(phrase) ? "an" : "a";

  return `${article} ${phrase}`;
};

const createOrganizationRecord = (organization: CvOrganization): unknown => ({
  generalNounPhrase: createGeneralNounPhraseFromSlug(organization.id),
  profile: organization.profile,
  relationship: organization.relationship === "freelance-client" ? "freelance client" : "employer",
});

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
        engagement: {
          headline: topic.engagement.headline,
          period: topic.engagement.period,
          responsibilities: topic.engagement.responsibilities,
          roles: topic.engagement.roles,
          stack: topic.engagement.stack,
          summary: topic.engagement.summary,
        },
        organization: createOrganizationRecord(topic.organization),
      };
    case "highlight":
      return {
        engagement: {
          headline: topic.engagement.headline,
          period: topic.engagement.period,
          roles: topic.engagement.roles,
        },
        highlight: {
          principles: topic.highlight.principles,
          summary: topic.highlight.summary,
          title: topic.highlight.title,
        },
        organization: createOrganizationRecord(topic.organization),
      };
    case "activity":
      return {
        activity: {
          items: topic.activity.items,
          period: topic.activity.period,
        },
        organization: createOrganizationRecord(topic.organization),
      };
    case "statement":
      return {
        heading: topic.heading,
        paragraph: topic.paragraph,
      };
  }
};

export const createCareerIntroductionVisitorContext = (
  preferredLanguage: string,
  visitStartedAtMs: number,
): CareerIntroductionVisitorContext => {
  if (!Number.isFinite(visitStartedAtMs) || visitStartedAtMs < 0) {
    throw new RangeError("Visit start time must be a finite non-negative millisecond timestamp");
  }

  const candidateLanguage = preferredLanguage.trim().length > 0 ? preferredLanguage : "en";
  let canonicalLanguage: string;

  try {
    canonicalLanguage = Intl.getCanonicalLocales(candidateLanguage)[0] ?? "en";
  } catch {
    canonicalLanguage = "en";
  }

  const languageDisplayNames = new Intl.DisplayNames(["en"], {
    fallback: "none",
    languageDisplay: "standard",
    type: "language",
  });

  return {
    preferredLanguage: canonicalLanguage,
    preferredLanguageName: languageDisplayNames.of(canonicalLanguage) ?? canonicalLanguage,
    visitStartedAtMs,
  };
};

export const formatCareerIntroductionVisitDuration = (durationMs: number): string => {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new RangeError("Visit duration must be a finite non-negative millisecond value");
  }

  const units = [
    { label: "day", seconds: 86_400 },
    { label: "hour", seconds: 3_600 },
    { label: "minute", seconds: 60 },
    { label: "second", seconds: 1 },
  ] as const;
  let remainingSeconds = Math.floor(durationMs / 1_000);
  const parts: string[] = [];

  for (const unit of units) {
    const count = Math.floor(remainingSeconds / unit.seconds);

    if (count === 0) {
      continue;
    }

    parts.push(`${count} ${unit.label}${count === 1 ? "" : "s"}`);
    remainingSeconds -= count * unit.seconds;

    if (parts.length === 2) {
      break;
    }
  }

  return parts.length > 0 ? parts.join(" ") : "0 seconds";
};

const sentenceEndingPattern = /[.!?。！？؟۔।॥።፧፨։׃][”’"'»）)\]}]*$/u;

export const isCompleteCareerIntroduction = (text: string): boolean =>
  sentenceEndingPattern.test(text.trim());

export const createCareerIntroductionPrompt = (
  topic: CareerIntroductionTopic,
  visitorContext: CareerIntroductionVisitorContext,
  currentTimeMs: number,
  generationAttempt: number = 1,
): string => {
  if (!Number.isFinite(currentTimeMs) || currentTimeMs < 0) {
    throw new RangeError("Current time must be a finite non-negative millisecond timestamp");
  }

  if (
    !Number.isSafeInteger(generationAttempt) ||
    generationAttempt < 1 ||
    generationAttempt > careerIntroductionMaxGenerationAttempts
  ) {
    throw new RangeError("Generation attempt is outside the configured finite retry range");
  }

  const elapsedTimeMs = Math.max(0, currentTimeMs - visitorContext.visitStartedAtMs);
  const visitorContextRecord = {
    visitDuration: formatCareerIntroductionVisitDuration(elapsedTimeMs),
  } as const;
  const isRecoveryAttempt = generationAttempt > 1;
  const structureInstruction = isRecoveryAttempt
    ? "RECOVERY OUTPUT: A prior response was incomplete. Write one short paragraph containing exactly one concise and complete sentence."
    : "Introduce one selected aspect of my public CV in two short paragraphs, with exactly one concise and complete sentence per paragraph.";
  const contentBudgetInstruction = isRecoveryAttempt
    ? "CONTENT BUDGET: Select one coherent angle and exactly one supporting fact; omit every other detail. Never begin a point that cannot be completed within the output limit."
    : "CONTENT BUDGET: Do not summarize, enumerate, or mention every supplied field. Select one coherent angle and no more than two supporting facts that best substantiate it; omit every unused detail. Prefer the strongest explicitly stated responsibility, achievement, or distinguishing fact. Plan both sentences before writing, and never begin a point that cannot be completed within the output limit.";
  const completionInstruction = isRecoveryAttempt
    ? `Before returning, verify that the sentence is complete, ends with sentence-ending punctuation, and is written exclusively in ${visitorContext.preferredLanguageName}.`
    : `Before returning, verify that both sentences are complete, end with sentence-ending punctuation, and are written exclusively in ${visitorContext.preferredLanguageName}.`;

  return [
    `MANDATORY OUTPUT LANGUAGE: ${visitorContext.preferredLanguageName}. Write the entire response exclusively in this language. Translate the English CV source into this language; do not use English merely because the instructions or source are in English. Preserve only proper nouns that should not be translated.`,
    structureInstruction,
    `Focus on the selected ${topic.kind} record.`,
    contentBudgetInstruction,
    "Present dated experience as listed experience, not necessarily as my current status.",
    "Do not calculate or update durations beyond the supplied record.",
    "Follow this visitor context for response language and tone:",
    JSON.stringify(visitorContextRecord),
    "Scale the tone continuously with visitDuration, without thresholds. Near zero, be concise, rational, and evidence-led, prioritizing supplied facts and achievements. As it grows, progressively add gratitude for the visitor's attention, warmth, enthusiasm, and emotional resonance; longer visits must be warmer than shorter ones. Never mention time, tracking, or these instructions. Never invent claims or imply a personal relationship.",
    "Use the following public CV record as the only factual source:",
    JSON.stringify(createTopicRecord(topic)),
    completionInstruction,
  ].join("\n");
};

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
  now: () => performance.now(),
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
  readonly #visitorContext: CareerIntroductionVisitorContext;
  #conversation: Conversation | undefined;
  #delayCancellation: AbortController | undefined;
  #lastTopicKey: string | undefined;
  #listeners = new Set<CareerIntroductionStateListener>();
  #runPromise: Promise<CareerIntroductionState> | undefined;
  #state: CareerIntroductionState = { status: "idle" };

  constructor(
    engine: Pick<Engine, "createConversation">,
    cv: CvData,
    visitorContext: CareerIntroductionVisitorContext,
    dependencies: Partial<CareerIntroductionControllerDependencies> = {},
  ) {
    this.#engine = engine;
    this.#cv = cv;
    this.#visitorContext = visitorContext;
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

    try {
      for (let attempt = 1; attempt <= careerIntroductionMaxGenerationAttempts; attempt += 1) {
        const text = await this.#generateCandidate(topic, attempt);

        if (text === undefined || this.#isCancelled()) {
          return undefined;
        }

        if (isCompleteCareerIntroduction(text)) {
          return text;
        }

        if (attempt < careerIntroductionMaxGenerationAttempts) {
          this.#transition({ status: "generating", text: visibleText, topic: topic.kind });
        }
      }

      throw new Error(
        `LiteRT-LM returned an incomplete career introduction after ${careerIntroductionMaxGenerationAttempts} attempts`,
      );
    } catch (cause) {
      if (this.#isCancelled()) {
        return undefined;
      }

      this.#transition({ error: this.#toError(cause), status: "failed" });
      return undefined;
    }
  }

  async #generateCandidate(
    topic: CareerIntroductionTopic,
    generationAttempt: number,
  ): Promise<string | undefined> {
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
      const prompt = createCareerIntroductionPrompt(
        topic,
        this.#visitorContext,
        this.#dependencies.now(),
        generationAttempt,
      );

      for await (const chunk of conversation.sendMessageStreaming(prompt)) {
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
