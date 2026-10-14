# Deployment Guide

HomeNest Kitchen ships as a **single-file Vite SPA** (`dist/index.html`,
~506 KB / ~130 KB gzip) with zero server and zero external services — one
static artifact plus its asset folder. This guide covers the supported
production paths and the environment contract. (Customized from the
`ecommerce-store` template to align with this codebase; the template's
Next.js standalone/Prisma paths do not apply here.)

## 1. Build

```bash
npm install
npm run build          # → dist/index.html (single file; SEO artifacts regenerate first)
```

The `prebuild` hook runs `npm run seo:generate`
(`scripts/generate-sitemap.mjs`), which rewrites `public/robots.txt` and
`public/sitemap.xml` from the seed catalog before Vite bundles. Vite then
inlines all JS/CSS into `dist/index.html` (`vite-plugin-singlefile`) and
copies `public/` — product/hero imagery, `robots.txt`, `sitemap.xml` —
alongside it. Never hand-edit the SEO artifacts: `tests/sitemap.test.ts`
gates the committed files against the catalog, and the build regenerates
them anyway.

## 2. Run (serve)

There is no server process to run. Serve `dist/` from any static host:

| Context | How |
|---|---|
| Local check | `npm run preview` (vite preview, port 4173, SPA fallback) |
| Netlify / Vercel | Publish `dist/`; add an SPA rewrite (`/* → /index.html`) so deep links like `/products/{slug}` resolve |
| GitHub Pages | Publish `dist/` with a 404.html copy of `index.html` (or a 404 → root redirect) — client routing takes over from there |
| nginx / any web server | Serve `dist/` with `try_files $uri $uri/ /index.html` |

The SPA never calls a backend: cart, wishlist, orders, sessions and the
admin console live in browser `localStorage` under the versioned key
`homenest.v4`. Nothing to migrate, nothing to restart.

## 3. Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes (repo contract) | Schema-relative SQLite URL `file:../db/custom.db` — see §4. The deployed SPA never reads it; it pins the reference architecture's storage layout for tooling parity and the admin Settings surface. |
| `VITE_SITE_URL` | **Yes in production** | Absolute public origin for the SEO layer: canonical links, `og:url`, JSON-LD offer URLs, and `robots.txt`/`sitemap.xml` generation (e.g. `https://homenest.example.com`). Defaults to `http://localhost:4173` — shipping that default to a real domain would emit wrong canonicals and sitemap URLs. |
| `E2E_PORT` / `E2E_BASE_URL` | No | Playwright preview port / base URL override (test-time only). |
| `CI` | No | Tightens Playwright (forbidOnly, 2 retries, no server reuse). |

## 4. Database location (§4 — the `.env.example` reference)

`DATABASE_URL` accepts two forms:

1. **Relative `file:` URL (the default, zero-config contract).**
   ```
   DATABASE_URL="file:../db/custom.db"
   ```
   The URL is **schema-relative** — it resolves the way the Prisma CLI
   would (against a `prisma/` anchor), so this string always points at
   `<repoRoot>/db/custom.db` regardless of the working directory. The
   resolution rules live in `src/lib/db-path.ts` and are pinned by
   `tests/db-path.test.ts` — do not simplify them.

2. **Absolute `file:` URL.**
   ```
   DATABASE_URL="file:/var/lib/homenest/custom.db"
   ```
   Absolute paths pass through untouched. Point them at a persisted
   volume if a tool (Prisma CLI, an admin script) actually writes there.

`db/custom.db` is git-ignored; the repo ships `db/catalog.json` (brand
config). Every fresh clone recreates whatever the tooling needs from the
pinned contract. The storefront's runtime state stays in `localStorage`
— see §2.

### 4.1 Materializing the contract db (session 26, R26-03)

```bash
npm run db:setup     # → db/custom.db — schema + catalog + demo-user digests
npm run db:init      # schema only
npm run db:seed      # catalog seed only (needs db:init)
```

The scripts (`scripts/db-setup.mjs`) use Node's built-in `node:sqlite`
(Node ≥ 22.5) — zero dependencies, idempotent (`INSERT OR REPLACE`), and
deliberately Prisma-free per ADR-001: the deployed SPA still never reads
the file. They exist so the `DATABASE_URL` contract has a real referent
for tooling parity and so a future server workstream (PAD §6.3) starts
from a live, seeded database. The behavior is pinned by
`tests/db-scripts.test.ts` (row counts cross-checked against the catalog
import, idempotency, modes, package wiring).

One caveat: a shell-level `DATABASE_URL` overrides the repo default, so
`env -u DATABASE_URL npm run db:setup` is the safe invocation when the
file must land inside the repo root.

## 5. Deploying to a different origin (SEO sync)

The committed SEO artifacts and the static head fallbacks in `index.html`
hardcode the documented default origin. When deploying to a real domain:

```bash
export VITE_SITE_URL="https://your-domain.example"
npm run build        # prebuild regenerates robots.txt + sitemap.xml with the new origin
# deploy dist/
```

The sync is test-gated: `tests/sitemap.test.ts` re-parses the committed
artifacts against the catalog, so a catalog edit without regenerating
fails the gate. `src/lib/seo.ts` reads `VITE_SITE_URL` at build time for
per-route canonicals and JSON-LD offer URLs.

## 6. Updating

```bash
git pull
npm install
npm run build
# redeploy dist/ (it is fully self-contained; no cache to warm, no process to restart)
```

If the seed catalog changed, the release also bumped `STORAGE_KEY`
(`src/lib/storage-key.ts`, enforced by `tests/catalog-hash.test.ts`) so
returning visitors re-hydrate the new catalog instead of seeing stale
localStorage data. No action is needed on the deploy side.

## 7. Verification checklist

```bash
npm run verify && npm run e2e    # typecheck + lint + unit + build + 194 E2E runs
curl -s https://your-host/robots.txt        # private surfaces disallowed + sitemap pointer
curl -s https://your-host/sitemap.xml       # 36 URLs (12 statics + 24 products) at your origin
curl -s https://your-host/manifest.webmanifest # valid PWA manifest (R18-01) with the manifest+json MIME type
curl -s -o /dev/null -w "%{http_code}" https://your-host/products/nonexistent-slug   # 200 — SPA fallback serves index.html
```

In a browser: load the home page (hero carousel renders), open a deep
link (`/products/ceramic-mixing-bowl-set`) after a hard refresh (SPA
fallback works), add to cart and reload (cart persists via localStorage),
and check `document.title` changes per route (head contract live).

## 8. Common production issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Deep links (e.g. `/products/…`, `/track-order`) 404 on the host | Static host without SPA fallback | Add the rewrite/`try_files` rule from §2 — client routing owns every non-asset path |
| Wrong canonicals / sitemap URLs after deploying to a real domain | `VITE_SITE_URL` left at the default `http://localhost:4173` | Set `VITE_SITE_URL` and rebuild (§5); the prebuild hook rewrites the artifacts |
| Visitors see the old catalog after a release | Catalog changed without a `STORAGE_KEY` bump (stale localStorage shadows the seed) | The `tests/catalog-hash.test.ts` gate blocks this at CI time; if you bypassed it, bump `STORAGE_KEY` and add a `tests/catalog-registry.json` row |
| `npm run e2e` fails to bind port 4173 | Stale preview server | `pkill -f "vite preview"`, or set `E2E_PORT` |
| `npm audit` flags braces/micromatch | Build-time-only dependency of `vite-plugin-singlefile`'s glob handling | Accepted risk — inputs are trusted repo files; do not downgrade the plugin |
| WebKit/mobile project complains about missing host libs | The mobile project pins the chromium engine on the iPhone 14 profile | Install WebKit host libs only if you need Safari coverage; the pin is intentional |
| Admin/account pages bounce to login after a hard refresh | You reintroduced the hydration race (navigation before the store's `ready` flag) | Gate on `ready` before redirecting — see AGENTS.md rule 3 |
