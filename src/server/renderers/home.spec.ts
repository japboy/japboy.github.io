import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { describe, it } from "vitest";

import { renderHome } from "./home.js";

const projectRoot = new URL("../../../", import.meta.url);

describe("renderHome", () => {
  it("server-renders the fallback before streamed generation begins", async () => {
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
});
