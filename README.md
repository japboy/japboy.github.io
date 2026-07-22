# japboy.github.io

Portfolio site for Yu Inao, built with Lit, Web Components, Vite, and standard CSS.

Static HTML documents live under `src/pages/`, where their directory structure
mirrors their public URL. Vite builds the multi-page site into `dist/`, then the
Lit SSR step prerenders configured component islands as Declarative Shadow DOM.
Browser entries, components, server renderers, and styles live in sibling
directories under `src/`; HTML documents reference them through the Vite-only
`/@source/*` namespace. Public routes are declared exhaustively in
`src/config/routes.json`.

Directly executable build commands live under `bin/`, while verification code
lives under `test/`. `dist/` is the only generated artifact directory; the
prerender command loads the Lit server entry directly from `src/` through
Vite's SSR environment.

```sh
pnpm install
pnpm start
```

```sh
pnpm check
```

The production site is published at <https://japboy.github.io/> by the GitHub
Pages workflow on the `v2026` branch.
