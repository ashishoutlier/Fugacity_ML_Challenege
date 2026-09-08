# Reactor Yield website

The website presents the project and includes an interactive version of the physical solver. It uses illustrative coefficients so visitors can explore the reaction without the challenge dataset. It does not load a trained model or apply the ExtraTrees correction.

## Run locally

Use Node.js 24 or later.

```bash
npm ci
npm run dev
```

Open the local URL printed by the development server.

## Checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

The numerical checks compare the solver with an analytical solution and verify its boundary behavior. They do not measure challenge accuracy. Linting covers the authored code; the generated component library is excluded.

## Design

Archivo sets the headings and interface labels. IBM Plex Serif carries the longer explanatory passages. A cool paper background, blue ink, and copper controls keep the focus on the reaction and its yield curve. Fonts are bundled with the site.

## Source map

* `app/page.tsx` contains the project story and explorer.
* `app/globals.css` defines the visual system and responsive layouts.
* `lib/reactor.ts` follows the Python exponential midpoint solver with the same illustrative coefficients used by the public demo.
* `lib/reactor.test.ts` checks the numerical behavior.

The Sites project is recorded in `.openai/hosting.json`. Production deployment uses a validated build of this directory.
