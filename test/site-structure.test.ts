import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

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

test("the route manifest exhaustively describes the HTML page tree", async () => {
  const routes = await readRoutes();
  const pageFiles = (await collectFiles(pagesRoot)).sort();
  const manifestFiles = Object.values(routes)
    .map((route) => route.html)
    .sort();

  assert.deepEqual(pageFiles, manifestFiles);
  assert.ok(pageFiles.every((path) => path === "index.html" || path.endsWith("/index.html")));
});

test("route URLs, output paths, and SSR outlets are deterministic", async () => {
  const routes = await readRoutes();

  for (const [routeId, route] of Object.entries(routes)) {
    const expectedHtml = route.url === "/" ? "index.html" : `${route.url.slice(1)}index.html`;
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
