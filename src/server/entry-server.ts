import routes from "../config/routes.json" with { type: "json" };

import { renderHome } from "./renderers/home.js";

const ssrOutlet = "<!--lit-ssr-outlet-->";

const renderers = {
  home: renderHome,
} as const;

type RendererId = keyof typeof renderers;

const isRendererId = (value: string): value is RendererId => value in renderers;

export const renderDocument = async (documentHtml: string, rendererId: string): Promise<string> => {
  const outletCount = documentHtml.split(ssrOutlet).length - 1;

  if (outletCount !== 1) {
    throw new Error(`Expected exactly one ${ssrOutlet}, but found ${outletCount}.`);
  }

  if (!isRendererId(rendererId)) {
    throw new Error(`Unknown Lit SSR renderer: ${rendererId}`);
  }

  return documentHtml.replace(ssrOutlet, await renderers[rendererId]());
};

export { routes };
