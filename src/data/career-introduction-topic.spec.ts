import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { describe, it } from "vitest";
import { parse } from "yaml";

import {
  createCareerIntroductionPrompt,
  createCareerIntroductionVisitorContext,
} from "../features/litert-lm/career-introduction.js";
import {
  createCareerIntroductionTopicGroups,
  selectRandomCareerIntroductionTopic,
} from "./career-introduction-topic.js";
import type { CvData } from "./cv.js";

const projectRoot = new URL("../../", import.meta.url);

const readCv = async (): Promise<CvData> =>
  parse(await readFile(new URL("src/data/cv.yaml", projectRoot), "utf8")) as CvData;

const englishVisitorContext = createCareerIntroductionVisitorContext("en-US", 0);

describe("career introduction topics", () => {
  it("exhaustively covers the public CV content sections", async () => {
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

    assert.deepEqual(kinds, [
      "profile",
      "skill",
      "engagement",
      "highlight",
      "activity",
      "statement",
    ]);

    const profile = selectRandomCareerIntroductionTopic(cv, () => 0);
    const nextTopic = selectRandomCareerIntroductionTopic(cv, () => 0, profile.key);

    assert.equal(profile.kind, "profile");
    assert.equal(nextTopic.kind, "skill");

    const firstStatement = groups.at(-1)?.[0];
    assert.notEqual(firstStatement, undefined);
    const statementPrompt = createCareerIntroductionPrompt(
      firstStatement!,
      englishVisitorContext,
      0,
    );

    assert.match(statementPrompt, /I became interested in web standards/);
    assert.doesNotMatch(statementPrompt, /I have contributed where I could/);
    assert.doesNotMatch(statementPrompt, /Today I focus on systems/);
  });
});
