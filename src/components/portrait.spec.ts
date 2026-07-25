import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { faGithub, faLinkedin } from "@fortawesome/free-brands-svg-icons";
import { describe, it } from "vitest";

import { renderHome } from "../server/renderers/home.js";

const projectRoot = new URL("../../", import.meta.url);

describe("<x-portrait>", () => {
  it("bundles version-pinned accessible social icons", async () => {
    const [documentHtml, packageJson, portraitSource] = await Promise.all([
      readFile(new URL("src/pages/index.html", projectRoot), "utf8"),
      readFile(new URL("package.json", projectRoot), "utf8").then(
        (contents) =>
          JSON.parse(contents) as {
            dependencies: Record<string, string>;
          },
      ),
      readFile(new URL("src/components/portrait.ts", projectRoot), "utf8"),
    ]);

    assert.equal(packageJson.dependencies["@fortawesome/free-brands-svg-icons"], "7.3.1");
    assert.equal(faLinkedin.iconName, "linkedin");
    assert.equal(faGithub.iconName, "github");
    assert.doesNotMatch(documentHtml, /kit\.fontawesome\.com|font-awesome.*\.css/i);
    assert.doesNotMatch(portraitSource, /kit\.fontawesome\.com|font-awesome.*\.css/i);
    assert.match(portraitSource, /<svg\b[^>]*aria-hidden="true"/);
    assert.match(portraitSource, /<a\b[^>]*aria-label="LinkedIn"/);
    assert.match(portraitSource, /<a\b[^>]*aria-label="GitHub"/);
    assert.match(portraitSource, /renderBrandIcon\(faLinkedin\)/);
    assert.match(portraitSource, /renderBrandIcon\(faGithub\)/);
  });

  it("exposes the social-link disclosure's initial state to assistive technology", async () => {
    const renderedHome = await renderHome();

    assert.match(renderedHome, /<button\b[^>]*aria-controls="social-links"/);
    assert.match(renderedHome, /<button\b[^>]*aria-expanded="false"/);
    assert.match(renderedHome, /<button\b[^>]*aria-label="Show social links"/);
    assert.match(renderedHome, /<div\b[^>]*aria-hidden="true"[^>]*id="social-links"/);
    assert.match(renderedHome, /<x-balloon\b[^>]*aria-hidden="true"/);
  });

  it("exposes a non-interactive loading effect driven by LiteRT-LM state", async () => {
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
});
