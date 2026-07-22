import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createServer, isRunnableDevEnvironment, normalizePath } from "vite";

interface RouteDefinition {
  html: string;
  render: string | null;
  url: string;
}

interface ServerEntry {
  renderDocument(documentHtml: string, rendererId: string): Promise<string>;
  routes: Record<string, RouteDefinition>;
}

const projectRoot = new URL("../", import.meta.url);
const outputRoot = new URL("dist/", projectRoot);
const serverEntryPath = fileURLToPath(new URL("src/server/entry-server.ts", projectRoot));
const serverEntryId = `/@fs/${normalizePath(serverEntryPath)}`;

const viteServer = await createServer({
  appType: "custom",
  mode: "production",
  server: { middlewareMode: true },
});

try {
  const serverEnvironment = viteServer.environments.ssr;

  if (!isRunnableDevEnvironment(serverEnvironment)) {
    throw new TypeError("The Vite SSR environment is not runnable.");
  }

  const { renderDocument, routes } = (await serverEnvironment.runner.import(
    serverEntryId,
  )) as unknown as ServerEntry;

  for (const [routeId, route] of Object.entries(routes)) {
    if (route.html.startsWith("/") || route.html.split("/").includes("..")) {
      throw new Error(`Route ${routeId} has an invalid HTML path: ${route.html}`);
    }

    if (route.render === null) {
      continue;
    }

    const outputUrl = new URL(route.html, outputRoot);

    if (!outputUrl.href.startsWith(outputRoot.href)) {
      throw new Error(`Route ${routeId} resolves outside dist: ${route.html}`);
    }

    const documentHtml = await readFile(outputUrl, "utf8");
    const renderedDocument = await renderDocument(documentHtml, route.render);

    if (!renderedDocument.includes('shadowrootmode="open"')) {
      throw new Error(`Route ${routeId} did not produce Declarative Shadow DOM.`);
    }

    if (
      renderedDocument.includes("<!--lit-ssr-outlet-->") ||
      renderedDocument.includes("/@source/")
    ) {
      throw new Error(`Route ${routeId} contains an unresolved build marker or source URL.`);
    }

    await writeFile(outputUrl, renderedDocument, "utf8");
  }
} finally {
  await viteServer.close();
}
