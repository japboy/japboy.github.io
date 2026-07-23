import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import Ajv2020 from "ajv/dist/2020.js";
import { parse } from "yaml";

import type { CvData } from "../src/data/cv.js";

const projectRoot = new URL("../", import.meta.url);
const dataUrl = new URL("src/data/cv.yaml", projectRoot);
const schemaUrl = new URL("src/data/cv.schema.json", projectRoot);

const readCv = async (): Promise<{ cv: CvData; source: string }> => {
  const source = await readFile(dataUrl, "utf8");
  return { cv: parse(source) as CvData, source };
};

test("the CV YAML satisfies its public data schema", async () => {
  const [{ cv, source }, schemaSource] = await Promise.all([readCv(), readFile(schemaUrl, "utf8")]);
  const validate = new Ajv2020({ allErrors: true, strict: true, validateFormats: false }).compile(
    JSON.parse(schemaSource),
  );

  assert.ok(source.startsWith("# yaml-language-server: $schema=./cv.schema.json\n"));
  assert.equal(validate(cv), true, JSON.stringify(validate.errors));
});

test("the CV data has deterministic references and reverse-chronological periods", async () => {
  const { cv } = await readCv();
  const organizationIds = new Set(cv.organizations.map(({ id }) => id));
  const engagementIds = new Set(cv.engagements.map(({ id }) => id));

  assert.equal(organizationIds.size, cv.organizations.length);
  assert.equal(engagementIds.size, cv.engagements.length);
  assert.ok(cv.engagements.every(({ organization_id }) => organizationIds.has(organization_id)));
  assert.ok(cv.highlights.every(({ engagement_id }) => engagementIds.has(engagement_id)));
  assert.ok(cv.activities.every(({ organization_id }) => organizationIds.has(organization_id)));

  const startDates = cv.engagements.map(({ period }) => period.start);
  assert.deepEqual(startDates, [...startDates].sort().reverse());
});

test("the public CV omits source organization, customer, product, and identifying URL names", async () => {
  const { cv, source } = await readCv();
  const identifyingNames = [
    "株式会社",
    "リコー",
    "RICOH",
    "TENTIAL",
    "Retty",
    "UPSIDER",
    "トゥーアール",
    "ファンファーレ",
    "HAIRCAMP",
    "SO Technologies",
    "一休",
    "Yahoo!トラベル",
    "ソニックジャム",
    "エムウィンソフト",
    "My KIRIN",
    "NTT ドコモ",
    "デジタルガレージ",
    "JRA",
    "日本調剤",
  ];

  assert.equal(cv.anonymization.identifiers_published, false);
  assert.ok(cv.organizations.every((organization) => !("public_label" in organization)));
  assert.doesNotMatch(source, /\b(?:Client|Company|Agency|Integrator) [A-Z]\b/);
  assert.ok(identifyingNames.every((name) => !source.includes(name)));
  assert.doesNotMatch(source, /https?:\/\//);
});

test("the public CV data is English-only", async () => {
  const { source } = await readCv();
  const JapaneseScript = /[\u3040-\u30ff\u3400-\u9fff]/u;

  assert.doesNotMatch(source, JapaneseScript);
});
