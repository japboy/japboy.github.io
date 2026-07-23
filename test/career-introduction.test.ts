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
  careerIntroductionRepeatDelayMs,
  careerIntroductionRepeatJitterMs,
  createRandomizedCareerIntroductionDelayMs,
} from "../src/features/litert-lm/career-introduction.js";

const projectRoot = new URL("../", import.meta.url);

const readCv = async (): Promise<CvData> =>
  parse(await readFile(new URL("src/data/cv.yaml", projectRoot), "utf8")) as CvData;

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
  const controller = new CareerIntroductionController(engine, cv, {
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
  assert.equal(configuration?.sessionConfig?.maxOutputTokens, 160);
  assert.equal(configuration?.sessionConfig?.samplerParams?.type, 3);
  assert.match(doubles[0].getPrompt() ?? "", /Web Frontend Architect \/ Designer/);
  assert.match(doubles[1].getPrompt() ?? "", /Semantic and SEO-aware implementation/);
  assert.equal(doubles[0].getDeleteCount(), 1);
  assert.equal(doubles[1].getDeleteCount(), 1);
});

test("empty model output fails explicitly and keeps cleanup deterministic", async () => {
  const cv = await readCv();
  const double = createConversationDouble([]);
  const engine = {
    createConversation: async () => double.conversation,
  } as Pick<Engine, "createConversation">;
  const controller = new CareerIntroductionController(engine, cv, {
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
  const controller = new CareerIntroductionController(engine, cv, {
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
  const controller = new CareerIntroductionController(engine, cv, {
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
  const renderedHome = await renderHome();

  assert.match(renderedHome, /aria-busy="false"/);
  assert.match(renderedHome, /aria-live="polite"/);
  assert.match(renderedHome, /Currently working as a senior web frontend developer in Tokyo/);
  assert.doesNotMatch(renderedHome, /class="career-introduction"/);
});
