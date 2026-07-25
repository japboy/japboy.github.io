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
    assert.match(helloSource, /aria-busy="\$\{this\.modelLoading\}"/);
    assert.doesNotMatch(helloSource, /model-loading=/);
    assert.match(portraitSource, /\.portrait-trigger::before/);
    assert.match(portraitSource, /\.portrait-trigger::after/);
    assert.match(portraitSource, /:host\(\[aria-busy="true"\]\)/);
    assert.doesNotMatch(portraitSource, /data-model-loading/);
    assert.match(portraitSource, /conic-gradient\(/);
    assert.match(portraitSource, /pointer-events: none/);
    assert.doesNotMatch(portraitSource, /@supports \(filter: blur\(1px\)\)/);
    assert.match(portraitSource, /model-loading-wave-soft-shape/);
    assert.match(portraitSource, /model-loading-wave-soft-rotation/);
    assert.match(portraitSource, /model-loading-wave-soft-envelope/);
    assert.match(portraitSource, /model-loading-wave-detail-shape/);
    assert.match(portraitSource, /model-loading-wave-detail-envelope/);
    assert.match(
      portraitSource,
      /model-loading-wave-soft-shape 4\.7s ease-in-out infinite,\s+model-loading-wave-soft-rotation 8\.3s linear infinite,\s+model-loading-wave-soft-envelope 13\.7s ease-in-out infinite/,
    );
    assert.match(
      portraitSource,
      /model-loading-wave-detail-shape 2\.9s ease-in-out infinite,\s+model-loading-wave-detail-envelope 13\.7s ease-in-out infinite/,
    );
    assert.match(portraitSource, /filter: blur\(0\.225rem\)/);
    assert.match(portraitSource, /inset: -0\.375rem/);
    assert.match(portraitSource, /filter: blur\(0\.11rem\)/);
    assert.match(portraitSource, /inset: -0\.275rem/);
    assert.match(portraitSource, /scale: 0\.92/);
    assert.match(portraitSource, /scale: 1\.1/);
    assert.match(portraitSource, /scale: 1\.03/);
    assert.match(portraitSource, /scale: 1\.06/);
    assert.match(portraitSource, /scale: 1\.09/);
    assert.match(appStyles, /--duration-model-loading-fade: 600ms/);
    assert.match(
      portraitSource,
      /opacity var\(--duration-model-loading-fade\) var\(--easing-interaction\)/,
    );
    assert.match(portraitSource, /@media \(prefers-reduced-motion: no-preference\)/);
    assert.match(renderedHome, /<x-portrait\b[^>]*aria-busy="false"/);
  });

  it("uses a static baseline and progressively enhances non-essential motion", async () => {
    const [helloSource, portraitSource] = await Promise.all([
      readFile(new URL("src/components/hello.ts", projectRoot), "utf8"),
      readFile(new URL("src/components/portrait.ts", projectRoot), "utf8"),
    ]);
    const mediaQuery = "@media (prefers-reduced-motion: no-preference)";
    const helloMediaQueryIndex = helloSource.indexOf(mediaQuery);
    const portraitMediaQueryIndex = portraitSource.indexOf(mediaQuery);

    assert.notEqual(helloMediaQueryIndex, -1);
    assert.notEqual(portraitMediaQueryIndex, -1);

    const helloStaticBaseline = helloSource.slice(0, helloMediaQueryIndex);
    const helloMotionEnhancement = helloSource.slice(helloMediaQueryIndex);
    const portraitStaticBaseline = portraitSource.slice(0, portraitMediaQueryIndex);
    const portraitMotionEnhancement = portraitSource.slice(portraitMediaQueryIndex);

    assert.doesNotMatch(helloStaticBaseline, /transition(?:-|:)/);
    assert.match(helloMotionEnhancement, /transition-property: opacity, translate/);
    assert.doesNotMatch(helloSource, /transition-property: all/);

    assert.match(
      portraitStaticBaseline,
      /\.portrait-trigger::before \{\s+border-radius: 9999px;\s+inset: -0\.25rem;/,
    );
    assert.match(portraitStaticBaseline, /\.portrait-trigger::after \{\s+display: none;/);
    assert.doesNotMatch(portraitStaticBaseline, /\banimation:/);
    assert.doesNotMatch(portraitStaticBaseline, /\btransition(?:-|:)/);
    assert.doesNotMatch(portraitStaticBaseline, /filter: blur/);
    assert.doesNotMatch(portraitSource, /prefers-reduced-motion: reduce/);

    assert.match(portraitMotionEnhancement, /animation: portrait-enter/);
    assert.match(portraitMotionEnhancement, /filter: blur\(0\.225rem\)/);
    assert.match(portraitMotionEnhancement, /filter: blur\(0\.11rem\)/);
    assert.match(portraitMotionEnhancement, /transition-property: rotate/);
    assert.match(portraitMotionEnhancement, /transition-property: opacity/);
    assert.match(portraitMotionEnhancement, /transition: color/);
  });
});
