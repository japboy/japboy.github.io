import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";

import { describe, it } from "vitest";

interface RouteDefinition {
  html: string;
  render: string | null;
  url: string;
}

const projectRoot = new URL("../", import.meta.url);
const pagesRoot = new URL("src/pages/", projectRoot);
const routeManifestUrl = new URL("src/config/routes.json", projectRoot);
const ssrOutlet = "<!--lit-ssr-outlet-->";

const collectFiles = async (directoryUrl: URL, relativeDirectory = ""): Promise<string[]> => {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = `${relativeDirectory}${entry.name}`;

    if (entry.isDirectory()) {
      files.push(
        ...(await collectFiles(new URL(`${entry.name}/`, directoryUrl), `${relativePath}/`)),
      );
    } else {
      files.push(relativePath);
    }
  }

  return files;
};

const readRoutes = async (): Promise<Record<string, RouteDefinition>> =>
  JSON.parse(await readFile(routeManifestUrl, "utf8")) as Record<string, RouteDefinition>;

describe("site structure contract", () => {
  it("requires the route manifest to exhaustively describe the HTML page tree", async () => {
    const routes = await readRoutes();
    const pageFiles = (await collectFiles(pagesRoot)).toSorted();
    const manifestFiles = Object.values(routes)
      .map((route) => route.html)
      .toSorted();

    assert.deepEqual(pageFiles, manifestFiles);
    assert.ok(pageFiles.every((path) => path.endsWith(".html")));
  });

  it("keeps route URLs, output paths, and SSR outlets deterministic", async () => {
    const routes = await readRoutes();

    for (const [routeId, route] of Object.entries(routes)) {
      const expectedHtml = route.url === "/" ? "index.html" : `${route.url.slice(1)}/index.html`;
      assert.equal(route.html, expectedHtml, `route ${routeId} must mirror its public URL`);

      const documentHtml = await readFile(new URL(route.html, pagesRoot), "utf8");
      const outletCount = documentHtml.split(ssrOutlet).length - 1;
      assert.equal(
        outletCount,
        route.render === null ? 0 : 1,
        `route ${routeId} has invalid outlets`,
      );
    }
  });

  it("gives architecture and user documentation explicit recursive boundaries", async () => {
    const [architecture, featureArchitecture, readme] = await Promise.all([
      readFile(new URL("ARCHITECTURE.md", projectRoot), "utf8"),
      readFile(new URL("src/features/litert-lm/ARCHITECTURE.md", projectRoot), "utf8"),
      readFile(new URL("README.md", projectRoot), "utf8"),
    ]);
    const requiredArchitectureSections = [
      "## 1. Project Structure",
      "## 2. High-Level System Diagram",
      "## 3. Core Components",
      "## 4. Data Stores",
      "## 5. External Integrations / APIs",
      "## 6. Deployment & Infrastructure",
      "## 7. Security Considerations",
      "## 8. Development & Testing Environment",
      "## 9. Future Considerations / Roadmap",
      "## 10. Project Identification",
      "## 11. Glossary / Acronyms",
    ];

    await assert.rejects(access(new URL("docs/", projectRoot)), { code: "ENOENT" });

    for (const section of requiredArchitectureSections) {
      const sectionPattern = new RegExp(`^${section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m");

      assert.match(architecture, sectionPattern);
      assert.match(featureArchitecture, sectionPattern);
    }

    assert.match(
      architecture,
      /\[feature architecture\]\(src\/features\/litert-lm\/ARCHITECTURE\.md\)/,
    );
    assert.doesNotMatch(architecture, /2,008,432,640|Permitted next state/);
    assert.match(featureArchitecture, /2,008,432,640/);
    assert.match(featureArchitecture, /Permitted next state/);

    assert.match(readme, /^## Requirements$/m);
    assert.match(readme, /^## Local development$/m);
    assert.match(readme, /^## Verification$/m);
    assert.match(readme, /^## Production site$/m);
    assert.doesNotMatch(readme, /ARCHITECTURE|architecture|docs\//i);
  });
});
