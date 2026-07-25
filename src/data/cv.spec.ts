import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import Ajv2020 from "ajv/dist/2020.js";
import { describe, it } from "vitest";
import { parse } from "yaml";

import type { CvData } from "./cv.js";

const projectRoot = new URL("../../", import.meta.url);
const dataUrl = new URL("src/data/cv.yaml", projectRoot);
const schemaUrl = new URL("src/data/cv.schema.json", projectRoot);

const readCv = async (): Promise<{ cv: CvData; source: string }> => {
  const source = await readFile(dataUrl, "utf8");
  return { cv: parse(source) as CvData, source };
};

describe("public CV data", () => {
  it("satisfies its public data schema", async () => {
    const [{ cv, source }, schemaSource] = await Promise.all([
      readCv(),
      readFile(schemaUrl, "utf8"),
    ]);
    const validate = new Ajv2020({ allErrors: true, strict: true, validateFormats: false }).compile(
      JSON.parse(schemaSource),
    );

    assert.ok(source.startsWith("# yaml-language-server: $schema=./cv.schema.json\n"));
    assert.equal(validate(cv), true, JSON.stringify(validate.errors));
  });

  it("has deterministic references and reverse-chronological periods", async () => {
    const { cv } = await readCv();
    const organizationIds = new Set(cv.organizations.map(({ id }) => id));
    const engagementIds = new Set(cv.engagements.map(({ id }) => id));

    assert.equal(organizationIds.size, cv.organizations.length);
    assert.equal(engagementIds.size, cv.engagements.length);
    assert.ok(cv.engagements.every(({ organization_id }) => organizationIds.has(organization_id)));
    assert.ok(cv.highlights.every(({ engagement_id }) => engagementIds.has(engagement_id)));
    assert.ok(cv.activities.every(({ organization_id }) => organizationIds.has(organization_id)));

    const startDates = cv.engagements.map(({ period }) => period.start);
    assert.deepEqual(startDates, startDates.toSorted().toReversed());
  });

  it("publishes only anonymized organization data without identifying URLs", async () => {
    const { cv, source } = await readCv();

    assert.equal(cv.anonymization.identifiers_published, false);
    assert.ok(cv.organizations.every((organization) => !("public_label" in organization)));
    assert.doesNotMatch(source, /\b(?:Client|Company|Agency|Integrator) [A-Z]\b/);
    assert.doesNotMatch(source, /https?:\/\//);
  });

  it("is English-only", async () => {
    const { source } = await readCv();
    const JapaneseScript = /[\u3040-\u30ff\u3400-\u9fff]/u;

    assert.doesNotMatch(source, JapaneseScript);
  });
});
