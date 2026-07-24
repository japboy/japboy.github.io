import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { Conversation, ConversationConfig, Engine, Message } from "@litert-lm/core";
import { parse } from "yaml";

import { renderHome } from "../src/server/renderers/home.js";
import {
  createCareerIntroductionTopicGroups,
  selectRandomCareerIntroductionTopic,
} from "../src/data/career-introduction-topic.js";
import type { CvData } from "../src/data/cv.js";
import {
  CareerIntroductionController,
  type CareerIntroductionState,
  careerIntroductionMaxGenerationAttempts,
  careerIntroductionMaxOutputTokens,
  careerIntroductionRepeatDelayMs,
  careerIntroductionRepeatJitterMs,
  createCareerIntroductionPrompt,
  createCareerIntroductionVisitorContext,
  createGeneralNounPhraseFromSlug,
  createRandomizedCareerIntroductionDelayMs,
  formatCareerIntroductionVisitDuration,
  isCompleteCareerIntroduction,
} from "../src/features/litert-lm/career-introduction.js";

const projectRoot = new URL("../", import.meta.url);

const readCv = async (): Promise<CvData> =>
  parse(await readFile(new URL("src/data/cv.yaml", projectRoot), "utf8")) as CvData;

const englishVisitorContext = createCareerIntroductionVisitorContext("en-US", 0);

interface ConversationDouble {
  conversation: Conversation;
  getCancelCount: () => number;
  getDeleteCount: () => number;
  getPrompt: () => string | undefined;
}

const createConversationDouble = (chunks: string[]): ConversationDouble => {
  let cancelCount = 0;
  let deleteCount = 0;
  let prompt: string | undefined;

  const conversation = {
    cancel() {
      cancelCount += 1;
    },
    async delete() {
      deleteCount += 1;
    },
    sendMessageStreaming(message: string) {
      prompt = message;

      return new ReadableStream<Message>({
        start(controller) {
          for (const text of chunks) {
            controller.enqueue({
              content: [{ text, type: "text" }],
              role: "assistant",
            });
          }

          controller.close();
        },
      });
    },
  } as Pick<Conversation, "cancel" | "delete" | "sendMessageStreaming"> as Conversation;

  return {
    conversation,
    getCancelCount: () => cancelCount,
    getDeleteCount: () => deleteCount,
    getPrompt: () => prompt,
  };
};

const createRandomSource = (samples: number[]): (() => number) => {
  const remainingSamples = [...samples];

  return () => {
    const sample = remainingSamples.shift();
    assert.notEqual(sample, undefined, "random source was called more often than expected");
    return sample as number;
  };
};

test("career introduction topics exhaustively cover the public CV content sections", async () => {
  const cv = await readCv();
  const groups = createCareerIntroductionTopicGroups(cv);

  assert.deepEqual(
    groups.map(([topic]) => topic?.kind),
    ["profile", "skill", "engagement", "highlight", "activity", "statement"],
  );
  assert.deepEqual(
    groups.at(-1)?.map(({ key }) => key),
    ["statement:0", "statement:1", "statement:2"],
  );

  const kinds = [0, 1, 2, 3, 4, 5].map(
    (groupIndex) =>
      selectRandomCareerIntroductionTopic(cv, () =>
        groupIndex === 0 ? 0 : groupIndex / 6 + Number.EPSILON,
      ).kind,
  );

  assert.deepEqual(kinds, ["profile", "skill", "engagement", "highlight", "activity", "statement"]);

  const profile = selectRandomCareerIntroductionTopic(cv, () => 0);
  const nextTopic = selectRandomCareerIntroductionTopic(cv, () => 0, profile.key);

  assert.equal(profile.kind, "profile");
  assert.equal(nextTopic.kind, "skill");

  const firstStatement = groups.at(-1)?.[0];
  assert.notEqual(firstStatement, undefined);
  const statementPrompt = createCareerIntroductionPrompt(firstStatement!, englishVisitorContext, 0);

  assert.match(statementPrompt, /I became interested in web standards/);
  assert.doesNotMatch(statementPrompt, /I have contributed where I could/);
  assert.doesNotMatch(statementPrompt, /Today I focus on systems/);
});

test("the repeat delay has a six-second center and less than one second of jitter", () => {
  assert.equal(
    createRandomizedCareerIntroductionDelayMs(() => 0),
    5_001,
  );
  assert.equal(
    createRandomizedCareerIntroductionDelayMs(() => 0.5),
    6_000,
  );
  assert.equal(
    createRandomizedCareerIntroductionDelayMs(() => 1 - Number.EPSILON),
    6_999,
  );
  assert.equal(careerIntroductionRepeatDelayMs, 6_000);
  assert.equal(careerIntroductionRepeatJitterMs, 999);
});

test("visitor context uses the user agent's single preferred language deterministically", () => {
  assert.deepEqual(createCareerIntroductionVisitorContext("ja-JP", 12.5), {
    preferredLanguage: "ja-JP",
    preferredLanguageName: "Japanese (Japan)",
    visitStartedAtMs: 12.5,
  });
  assert.deepEqual(createCareerIntroductionVisitorContext("", 0), {
    preferredLanguage: "en",
    preferredLanguageName: "English",
    visitStartedAtMs: 0,
  });
  assert.deepEqual(createCareerIntroductionVisitorContext("not_a_language", 0), {
    preferredLanguage: "en",
    preferredLanguageName: "English",
    visitStartedAtMs: 0,
  });
  assert.throws(
    () => createCareerIntroductionVisitorContext("ja-JP", Number.NaN),
    /finite non-negative/,
  );
});

test("visit duration uses at most two human-friendly units", () => {
  assert.equal(formatCareerIntroductionVisitDuration(999), "0 seconds");
  assert.equal(formatCareerIntroductionVisitDuration(1_000), "1 second");
  assert.equal(formatCareerIntroductionVisitDuration(59_999), "59 seconds");
  assert.equal(formatCareerIntroductionVisitDuration(60_000), "1 minute");
  assert.equal(formatCareerIntroductionVisitDuration(65_000), "1 minute 5 seconds");
  assert.equal(formatCareerIntroductionVisitDuration(3_900_000), "1 hour 5 minutes");
  assert.equal(formatCareerIntroductionVisitDuration(93_600_000), "1 day 2 hours");
  assert.throws(() => formatCareerIntroductionVisitDuration(Number.NaN), /finite non-negative/);
});

test("completion validation accepts supported sentence endings and rejects truncation", () => {
  assert.equal(isCompleteCareerIntroduction("A complete sentence."), true);
  assert.equal(isCompleteCareerIntroduction("完全な文です。"), true);
  assert.equal(
    isCompleteCareerIntroduction("A complete sentence.\n\nAnother complete sentence!"),
    true,
  );
  assert.equal(isCompleteCareerIntroduction("A quoted sentence.”"), true);
  assert.equal(isCompleteCareerIntroduction("一貫性と"), false);
  assert.equal(isCompleteCareerIntroduction(""), false);
});

test("internal slugs become general noun phrases and never enter the model prompt", async () => {
  const cv = await readCv();
  const topic = createCareerIntroductionTopicGroups(cv)
    .flat()
    .find(
      (candidate) =>
        candidate.kind === "engagement" &&
        candidate.organization.id === "travel-booking-product-company",
    );

  assert.equal(
    createGeneralNounPhraseFromSlug("travel-booking-product-company"),
    "a travel booking product company",
  );
  assert.equal(
    createGeneralNounPhraseFromSlug("enterprise-systems-integrator"),
    "an enterprise systems integrator",
  );
  assert.throws(() => createGeneralNounPhraseFromSlug("Not a slug"), /Slug must contain/);
  assert.notEqual(topic, undefined);

  const prompt = createCareerIntroductionPrompt(topic!, englishVisitorContext, 0);

  assert.match(prompt, /"generalNounPhrase":"a travel booking product company"/);
  assert.match(
    prompt,
    /"profile":"Product company developing consumer travel and restaurant booking services in-house"/,
  );
  assert.doesNotMatch(prompt, /travel-booking-product-company/);
  assert.doesNotMatch(prompt, /"(?:id|organization_id|engagement_id)":/);
});

test("the prompt exposes continuously increasing visit duration without tone categories", async () => {
  const cv = await readCv();
  const topic = selectRandomCareerIntroductionTopic(cv, () => 0);
  const japaneseVisitor = createCareerIntroductionVisitorContext("ja-JP", 5_000);
  const earlierPrompt = createCareerIntroductionPrompt(topic, japaneseVisitor, 64_999);
  const laterPrompt = createCareerIntroductionPrompt(topic, japaneseVisitor, 65_000);

  assert.match(
    earlierPrompt,
    /^MANDATORY OUTPUT LANGUAGE: Japanese \(Japan\)\. Write the entire response exclusively in this language\./,
  );
  assert.match(earlierPrompt, /"visitDuration":"59 seconds"/);
  assert.match(laterPrompt, /"visitDuration":"1 minute"/);
  assert.notEqual(earlierPrompt, laterPrompt);
  assert.match(laterPrompt, /Scale the tone continuously with visitDuration, without thresholds/);
  assert.doesNotMatch(laterPrompt, /elapsedSeconds/);
  assert.match(laterPrompt, /progressively add gratitude/);
  assert.match(laterPrompt, /longer visits must be warmer than shorter ones/);
  assert.doesNotMatch(laterPrompt, /preferredResponseLanguageCode|preferredResponseLanguageName/);
  assert.doesNotMatch(laterPrompt, /"responseLanguage"/);
  assert.doesNotMatch(laterPrompt, /visitCategory/);
  assert.match(
    laterPrompt,
    /Before returning, verify that both sentences are complete, end with sentence-ending punctuation, and are written exclusively in Japanese \(Japan\)\./,
  );
});

test("career introduction loops through non-repeating random CV topics after a randomized wait", async () => {
  const cv = await readCv();
  const doubles = [
    createConversationDouble([" \n", "My public ", "profile."]),
    createConversationDouble(["My HTML ", "experience."]),
  ];
  let configuration: ConversationConfig | undefined;
  let createCount = 0;
  const observedWaitingTopics: string[] = [];
  const delays: number[] = [];
  const engine = {
    async createConversation(candidate?: ConversationConfig) {
      configuration = candidate;
      const double = doubles[createCount];
      createCount += 1;
      assert.notEqual(double, undefined);
      return double!.conversation;
    },
  } as Pick<Engine, "createConversation">;
  const controller = new CareerIntroductionController(engine, cv, englishVisitorContext, {
    now: createRandomSource([15_000, 15_000, 75_000]),
    random: createRandomSource([0, 0, 0.5, 0, 0]),
    wait: async (durationMs) => {
      delays.push(durationMs);
    },
  });

  controller.subscribe((state) => {
    if (state.status === "waiting") {
      observedWaitingTopics.push(state.topic);

      if (observedWaitingTopics.length === 2) {
        controller.cancel();
      }
    }
  });
  const firstRun = controller.start();
  const secondRun = controller.start();
  const [firstResult, secondResult] = await Promise.all([firstRun, secondRun]);

  assert.deepEqual(firstResult, { status: "cancelled" });
  assert.equal(firstResult, secondResult);
  assert.equal(firstRun, secondRun);
  assert.equal(createCount, 2);
  assert.deepEqual(observedWaitingTopics, ["profile", "skill"]);
  assert.deepEqual(delays, [careerIntroductionRepeatDelayMs]);
  assert.equal(careerIntroductionMaxOutputTokens, 128);
  assert.equal(configuration?.sessionConfig?.maxOutputTokens, careerIntroductionMaxOutputTokens);
  assert.match(
    doubles[0].getPrompt() ?? "",
    /exactly one concise and complete sentence per paragraph/,
  );
  assert.match(
    doubles[0].getPrompt() ?? "",
    /Do not summarize, enumerate, or mention every supplied field/,
  );
  assert.match(doubles[0].getPrompt() ?? "", /no more than two supporting facts/);
  assert.match(doubles[0].getPrompt() ?? "", /omit every unused detail/);
  assert.match(
    doubles[0].getPrompt() ?? "",
    /never begin a point that cannot be completed within the output limit/,
  );
  assert.equal(configuration?.sessionConfig?.samplerParams?.type, 3);
  assert.match(
    String(configuration?.preface?.messages?.[0]?.content),
    /Obey the MANDATORY OUTPUT LANGUAGE/,
  );
  assert.match(
    String(configuration?.preface?.messages?.[0]?.content),
    /never default to English merely because the instructions or CV source are written in English/,
  );
  assert.match(
    String(configuration?.preface?.messages?.[0]?.content),
    /omit source details instead of truncating a thought/,
  );
  assert.match(doubles[0].getPrompt() ?? "", /Web Frontend Architect \/ Designer/);
  assert.match(doubles[0].getPrompt() ?? "", /"visitDuration":"15 seconds"/);
  assert.match(doubles[1].getPrompt() ?? "", /Semantic and SEO-aware implementation/);
  assert.match(doubles[1].getPrompt() ?? "", /"visitDuration":"1 minute 15 seconds"/);
  assert.equal(doubles[0].getDeleteCount(), 1);
  assert.equal(doubles[1].getDeleteCount(), 1);
});

test("career introduction waits for visibility before the initial generation", async () => {
  const cv = await readCv();
  const double = createConversationDouble(["Completed introduction."]);
  let createCount = 0;
  const engine = {
    createConversation: async () => {
      createCount += 1;
      return double.conversation;
    },
  } as Pick<Engine, "createConversation">;
  const controller = new CareerIntroductionController(engine, cv, englishVisitorContext, {
    now: () => 0,
    random: createRandomSource([0, 0, 0.5]),
  });

  controller.pause();
  const run = controller.start();
  await Promise.resolve();

  assert.deepEqual(controller.state, {
    phase: "before-generation",
    status: "paused",
    text: "",
  });
  assert.equal(createCount, 0);

  controller.subscribe((state) => {
    if (state.status === "waiting") {
      controller.cancel();
    }
  });
  controller.resume();

  assert.deepEqual(await run, { status: "cancelled" });
  assert.equal(createCount, 1);
  assert.equal(double.getCancelCount(), 0);
  assert.equal(double.getDeleteCount(), 1);
});

test("hiding during generation preserves the result and pauses before the repeat timer", async () => {
  const cv = await readCv();
  const double = createConversationDouble(["First chunk", " completes the introduction."]);
  const engine = {
    createConversation: async () => double.conversation,
  } as Pick<Engine, "createConversation">;
  const controller = new CareerIntroductionController(engine, cv, englishVisitorContext, {
    now: () => 0,
    random: createRandomSource([0, 0, 0.5]),
  });
  let observedPausedState: CareerIntroductionState | undefined;

  controller.subscribe((state) => {
    if (state.status === "generating" && state.text === "First chunk") {
      controller.pause();
    }

    if (state.status === "paused" && state.phase === "waiting") {
      observedPausedState = state;
      controller.resume();
    }

    if (state.status === "waiting") {
      controller.cancel();
    }
  });

  assert.deepEqual(await controller.start(), { status: "cancelled" });
  assert.deepEqual(observedPausedState, {
    phase: "waiting",
    remainingDelayMs: careerIntroductionRepeatDelayMs,
    status: "paused",
    text: "First chunk completes the introduction.",
    topic: "profile",
  });
  assert.equal(double.getCancelCount(), 0);
  assert.equal(double.getDeleteCount(), 1);
});

test("a paused repeat timer resumes from its remaining duration", async () => {
  const cv = await readCv();
  const double = createConversationDouble(["Completed introduction."]);
  const delays: number[] = [];
  let notifyFirstWaitStarted: (() => void) | undefined;
  const firstWaitStarted = new Promise<void>((resolve) => {
    notifyFirstWaitStarted = resolve;
  });
  const engine = {
    createConversation: async () => double.conversation,
  } as Pick<Engine, "createConversation">;
  const controller = new CareerIntroductionController(engine, cv, englishVisitorContext, {
    now: createRandomSource([0, 1_000, 2_500, 2_500]),
    random: createRandomSource([0, 0, 0]),
    repeatJitterMs: 0,
    wait: (durationMs, signal) => {
      delays.push(durationMs);

      return new Promise<void>((resolve) => {
        signal.addEventListener("abort", () => resolve(), { once: true });

        if (delays.length === 1) {
          notifyFirstWaitStarted?.();
        } else {
          queueMicrotask(() => controller.cancel());
        }
      });
    },
  });
  let notifyPaused: (() => void) | undefined;
  const paused = new Promise<void>((resolve) => {
    notifyPaused = resolve;
  });

  controller.subscribe((state) => {
    if (state.status === "paused" && state.phase === "waiting") {
      assert.equal(state.remainingDelayMs, 4_500);
      notifyPaused?.();
    }
  });

  const run = controller.start();
  await firstWaitStarted;
  controller.pause();
  await paused;
  controller.resume();

  assert.deepEqual(await run, { status: "cancelled" });
  assert.deepEqual(delays, [careerIntroductionRepeatDelayMs, 4_500]);
  assert.equal(double.getCancelCount(), 0);
  assert.equal(double.getDeleteCount(), 1);
});

test("an incomplete response retries once with a smaller deterministic content budget", async () => {
  const cv = await readCv();
  const doubles = [
    createConversationDouble(["This response ends mid-thought"]),
    createConversationDouble(["This response is complete."]),
  ];
  let createCount = 0;
  let completedText: string | undefined;
  const engine = {
    createConversation: async () => {
      const double = doubles[createCount];
      createCount += 1;
      assert.notEqual(double, undefined);
      return double!.conversation;
    },
  } as Pick<Engine, "createConversation">;
  const controller = new CareerIntroductionController(engine, cv, englishVisitorContext, {
    now: () => 0,
    random: createRandomSource([0, 0]),
  });

  controller.subscribe((state) => {
    if (state.status === "waiting") {
      completedText = state.text;
      controller.cancel();
    }
  });

  assert.deepEqual(await controller.start(), { status: "cancelled" });
  assert.equal(careerIntroductionMaxGenerationAttempts, 2);
  assert.equal(createCount, careerIntroductionMaxGenerationAttempts);
  assert.equal(completedText, "This response is complete.");
  assert.doesNotMatch(doubles[0].getPrompt() ?? "", /RECOVERY OUTPUT/);
  assert.match(doubles[1].getPrompt() ?? "", /RECOVERY OUTPUT/);
  assert.match(doubles[1].getPrompt() ?? "", /exactly one supporting fact/);
  assert.equal(doubles[0].getDeleteCount(), 1);
  assert.equal(doubles[1].getDeleteCount(), 1);
});

test("repeated incomplete responses fail after the finite retry limit", async () => {
  const cv = await readCv();
  const doubles = Array.from({ length: careerIntroductionMaxGenerationAttempts }, () =>
    createConversationDouble(["Still incomplete"]),
  );
  let createCount = 0;
  const engine = {
    createConversation: async () => {
      const double = doubles[createCount];
      createCount += 1;
      assert.notEqual(double, undefined);
      return double!.conversation;
    },
  } as Pick<Engine, "createConversation">;
  const controller = new CareerIntroductionController(engine, cv, englishVisitorContext, {
    now: () => 0,
    random: createRandomSource([0, 0]),
  });
  const result = await controller.start();

  assert.equal(result.status, "failed");
  assert.match(result.status === "failed" ? result.error.message : "", /incomplete.*2 attempts/);
  assert.equal(createCount, careerIntroductionMaxGenerationAttempts);
  assert.ok(doubles.every((double) => double.getDeleteCount() === 1));
});

test("empty model output fails explicitly and keeps cleanup deterministic", async () => {
  const cv = await readCv();
  const double = createConversationDouble([]);
  const engine = {
    createConversation: async () => double.conversation,
  } as Pick<Engine, "createConversation">;
  const controller = new CareerIntroductionController(engine, cv, englishVisitorContext, {
    now: () => 0,
    random: createRandomSource([0, 0]),
  });
  const result = await controller.start();

  assert.equal(result.status, "failed");
  assert.match(result.status === "failed" ? result.error.message : "", /empty career introduction/);
  assert.equal(double.getDeleteCount(), 1);
});

test("career introduction generation can be cancelled after a streamed chunk", async () => {
  const cv = await readCv();
  const double = createConversationDouble(["First chunk", "Second chunk"]);
  const engine = {
    createConversation: async () => double.conversation,
  } as Pick<Engine, "createConversation">;
  const controller = new CareerIntroductionController(engine, cv, englishVisitorContext, {
    now: () => 0,
    random: createRandomSource([0, 0]),
  });

  controller.subscribe((state) => {
    if (state.status === "generating" && state.text === "First chunk") {
      controller.cancel();
    }
  });

  assert.deepEqual(await controller.start(), { status: "cancelled" });
  assert.equal(double.getCancelCount(), 1);
  assert.equal(double.getDeleteCount(), 1);
});

test("the randomized wait is abortable without leaving a live timer", async () => {
  const cv = await readCv();
  const double = createConversationDouble(["Completed introduction."]);
  const engine = {
    createConversation: async () => double.conversation,
  } as Pick<Engine, "createConversation">;
  const controller = new CareerIntroductionController(engine, cv, englishVisitorContext, {
    now: () => 0,
    random: createRandomSource([0, 0, 0.5]),
  });

  controller.subscribe((state) => {
    if (state.status === "waiting") {
      queueMicrotask(() => controller.cancel());
    }
  });

  assert.deepEqual(await controller.start(), { status: "cancelled" });
  assert.equal(double.getCancelCount(), 0);
  assert.equal(double.getDeleteCount(), 1);
});

test("the home fallback is server-rendered before streamed generation begins", async () => {
  const [helloSource, renderedHome] = await Promise.all([
    readFile(new URL("src/components/hello.ts", projectRoot), "utf8"),
    renderHome(),
  ]);

  assert.match(renderedHome, /aria-busy="false"/);
  assert.match(renderedHome, /aria-live="polite"/);
  assert.match(renderedHome, /Currently working as a senior web frontend developer in Tokyo/);
  assert.doesNotMatch(renderedHome, /class="career-introduction"/);
  assert.match(helloSource, /class="career-introduction" dir="auto" lang="\$\{lang\}"/);
  assert.match(
    helloSource,
    /aria-live="polite"\s+class="visually-hidden"\s+dir="auto"\s+lang="\$\{lang \?\? nothing\}"/,
  );
  assert.doesNotMatch(helloSource, /Career introduction updated/);
});
