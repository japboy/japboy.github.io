import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { renderHome } from "../src/server/renderers/home.js";

const projectRoot = new URL("../", import.meta.url);

test("the portrait exposes a non-interactive loading effect driven by LiteRT-LM state", async () => {
  const [appStyles, clientEntry, helloSource, portraitSource, renderedHome] = await Promise.all([
    readFile(new URL("src/styles/app.css", projectRoot), "utf8"),
    readFile(new URL("src/entries/home.client.ts", projectRoot), "utf8"),
    readFile(new URL("src/components/hello.ts", projectRoot), "utf8"),
    readFile(new URL("src/components/portrait.ts", projectRoot), "utf8"),
    renderHome(),
  ]);

  assert.match(clientEntry, /liteRtLmController\.subscribe/);
  assert.match(clientEntry, /hello\.modelLoading = state\.status === "loading"/);
  assert.match(clientEntry, /void initializeHome\(\)/);
  assert.match(helloSource, /\?model-loading="\$\{this\.modelLoading\}"/);
  assert.match(portraitSource, /\.portrait-trigger::before/);
  assert.match(portraitSource, /\.portrait-trigger::after/);
  assert.match(portraitSource, /conic-gradient\(/);
  assert.match(portraitSource, /pointer-events: none/);
  assert.match(appStyles, /--duration-model-loading-fade: 600ms/);
  assert.match(
    portraitSource,
    /opacity var\(--duration-model-loading-fade\) var\(--easing-interaction\)/,
  );
  assert.match(portraitSource, /@media \(prefers-reduced-motion: no-preference\)/);
  assert.match(renderedHome, /data-model-loading="false"/);
});
