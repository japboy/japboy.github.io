import { html, render } from "@lit-labs/ssr";
import { collectResult } from "@lit-labs/ssr/lib/render-result.js";

import "../../components/hello.js";

export const renderHome = (): Promise<string> => collectResult(render(html` <x-hello></x-hello> `));
