import { resolve } from "node:path";

import browserslistToEsbuild from "browserslist-to-esbuild";
import { defineConfig, normalizePath, type Plugin } from "vite";

import routes from "./src/config/routes.json" with { type: "json" };

interface RouteDefinition {
  html: string;
  render: string | null;
  url: string;
}

const projectRoot = import.meta.dirname;
const browserTargets = browserslistToEsbuild(undefined, { path: projectRoot });
const sourceRoot = resolve(projectRoot, "src");
const pagesRoot = resolve(sourceRoot, "pages");
const serverEntryPath = resolve(sourceRoot, "server/entry-server.ts");
const serverEntryId = `/@fs/${normalizePath(serverEntryPath)}`;
const routeManifest: Record<string, RouteDefinition> = routes;

const htmlInputs = Object.fromEntries(
  Object.entries(routeManifest).map(([id, route]) => [id, resolve(pagesRoot, route.html)]),
);

const indexFileName = "index.html";

const normalizeRequestPath = (path: string): string => {
  const pathname = path.split("?", 1)[0];
  return pathname.endsWith(`/${indexFileName}`)
    ? pathname.slice(0, -indexFileName.length)
    : pathname;
};

const litSsrDev = (): Plugin => ({
  name: "lit-ssr-dev",
  apply: "serve",
  transformIndexHtml: {
    order: "post",
    async handler(html, context) {
      const route = Object.values(routeManifest).find(
        (candidate) => candidate.url === normalizeRequestPath(context.path),
      );

      if (route?.render === null || route === undefined || context.server === undefined) {
        return html;
      }

      const serverEntry = (await context.server.ssrLoadModule(serverEntryId)) as {
        renderDocument(documentHtml: string, rendererId: string): Promise<string>;
      };

      return serverEntry.renderDocument(html, route.render);
    },
  },
});

export default defineConfig({
  root: pagesRoot,
  appType: "mpa",
  publicDir: resolve(sourceRoot, "static"),
  server: {
    host: true,
  },
  resolve: {
    alias: {
      "/@source": sourceRoot,
    },
  },
  plugins: [litSsrDev()],
  build: {
    target: browserTargets,
    cssTarget: browserTargets,
    outDir: resolve(projectRoot, "dist"),
    emptyOutDir: true,
    rolldownOptions: {
      input: htmlInputs,
    },
  },
});
