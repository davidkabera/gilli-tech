# Gillytech — Architecture Docs

Astro + Starlight documentation site for Gillytech's architecture:
requirements (case study, ASR mapping, acceptance criteria, SRS),
architectural style, a LikeC4 system model, and ADR-001 through ADR-005.

Structured the same way as the Munda Mail docs site
(https://davidkabera.github.io/26-spring-01-mundamail/).

## System model (Architecture as Code)

`model/gillytech.c4` is a [LikeC4](https://likec4.dev) source file — the
System Landscape, System Context, and Container views on the
**System Model (C4)** page are generated directly from it via
`likec4/vite-plugin`, not maintained as separate images. Edit the `.c4`
file, and the rendered diagrams update on the next dev/build.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
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
  integrations: [starlight({ /* ... */ }), react()],
});
```
