# Gillytech — Architecture Docs

Astro + Starlight documentation site for Gillytech's architecture:
requirements (case study, ASR mapping, acceptance criteria, SRS),
architectural style, a LikeC4 system model, and ADR-001 through ADR-005.

Structured the same way as the Munda Mail docs site
(https://davidkabera.github.io/26-spring-01-mundamail/).

## System model (Architecture as Code)

`model/gillytech.c4` is a [LikeC4](https://likec4.dev) source file. The
System Landscape, System Context, and Container views on the
**System Model (C4)** page are pre-rendered to static PNGs via
`likec4 export png` — plain `<img>` tags, no client-side JS/React needed
to view them. Edit the `.c4` file, run `npm run diagrams`, and the images
update.

`likec4 export` renders in headless Chromium via Playwright, so it needs
a browser binary available:

```bash
npx playwright install --with-deps chromium   # one-time, per machine/CI runner
npm run diagrams                              # regenerate PNGs into public/diagrams/
```

`npm run build` runs `npm run diagrams` automatically first, so a normal
build/deploy always ships current diagrams. `npm run dev` does **not** —
regenerate manually after editing the model if you're only running the
dev server.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm install
npx playwright install --with-deps chromium
npm run build
npm run preview
```

## Deploy

Any static host works (GitHub Pages, Netlify, Vercel, Cloudflare Pages).
For GitHub Pages, set `site` and `base` in `astro.config.mjs` to match
your repo, e.g.:

```js
export default defineConfig({
  site: 'https://davidkabera.github.io',
  base: '/gili-tech',
  integrations: [starlight({ /* ... */ })],
});
```
