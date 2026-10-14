# Session 8 — Sitemap & SEO Workstream, Reference Re-Sweep (No Drift)

> **Date:** 2026-10-12 · **Base:** `35f676f` (session-5 record) · **Remote:** pushed to `main`
> **Gate:** typecheck ✓ · 95/95 unit ✓ · build 506 KB ✓ · **182/182 E2E** (91 specs × 2 projects) ✓

## Mandate

The session-8 instruction added one explicit workstream none of the prior
sessions had covered: **check for Sitemap implementation and SEO
optimization**, using the `ecommerce-store` template as the reference
implementation — plus the standing mandates (document suite review,
skills-driven audit, reference parity sweep with mobile-menu attention,
TDD, screenshots, docs alignment, worklog, SSH-wrapper push to `main`).

## Workspace refresh & document review

`git pull` fast-forwarded `84b8191..35f676f` (adds `docs/session_7.md` —
the session-5 final record; `docs/session_6.md` is its raw transcript).
The full suite was re-read and validated against the code: AGENTS.md,
CLAUDE.md, README.md, PAD, SKILL.md (v1.2.0), `docs/remediation-plan.md`
(§11 = session 5, 100% executed), `worklog.md` (Tasks 1–10), session_6/7.
Baseline gate reproduced the session-5 ledger exactly: typecheck ✓ ·
33/33 unit ✓ · build 499 KB ✓ · 144/144 E2E ✓. `.env` /
`.env.example` / repo-root `db/` contract verified in place.

## Audit

- Relevant `skills/skills-catalog.md` entries consulted: `tdd-workflow`
  (RED→GREEN discipline), `webapp-testing` (production-build E2E doctrine),
  `agent-browser` (live sweep), `code-review-and-audit` (gate structure).
- **SEO/sitemap gap confirmed:** the SPA had title + meta description in
  `index.html` and NOTHING else — no robots.txt, no sitemap.xml, no OG/Twitter
  tags, no canonical, no JSON-LD, and zero `document.title` management
  anywhere in `src/` (every route rendered under the same static title).
- Template SEO pattern decoded from `ecommerce-store`:
  `src/app/sitemap.ts` (statics + product URLs with priorities),
  `src/app/robots.ts` (disallow private surfaces + sitemap pointer), root
  metadata (title template, description, metadataBase, icons, appleWebApp),
  per-page metadata, OG/Twitter head layer, Organization/WebSite + Product
  JSON-LD nodes.

## Live reference re-sweep (§11.5.2 mandate)

agent-browser @390×844 (2026-10-12). **No visual drift — first sweep in
four with zero changes.** All session-4/5 pins re-confirmed: white/80
shadowless panel with 1px bottom border, bare dark trigger (36×36,
transparent), 14px/500 rows in muted-foreground, 44px height, 12px
active-row radius on `rgb(217,110,38)` with white text. (Sweep mistakes
worth remembering: the trailing-edge hamburger sits AFTER the cart button —
clicking the last icon before measuring navigates to /cart; and the
reference's own toast viewport hides its menu search pill from naive
probes — session-5's fresh measurement stands.)

**Reference SEO shape decoded** (curl + head probes): title map for 23
static paths (incl. the "Order Tracking" and "Terms Of Service" quirks;
PDPs left on the static title), site-wide description, full OG/Twitter set
with the media-CDN logo, CDN-logo favicon, robots.txt that disallows
NOTHING, sitemap.xml listing 22 statics (including /admin/* — a mistake)
with ZERO product URLs, and a broken (302) manifest.json.

## TDD execution (red → green)

- **R8-01** `public/robots.txt` — allow-all, disallow /admin /account /cart
  /checkout /order-success, sitemap pointer. Superset: the reference
  disallows nothing.
- **R8-02/03** `scripts/generate-sitemap.mjs` (+ `prebuild` hook and a
  `seo:generate` alias) writes robots.txt + sitemap.xml from the catalog:
  12 public statics at template priorities + all 24 visible products as
  `/products/{slug}` (0.8/weekly). `tests/sitemap.test.ts` parses the
  COMMITTED artifacts against the real catalog import (33 pins) — any
  catalog↔sitemap drift fails the gate, same doctrine as the storage-key
  registry.
- **R8-04** `index.html` static head: the reference's description verbatim,
  robots meta, theme-color `#fbfaf9`, canonical, CDN-logo favicon (the
  template's FAVICON-1 precedent), full OG + Twitter
  (summary_large_image) set, Organization + WebSite JSON-LD (one node per
  script). Static values are first-paint/no-JS fallbacks; HeadManager
  rewrites the dynamic ones per route.
- **R8-05** `src/lib/seo.ts` — pure seam (`buildRouteMeta`):
  the reference's 23-path title map (quirks pinned), dynamic supersets
  (PDP → "{Product} | HomeNest Kitchen" resolving by slug OR id, humanized
  unknown slugs per the template's TITLE-2, auth + not-found titles), admin
  titles cleaned of the reference's "admin/" artifact (registered
  divergence), canonical (query dropped) vs og:url (query preserved —
  template METADATA-OG-1 shape), and the Product JSON-LD node
  (brand/offers/aggregateRating, InStock/OutOfStock). Applied by
  `src/components/head-manager.tsx` inside `RouterProvider`.
- **R8-06** `tests/e2e/seo-head.spec.ts` — 19 specs × 2 projects gating the
  SERVED bundle: robots/sitemap reachable, 13 route titles, PDP
  title=h1+canonical+og:url+Product JSON-LD (USD/InStock), humanized
  unknown-slug title with no Product node, static OG/Twitter/JSON-LD set,
  client-side title updates across pushState/popstate (fixed-1280 desktop
  describe — the mobile project carries nav inside the menu panel).

## Environment & tooling notes

- `VITE_SITE_URL` documented in `.env.example` as the single origin knob
  (default `http://localhost:4173`), shared by `src/lib/seo.ts`,
  `scripts/generate-sitemap.mjs`, and the static `index.html` fallbacks.
- Two test-infra lessons: (1) Playwright error output renders CSS
  attribute selectors lossily — a selector that displays mangled may be
  correct; verify against the DOM, not the log. (2) Product cards link
  `/product/{id}` (reference shape) — `/products/{slug}` hrefs exist only
  in the sitemap/slug deep-links.
- Captures against the production preview (`vite preview` :4175):
  `session8-home-desktop`, `session8-pdp-desktop`, `session8-mobile-home`,
  `session8-mobile-menu-open` → `docs/screenshots/`.

## Verification gate

typecheck ✓ · 95/95 unit ✓ (6 files: +29 seo, +33 sitemap) · build 506 KB ✓
(prebuild regenerates SEO artifacts) · **182/182 E2E** (91 specs × 2
projects) ✓ · axe structural gate on 8 surfaces unchanged ✓

## Docs aligned in the same change

`docs/remediation-plan.md` (§12 addendum), this file, PAD (§2 command
table, §4.1 store shape note, §5.6 divergences #14–15, §7.1 test table,
§7.4 checklist, §10 known issues, §11 key files), AGENTS.md (SEO section,
commands, counts), CLAUDE.md (SEO layer, counts), README.md (env table,
counts, feature bullet), SKILL.md → v1.3.0 (SEO architecture section,
route-head contract, commands, Appendix B/C/D rows), `.env.example`,
`worklog.md` (Task ID 11).
