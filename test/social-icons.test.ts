import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { faGithub, faLinkedin } from "@fortawesome/free-brands-svg-icons";

import { renderHome } from "../src/server/renderers/home.js";

const projectRoot = new URL("../", import.meta.url);

test("social icons are bundled, version-pinned, and accessible", async () => {
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

test("the social-link disclosure exposes its initial state to assistive technology", async () => {
  const renderedHome = await renderHome();

  assert.match(renderedHome, /<button\b[^>]*aria-controls="social-links"/);
  assert.match(renderedHome, /<button\b[^>]*aria-expanded="false"/);
  assert.match(renderedHome, /<button\b[^>]*aria-label="Show social links"/);
  assert.match(renderedHome, /<div\b[^>]*aria-hidden="true"[^>]*id="social-links"/);
  assert.match(renderedHome, /<x-balloon\b[^>]*aria-hidden="true"/);
});
