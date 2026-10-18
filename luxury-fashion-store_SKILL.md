---
name: luxury-fashion-store
description: "Engineering skill for the AURELIA (VELOUR) luxury-fashion e-commerce codebase — Next.js 16 App Router + React 19 + Tailwind v4 + Prisma/SQLite. Use when extending, debugging, onboarding, or replicating this storefront: server-action mutation seams, Tailwind v4 parity pins (hsl() literals, flex gap stacking), standalone-bundle assembly, schema-relative SQLite resolution, and the two-layer vitest/playwright test architecture."
version: 1.34.0
last_updated: 2026-10-18
tags: [nextjs, react19, tailwind-v4, prisma, sqlite, ecommerce, server-actions, playwright, vitest, design-parity]
project_state: "Production-ready. Gates: typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build ✓ E2E 270 passed + 2 skipped (136 unique cases × chromium+mobile — incl. the K-1/L-1/M-1 axe a11y gate, 14 surfaces incl. logged-in AND admin, the N-1/F-B CSP+JSON-LD gate, the session-30 F-AA static-transport-headers gate, the session-31 F-BB cookie-security gate, the session-32 F-CC checkout capability gate, the session-33 F-DD account order-detail gate (owner IDOR + the F-16 admin-note privacy filter), the session-34 F-EE guest wishlist-merge gate (both auth doors, zero canonical-logins), the session-35 F-FF success-gate owner-capability rows (the session-bearing half of the /checkout/success capability matrix, zero logins), the session-36 F-GG guest wishlist-merge DEDUPE gate (the overlapping-item merge completes without duplicating — the login door survives a guest piece already on the user's list), the session-37 F-HH admin event-write gate (the mutation action's OrderEvent minting pinned on an offline-minted admin session — zero logins, the toast-blind silent class caught by server-truth dbRead), the session-38 F-II password-rotation session-revocation gate (a rotation revokes every OTHER session while keeping the caller's — the F-4 hijack-revocation contract pinned on an offline-minted second session, the hash rotation verified by offline scrypt; zero logins, zero registers), the session-39 F-JJ profile-write gate (the profile save's db.user.update pinned server-truth — the User row's name IS the submitted value, the email untouched, a fresh render prefills the new name; zero logins, zero registers — both /account mutation seams in account.ts gated), the session-40 F-KK logout row-revocation gate (destroySession's db.session.deleteMany pinned server-truth on an offline-minted session — the cookie-clear half alone keeps every URL-level logout assertion green while the row, the ADR-006 denylist, lingers up to ~30d and a pre-logout stolen cookie survives the logout; zero logins, zero registers, zero limiter consumption — auth.ts's three mutation seams each own a gate), the session-41 F-LL low-stock KPI read gate (the admin dashboard's G-3 dedicated-COUNT read pinned through a 21-product SQL fixture + inactive/threshold sentinels on an offline-minted admin session — the KPI reads the TRUE count of active products at stock ≤ 3, never the take-capped list length, never the unfiltered count; the afterAll slug-prefix DELETE is the fixture's only cleanup path — global-setup does NOT wipe Product; zero logins), the session-21 action-seam security gate, the session-22 SEO metadata gate, the session-23 failure-surfaces gate, the session-29 API-contract gate, and the session-24/25/26/27/28/29 brand-metadata gate — the swan mark, the og cards, the manifest, the font cache, the store-root JSON-LD, the font preloads + their referenced files, the theme-color, security.txt, the auth-page identity + breadcrumb graphs, the canonical links, the product-price metas, the PDP's site-level OG identity, every referenced brand asset serving over the wire — two desktop-only pins skip on mobile; + 2 setup projects). 13 Prisma models. Brand assets: swan mark (icon.svg/favicon.ico/apple-icon), 1200×630 og card, PWA manifest. Demo: james@example.com/Demo1234! (customer), admin@aurelia.com/Admin1234! (admin)."
reference_site: "pastel-aurelia-fashion-edit.base44.app — a visual-only prototype (inert commerce buttons). This repo is its functional superset with resting-state visual parity."
---

# luxury-fashion-store SKILL — AURELIA (VELOUR)

> Single source of truth for working in this codebase. Every fact below is verified
> against source at distillation time (v1.0.0). Companion docs: `AGENTS.md`
> (commands/env quick reference), `CLAUDE.md` (working standards),
> `Project_Architecture_Document.md` (deep architecture + ADRs),
> per-session remediation ledgers `docs/remediation-plan-session<N>.md` (the highest N is latest).

---

## §1 Project Identity & Design Philosophy

**What it is:** a production-grade luxury-fashion storefront + admin console. The
reference site is a polished *visual prototype* — working login, cart drawer and
search overlay, but every commerce action (`Add to Bag`, category cards, mobile
menu links — ALL of them as of session 5's sweep) has `hasOnClick: false` and
every catalog route 404s. This repo reproduces its look
exactly (measured computed styles) and makes every interaction real.

**The parity law (binding):** on every parity surface — announcement bar, header,
hero, product card, mobile nav, cart drawer, search overlay, footer, login/register
cards — the *resting* visual output must match the reference's measured geometry and
typography. Functional additions may extend those surfaces, never restyle them.

**Design philosophy (measured, not invented):**

- Warm-paper luxury: page background `rgb(248,247,246)`, ink `rgb(23,20,17)`, dark
  charcoal footer, gold SALE accents.
- Editorial typography: **Cormorant Garamond** (300–600) for display — hero titles
  use large serif italic — **Montserrat** (200–700) for everything else, with
  uppercase letter-spaced labels for nav/buttons.
- Sharp corners signal couture: `--radius-sm: 0px`, `--radius-md: 2px`,
  `--radius-lg: 4px` (soft radii only exist for xl/2xl/3xl utility scales).
- Centered logotype "VELOUR" with "PARIS · MILAN · NEW YORK" tagline between split
  left nav and right icon cluster.
- Hero slides anchor HORIZONTALLY per slide (session-6 re-measure): slide 1
  `justify-start` + text-left, slide 2 `justify-end` + text-left, slide 3
  `justify-center` + text-center (the reference RE-ANCHORED slide 3 mid-day
  on 2026-10-14 — P-8; latest measurement wins) — with a horizontal push
  transition (translateX ±100%), never a cross-fade.
- Brand marquee strip directly under the hero: border-y, 30s linear marquee,
  8 houses separated by gold ◆ (P-3).
- Exclusive Deals is a COMPOSITE section (P-9, re-measured 2026-10-15;
  P-14 session-8): the header text and the countdown share ONE row
  (`flex flex-col lg:flex-row items-start lg:items-center justify-between
  mb-12 gap-6`) — left: kicker mb-2 + 60px font-light h2 + copy
  (`max-w-[320px]`, wraps two lines); right: the countdown STACK ("SALE
  ENDS IN" label ABOVE three 48px ink digit boxes, `items-end` at lg;
  mount-relative ~8h24m target ticking real seconds, re-armed per mount
  cycle — H-49); a bento grid (tall 628×1908 women tile stretching over two
  628×942 men/accessories tiles — the right tiles are **2:3 at EVERY
  breakpoint**, mobile 342×513 included), and the sale products INLINE as a
  4-col grid — the standalone Sale row is GONE.
- The mobile drawer is the logotype + FIVE inert menus (Women, Men,
  Accessories, Designers, Sale) with `flex flex-col gap-5 mt-4` — the
  ACCOUNT/WISHLIST tail the reference shipped in sessions 1–7 was REMOVED by
  the reference (P-12, re-measured 2026-10-15); the clone matches (account
  stays reachable via the header heart/checkout/URLs).
- Hover-revealed commerce: product card action row (ADD TO BAG / eye / heart)
  appears on hover; card text stack = brand / name / 16px stroke stars
  (muted-foreground, NOT gold) + "(89)" 10px / price + 14px compareAt /
  COLOR SWATCHES (w-4 h-4 border chips; no "NEW" chip) / **SIZE CHIPS** (one
  bordered button per product size — text-[10px] px-2.5 py-1, square,
  transparent bg; P-11). Sale cards carry a -{discount}% red-500 chip on the
  image (P-10). **Card NAMES render in Cormorant Garamond (P-15): the
  reference maps EVERY heading rank — h1/h2/h3, card-name h3s included — to
  the display serif; its non-heading font-body elements (brand, price, chips)
  are Montserrat.** Product rows use FIXED-width cards at every breakpoint
  (260px below lg, 280px at lg+, gap-6 throughout — P-13; "View All" hides
  below lg), and the row-header kicker sits mb-2 (8px).

**Superset mission:** everything the reference fakes, this codebase really does —
full catalog, cart, guest+member checkout (card + COD), wishlist, customer accounts,
role-gated admin, working PLP/PDP (the reference's `/shop` 404s on itself).

## §2 Tech Stack & Environment

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.4.2 | `output: "standalone"` + manual asset assembly |
| UI runtime | React | 19.3.1 | React Compiler-era lint rules enforced |
| Language | TypeScript (strict) | 5.9.3 | `tsc --noEmit` gate |
| Styling | Tailwind CSS (CSS-first `@theme`) | 4.3.3 | v4 traps — see §9 #1–#2 |
| ORM / DB | Prisma + SQLite (single file) | 6.19.3 | 13 models, `db/custom.db` |
| Validation | Zod | 3.25.76 | every seam |
| Unit tests | Vitest (node env) | 3.2.7 | 173 tests (19 files: `src/lib/*.test.ts` + `tests/unit/sweep-lib.test.ts` — H-71 added the sweep-tool contract suite; N-1/F-B added `csp` + `structured-data`; F-D added the `serializeJsonLd` contract; F-H added the sitemap/robots SEO contract; F-J added the `isSchemaNotReady` boot-race classifier; F-L added the `buildManifest` installability contract; session-25 added `extractNonce` + `storeRootJsonLd`; session-26 added `breadcrumbJsonLd`) |
| E2E | Playwright (standalone server) | 1.64.1 | 136 unique cases × 2 device projects (+2 setup; incl. the accessibility-axe gate — K-1/L-1/M-1 — the security-csp gate — N-1/F-B — extended session-30 with the F-AA static-transport-headers describe: the six next.config.ts headers pinned at EXACT values on three route classes — and session-31 with the F-BB cookie-security describe: the three identity cookies' hardened browser-enforced flags across the real cart/wishlist/session minting flows — the checkout capability gate — session-32, F-CC: the guest confirmation's HMAC view-token matrix driven end-to-end — the account order-detail gate — session-33, F-DD: the owner IDOR gate + the F-16 admin-note privacy filter, zero logins — the guest wishlist-merge gate — session-34, F-EE: both auth doors of mergeGuestWishlistIntoUser on the wire, zero canonical-logins — the success-gate owner-capability rows — session-35, F-FF: the session-bearing half of the /checkout/success capability matrix direct-fetched on james's storageState, zero logins — the guest wishlist-merge DEDUPE gate — session-36, F-GG: the overlapping-item merge completes without duplicating (server-truth row count == 1; the P2002 crash class pinned), zero canonical-logins — the admin event-write gate — session-37, F-HH: the mutation action's OrderEvent minting pinned on an offline-minted admin session (status + tracking legs, server-truth dbRead beyond a baseline-id diff), zero logins — the password-rotation session-revocation gate — session-38, F-II: a rotation revokes every OTHER session while keeping the caller's (the F-4 hijack-revocation contract — an offline-minted second session revoked server-truth, the caller's session surviving by token and on the wire, the hash rotation verified by offline scrypt; the resurrect-in-finally restores lawfully-revoked setup-session rows), zero logins, zero registers — the profile-write gate — session-39, F-JJ: the profile save's db.user.update pinned server-truth on the storageState session (the User row's name IS the submitted value, the email untouched, a fresh render prefills the new name; the finally restores the captured name byte-identically — both /account mutation seams in account.ts now gated), zero logins, zero registers — the logout row-revocation gate — session-40, F-KK: destroySession's db.session.deleteMany pinned server-truth on an OFFLINE-MINTED session riding a describe-scoped minted-cookie storageState (the cookie-clear half alone keeps every URL-level logout assertion green — the existing logout case passed green under the dropped-deleteMany mutation demo; the row, the ADR-006 denylist, must be GONE after the real Sign out click, the bounce + cookie clear re-asserted; auth.ts's three mutation seams each own a gate), zero logins, zero registers, zero limiter consumption — the low-stock KPI read gate — session-41, F-LL: the admin dashboard's G-3 dedicated-COUNT read pinned through a 21-product SQL fixture + inactive/threshold sentinels on an offline-minted admin session (the KPI reads the TRUE count of active products at stock ≤ 3 — never the take-capped list length, never the unfiltered count; the alert panel's read-through render SUPPORTING; the afterAll slug-prefix DELETE is the fixture's ONLY cleanup path — global-setup does NOT wipe Product), zero logins — the action-seam security gate — session-21, H-59 closed over the wire — the SEO metadata gate — session-22, F-H — the failure-surfaces gate — session-23, F-I2 + the RSC fallback contract — the API-contract gate — session-29, F-Y: the three REST route handlers pinned over the wire — and the brand-metadata gate — session-24 F-K/F-K2/F-L/F-M + session-25 F-N/F-O/F-P/F-Q + session-26 F-S/F-T/F-V + session-27 F-W + session-28 F-X + session-29 F-Z: the swan mark, the og share card, the manifest body, the font cache, the store-root JSON-LD, the font preloads AND their referenced font files, the theme-color, security.txt, the auth-page identity + breadcrumb graphs, the canonical links, the product-price metas, the PDP's site-level OG identity, and every referenced brand asset serving over the wire) |
| Icons | lucide-react | 0.545.0 | header icon cluster |
| Auth | custom scrypt + DB sessions | — | HMAC-signed httpOnly cookies |

Runtime: Node.js ≥ 20 (validated on 24), npm. No other package manager.
No CSS-in-JS, no component library beyond the local `src/components/ui` primitives
(shadcn-style Radix wrappers), no state library beyond one context provider.

## §3 Bootstrapping & Configuration

```bash
git clone git@github.com:nordeim/luxury-fashion-store.git
cd luxury-fashion-store
npm install
npm run db:setup      # prisma db push + tsx prisma/seed.ts → db/custom.db
npm run dev           # http://localhost:3000
curl localhost:3000/api/health   # → {"ok":true,"db":true}
```

**Environment contract:**

| Var | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | `file:../db/custom.db` — **schema-relative** (Prisma CLI resolves against `prisma/`, landing at `<repoRoot>/db/custom.db` regardless of CWD) |
| `AUTH_SECRET` | yes (prod) | Session-cookie + order-view HMAC secret |
| `TRUST_PROXY` | no | Set `=1` only behind a trusted reverse proxy; enables `x-forwarded-for` for the rate limiter (`clientIpFrom`) |
| `NEXT_PUBLIC_SITE_URL` | optional | canonical/og:url fallback + sitemap origin (default `http://localhost:3000`) |

**Binding rules:**

1. `src/lib/db-path.ts` reproduces the CLI resolution rule and is pinned by
   `src/lib/db-path.test.ts` (9 tests). **Do not simplify.**
2. `src/lib/db.ts` re-anchors the URL through that resolver before constructing the
   client. **Absolute `file:` URLs pass through untouched** — the E2E webServer
   deliberately uses an absolute path because `output: "standalone"` copies
   `prisma/schema.prisma` into the bundle (file tracing sees `db-path`'s
   `existsSync` reads), which would re-anchor a relative URL to a nonexistent
   `<standalone>/db/` path.
3. **Sandbox quirk:** some CI shells export a parent-workspace `DATABASE_URL` that
   overrides `.env`. Run DB/dev commands as `env -u DATABASE_URL <cmd>`.
4. `.env.example` is tracked by git and mirrors the contract. `db/*.db` is
   git-ignored; materialize with `npm run db:setup`.
5. `npm run build` = `next build && node scripts/assemble-standalone.mjs`. The
   assemble step copies `.next/static` + `public/` into `.next/standalone/` — the
   step the Next.js docs require and the build does NOT do. **Never remove it**
   (§9 #3).

## §4 The Design System (Code-First)

Tokens live in `src/app/globals.css` inside `@theme inline` as **full `hsl()`
literals** (v4 requirement — §9 #1). Verified values:

```css
--color-background: hsl(30 15% 97%);        /* warm paper */
--color-foreground: hsl(25 15% 8%);         /* ink */
--color-card: hsl(0 0% 100%);
--color-primary: hsl(25 15% 8%);            /* ink — buttons */
--color-primary-foreground: hsl(30 15% 97%);
--color-secondary: hsl(30 20% 93%);
--color-muted: hsl(30 15% 92%);
--color-muted-foreground: hsl(25 10% 45%);
--color-accent: hsl(35 60% 55%);            /* bronze accent */
--color-accent-foreground: hsl(0 0% 100%);
--color-destructive: hsl(0 84.2% 60.2%);
--color-border: hsl(30 15% 88%);
--color-input: hsl(30 15% 88%);
--color-ring: hsl(35 60% 55%);
--color-gold: hsl(42 75% 52%);              /* SALE link, stars */
--color-gold-light: hsl(42 80% 70%);
--color-cream: hsl(38 40% 96%);             /* section alternates */
--color-charcoal: hsl(220 15% 18%);         /* dark footer, auth cards */
```

Plus a slate scale re-declared for the auth/admin surfaces (`--color-slate-50` …
`--color-slate-900`) and semantic radii (§1) / shadows / blurs.

**Typography classes:** `.font-cormorant` (display serif) and `.font-montserrat`
(body sans) — both self-hosted `@font-face` from `public/fonts/` (Cormorant
Garamond 300/400/500/600, Montserrat 200–700, woff2). **No Google Fonts network
dependency** — build and runtime are hermetic.

**Signature patterns:** uppercase + `tracking-[0.2em]`-style letter-spaced labels;
serif italic hero display; thin `h-px` dividers in `--color-border`; gold used ONLY
for SALE, stars, and focus rings — never as a fill.

## §5 Component Architecture & Patterns

```text
src/app/
  layout.tsx                root (fonts, globals)
  globals.css               @theme inline tokens + @font-face + v4 pins + marquee keyframes
  not-found.tsx               measured 404 card (chrome-less slate)
  error.tsx | global-error.tsx  ← F-I boundaries: segment + ROOT (global-error
                              renders its own <html>/<body> + imports globals.css)
  icon.svg | favicon.ico | apple-icon.png   ← F-K: the swan mark (measured
                              #404040 circle + #F4ECD6 swan; rendered by
                              scripts/brand-assets.cjs + scripts/png-to-ico.py)
  opengraph-image.png         ← F-K2: the 1200×630 share card (auto-injects
                              og:image + twitter:image on every route)
  manifest.ts                 ← F-L: static metadata route (buildManifest seam,
                              origin-independent, DB-free — NOT force-dynamic)
  robots.ts | sitemap.ts      F-H metadata routes (force-dynamic — the sitemap
                              reads the catalog)
  (auth)/layout.tsx          ← F-S (session-26): the group layout ships ONLY
                               the two site-level identity graphs (WebSite +
                               Organization, nonce-carrying) — pages stay
                               chrome-less; each page adds its own breadcrumb
  (auth)/login | register   measured slate-card auth surfaces (no chrome)
  (storefront)/             chrome composition point (header/footer/nav/drawers)
    layout.tsx                ← header, mobile nav, cart drawer, search, footer, StoreProvider
    page.tsx | shop | product/[slug] | cart | checkout | checkout/success
    account (+ orders/[id]) | wishlist
    admin (+ orders, orders/[id], products)   role-gated
  api/health | api/search | api/newsletter   the ONLY REST endpoints (reads)
```

**Data flow (one direction, no exceptions):**

```text
RSC page (force-dynamic)
  → server action (src/lib/actions/*.ts, "use server", Zod, authz, transaction)
    → Prisma → SQLite
  ← ActionResult<T> envelope with server-derived DTOs
StoreProvider re-syncs client state from those DTOs
```

Key components (`src/components/store/`): `announcement-bar`, `header` (desktop
dropdowns + icon cluster), `mobile-nav` (the v4-pinned drawer, focus-trapped),
`brand-marquee`
(the 30s strip under the hero), `hero-carousel` (per-slide left/right/center
anchor + push transition), `sale-countdown` (the P-9 live countdown —
useSyncExternalStore, hydration-safe), `exclusive-deals`
(countdown + bento + inline 4-col sale grid, P-9), `cart-drawer`
(Radix-style sheet, focus-trapped), `search-overlay` (typeahead via
`/api/search`), `product-card`
(P-10 text stack: name, stroke stars, swatches, discount chip; hover-revealed
action row), `product-row` (fixed-width scroll rows), `category-edit`,
`exclusive-deals`, `styled-by-you`, `quick-view-modal` (focus-trapped),
`shop-client` (PLP filters + URL sync), `product-detail` (PDP gallery/chips/stepper),
`cart-page-client`, `wishlist-client`, `storefront-home` (12-section home —
the Sale row merged into deals), `footer`,
`newsletter`.

`src/components/ui/`: local shadcn-style primitives (button, input, sheet, dialog,
dropdown-menu, select, …) — Radix underneath, tokens from §4.

`src/lib/` also carries plain-DOM/server utilities that are NOT hooks:
`focus-trap.ts` (`installFocusTrap` — the dialog focus contract for the
hand-rolled drawer/modals, H-26; document-level keydown since H-41),
`sweeper.ts` (`buildSweepPlan` pure + `runSweep` executor — expired sessions /
idle guest carts, K-1, wired in `src/instrumentation.ts` at boot + hourly;
since F-J the boot catch classifies P2021 via `isSchemaNotReady` and downgrades
the pre-schema race to one soft line, other failures stay loud),
`adjust-plan.ts` (`planAdjustment`/`planCorrection` — the pure cart stepper
decision seam, H-39/H-40; zero-delta skip since H-54), `countdown.ts`
(`formatCountdownParts` + `SALE_COUNTDOWN_MS` — the P-9 sale countdown seam),
and `countdown-store.ts` (`createCountdownStore` — the H-49 store seam:
per-mount-cycle deadline re-arm + per-tick snapshot cache, unit-pinnable with
an injected clock).

**Composition rules:** one `StoreProvider` (single client context: cart/user/wishlist
+ UI overlays); server truth flows in as props; client components import types from
`src/lib/cart-dto.ts` (pure) — never from `src/lib/cart.ts` (server-only,
`next/headers` + Prisma; importing it client-side fails the Turbopack build).

## §6 Hooks & Client-State Discipline

**There are no custom hooks by design.** All client state lives in the single
`StoreProvider` context. The three React 19 patterns used instead of effects:

1. **Adjust-state-during-render** (last-seen-props): `StoreProvider` re-syncs from
   incoming server DTOs during render — no `useEffect` + `setState`.
2. **Derived state:** `SearchOverlay.visibleHits` computes filtered hits at render;
   no memoized-effect mirroring.
3. **`useActionState` + `startTransition`:** programmatic dispatch of async actions
   (e.g. `CheckoutFlow.submit`) wraps the call in `startTransition`.

`react-hooks/set-state-in-effect` is configured as an **error** — if you feel the
need for a setState-in-effect, the codebase answer is pattern 1 or 2 above.

## §7 Content Pipeline: Catalog → Seed → DB

- `src/lib/data/catalog.ts` exports `CATALOG_PRODUCTS` — the canonical catalog
  extracted from the reference site's JS bundle (12 products with images, prices,
  sizes, colors, ratings, sale flags) plus hero slides, categories, promos.
- `prisma/seed.ts` is **deterministic** (fixed scrypt salts → stable password
  hashes) and **idempotent** (upserts): 4 categories, 12 products (catalog array
  order = `sortOrder`), 2 users (`james@example.com` customer,
  `admin@aurelia.com` admin), 4 canonical orders.
- Image URLs were audited against HTTP 200 during remediation — three dead URLs
  were replaced with verified working fashion photography. Re-check with
  `for u in $(rg -o 'https://[^"]+' src/lib/data/catalog.ts); do curl -so /dev/null -w "%{http_code} $u\n" "$u"; done | sort | uniq -c`.
- Re-seed ritual: `npm run db:setup` (push + seed). **Restart any long-lived dev
  server afterwards** — the DB file's inode is replaced (§9 #11).

## §8 Accessibility Implementation

- **Semantic landmarks:** `header` / `nav` / `main` / `footer` / `aside` throughout;
  drawer = Radix dialog with proper `role` and focus management.
- **Icon buttons carry `aria-label`s** (header icon cluster: Search, Wishlist,
  Shopping bag, Account; mobile: "Open menu"/"Close menu"; cart lines: "Remove
  X", "Increase/Decrease quantity").
- **Form labels are programmatically associated** (auth forms use real `<label>`
  elements — E2E specs rely on `getByLabel`).
- **`sr-only`** helpers on icon-only controls (e.g. sheet close).
- **Focus visibility** via `--color-ring` (gold) on `focus-visible`.
- Radix primitives bring keyboard support (escape, tab-trap) for drawers/modals.
- **Skip-to-content (A-1, session-11):** the storefront chrome's FIRST element is
  an `sr-only` `#main-content` link — revealed on focus (first Tab stop), Enter
  moves focus to `<main id tabIndex={-1}>`. Rest-invisible (1×1 clipped box),
  pinned by `accessibility.spec.ts`.
- **`prefers-reduced-motion` (A-2, session-11):** a global media query in
  `globals.css` pins every animation to 0.01ms ×1 and every transition to
  0.01ms for opting-out users; normal-path rendering untouched. Pinned by the
  same spec (reduced context: marquee 1e-05s ×1; normal: 30s).
- **Automated axe gate (K-1 + L-1 + M-1, sessions 16–18):** `tests/e2e/accessibility-axe.spec.ts`
  runs axe-core (already in node_modules — the former unused devDependency is
  now load-bearing) against FOURTEEN surfaces at BOTH device
  projects — logged-out: home / shop / PDP / cart / login / register / wishlist
  (empty storageState, zero rate-budget); logged-in: account, wishlist-with-one-heart,
  cart-with-one-line (per-project storageState reuse — zero extra logins; the two
  stateful fixtures build via the PDP and clean up after themselves); admin:
  dashboard / products / orders / order-detail via a **SQL-minted admin storageState**
  (a session-row `INSERT … SELECT` through `prisma db execute` + an offline HMAC
  with the shared `E2E_AUTH_SECRET` — `tests/e2e/e2e-secrets.ts` — ZERO logins, the
  exactly-consumed admin bucket untouched, the row deleted in `afterAll`) — asserting
  ZERO WCAG 2.0/2.1 A+AA violations. `color-contrast` is the one excluded rule — the
  warm-paper/gold/muted palette IS the reference's measured identity (§4/§19)
  and the parity law forbids restyling it (the reference fails the same rule
  on the same nodes). Fixes it drove: `role="img"` on the product-card color
  swatches (aria-label was prohibited on generic spans), NO aria-label on
  the header logotype (trap #30), the header bag/wishlist accessible
  names folding the badge count in when it renders (trap #31), and the
  admin visibility toggle folding the visible state word in (trap #32).

Former roadmap gaps CLOSED in session-11: skip-to-content +
`prefers-reduced-motion` shipped (see `docs/remediation-plan-session11.md`).

## §9 Anti-Patterns & Common Bugs (the trap log)

1. **[CRITICAL] Bare HSL triplets in `@theme`** — the reference site (Tailwind v3
   style) stores tokens as `30 15% 97%`; in v4 they resolve to *transparent*. All
   tokens must be full `hsl(...)` literals. Symptom: invisible sections/borders.
2. **[CRITICAL] `space-y-*` on parity surfaces** — v4's selector rewrite changes
   row geometry. The mobile nav must stack with **`flex flex-col gap-5`** (20px).
   Pinned by `tests/e2e/mobile-navigation.spec.ts` bounding-box assertions.
3. **[CRITICAL] `output: "standalone"` serves zero-hydration pages** — Next.js never
   copies client assets. Without `scripts/assemble-standalone.mjs` copying
   `.next/static` + `public/` into the bundle, pages render perfect SSR HTML whose
   chunks 404 — every click inert. Symptom: "no React fiber on the button".
4. **Relative `DATABASE_URL` inside the standalone bundle** — file tracing copies
   `prisma/schema.prisma` into `.next/standalone`, re-anchoring `file:../db/…` to a
   nonexistent `<standalone>/db/`. The E2E webServer must use an **absolute** path.
5. **`FormData.get()` returns `null` for absent keys; `z.string().optional()`
   rejects `null`** — absent card fields made **every COD order fail Zod**. Coerce
   with `?? undefined` at the seam (`placeOrderAction`).
6. **Wizard state held in the DOM** — step 2 unmounts step-1 card inputs, so
   `getElementById` returns null and **card payments can never pass Luhn**. Values
   needed across steps live in React state.
7. **Shared Playwright auth session** — a logout spec destroys the server-side
   session row and silently logs out every later spec. Per-project auth files
   (`setup-chromium`, `setup-mobile` → `tests/e2e/.auth/{chromium,mobile}.json`).
8. **Client components importing server-only modules** — `cart.ts` pulls
   `next/headers` + Prisma; Turbopack fails the build on that trace. Pure DTOs live
   in `cart-dto.ts`.
9. **`revalidatePath` racing a checkout redirect** — all routes are force-dynamic,
   so the broad call adds nothing but bounces the freshly-emptied cart to `/cart`
   before the success navigation wins. `placeOrderAction` deliberately omits it;
   the client store resets the badge from the action response.
10. **`setState` inside effects** — `react-hooks/set-state-in-effect` is an error
    under React 19 lint here. Use §6 patterns.
11. **Stale dev server after reseed → `SQLITE_READONLY` (code 1032)** — a long-lived
    dev process holds the old inode of `db/custom.db` after `db:setup` replaces it;
    every write fails with "attempt to write a readonly database". Fix: restart the
    server; remove orphaned `db/custom.db-journal`/`-wal`/`-shm` first. The
    production standalone is unaffected (fresh process).
12. **Sandbox `DATABASE_URL` leak** — a parent-workspace export overrides `.env`;
    the DB silently lands in the wrong place. Always `env -u DATABASE_URL <cmd>`.
13. **`import.meta` in Playwright `global-setup`** — the loader compiles TS as CJS;
    use `process.cwd()`-based paths instead.
14. **Google Fonts at build/runtime** — a network dependency that breaks hermetic
    builds. Fonts are self-hosted woff2 in `public/fonts/`.
15. **Dead catalog image URLs** — reference-era URLs rot. Audit before shipping (§7).
16. **E2E validates the last BUILD, not the last edit** — the Playwright webServer
    boots `node .next/standalone/server.js`. A source fix without a fresh
    `npm run build` is invisible to the suite (and `reuseExistingServer` will happily
    keep serving the stale bundle). Symptom: a fix "doesn't work" only under E2E.
    Ritual: **build → then E2E**, always (§11). The same staleness bites the DEV
    server's CSS: a newly added arbitrary utility (`lg:aspect-[2/3]`, session 7)
    did not appear until a real rebuild — when a fresh class doesn't apply,
    rebuild before debugging the markup.
17. **CSP must be env-conditional** — React **dev** needs `'unsafe-eval'` (refresh
    runtime); production must not have it. `next.config.ts` builds the policy from
    `process.env.NODE_ENV`. Symptom in dev if wrong: console CSP violations, blank
    hydration.
18. **[CRITICAL] TypeScript's DOM lib hides bare-global bugs in server code** —
    `lib: ["dom",…]` declares legacy browser globals (`window.status`, `name`,
    `origin`, `event`, `close`), so a bare `status` in a server action COMPILES
    CLEAN and throws `ReferenceError` at runtime in Node. This is exactly how
    `adminUpdateOrderAction` shipped 100% broken (every admin mutation 500'd)
    through typecheck + lint + unit + E2E (session 4, G-1). Defense-in-depth:
    ESLint `no-restricted-globals` in `eslint.config.mjs` now errors on bare
    `status`/`name`/`origin`/`event`/`close` (session 5 extended it with
    `title`/`length`/`top`/`self`/`parent`/`closed`), and an E2E must exercise
    every mutation seam (a page-visit test proves nothing about the action).
19. **[CRITICAL] `@theme inline` does not emit nested `@keyframes`** — session 5
    defined `--animate-marquee` + `@keyframes marquee` inside the `@theme inline`
    block; the utility was generated but `animation-name` resolved to `none`
    (the keyframes never shipped). **Keyframes live at the TOP LEVEL of
    `globals.css`**; only the `--animate-*` mapping belongs in the theme.
    Caught by the marquee E2E pin (computes `animation-name`).
20. **[CRITICAL] A server action's response re-renders the CURRENT route — auth
    actions must `redirect()` server-side.** `loginAction` used to return an
    envelope for a client `router.push`: the action response re-rendered
    /login AFTER `createSession` set the cookie, so the page guard's
    `redirect("/account")` rode along in the payload and raced the client
    push — `?redirect=/cart` logins flakily bounced to /account (session 5,
    H-21; found by the guest-cart-merge E2E). Success paths of login/register
    now call `redirect(...)` server-side; failures keep the envelope.
21. **Cart line writes must tolerate the line vanishing mid-flight (P2025 →
    `ok` re-sync).** A remove/checkout running concurrently with an adjust or
    a second remove wins the race between the action's pre-check and its
    write; letting P2025 throw is a raw 500 + rejected transition (session 6,
    H-23). `adjust` now writes an ATOMIC `{ increment: delta }` (the ±1
    invariant the module header always claimed) with post-corrections
    (delete ≤ 0, clamp above stock), and both actions catch
    `isRecordNotFound` → re-read the DTO → return `ok`: the caller's desired
    end-state already holds. NOTE: the interleaving is not reliably
    reproducible from the UI (local SQLite serializes fast) — the E2E pins
    are no-5xx invariants, and the fix is defense-in-depth.
22. **[CRITICAL] Tailwind v4 serializes its DEFAULT palette in oklab — and
    Chromium keeps that serialization even through canvas fillStyle.** A pin
    written as `backgroundColor === "rgb(239, 68, 68)"` against `bg-red-500`
    fails with `lab(55.4814 75.0732 48.8528)` even though the rendered color
    IS #ef4444 (session 7, P-10 chip pin). Assert the TOKEN identity instead:
    inject probe elements carrying `bg-red-500`/`bg-red-600` and compare
    computed styles — serialization-independent. (The repo's OWN `hsl()`
    tokens in `@theme inline` serialize as rgb — only the default palette is
    affected.) Same trap for `rounded-full`: v4 computes it from
    `calc(infinity * 1px)`, not `9999px` — never pin on a radius string.
23. **The E2E rate budget is EXACTLY consumed — admin-driven tests use the SQL
    fixture pattern, not extra logins.** The limiter keys per IP+email
    (10/15min) and both Playwright projects share one IP: the admin bucket
    sits at exactly 10 across a full run (setup 1 + 4 in-spec logins, ×2
    projects). Session 7's H-39 pin initially added one more admin login per
    project → 12 → the LAST two admin logins (mobile H-7, mobile H-39) got
    429'd and failed with login bounces. Fix: tests needing an admin-side
    state change drive it via `prisma db execute` SQL (the H-2 injection
    pattern) on the canonical james session. Never add an admin login to the
    suite. Failed attempts also consume the bucket (rateLimit() consumes on
    CALL — before password verification — so the wrong-password case counts).
    Session 34 measured the CUSTOMER bucket the same way: the
    james@example.com login key is ALSO exactly consumed at 10/10 per run
    (2 setup + 2 cart-merge + 2 wrong-password + 2 logout-throwaway + 2
    security-csp, ×1 shared "local" IP). New auth-flow tests must NEVER log
    james in: register a run-unique user instead (the register bucket: 6 <
    10 per run) and log in as THAT user — its email is a fresh per-email
    key (1 of 10 used). The F-EE pin is the reference shape (session-34).
24. **`getComputedStyle().flexDirection` returns `"row"` for EVERY element**
    (it is the initial value, not a flex-container signal). A pin that
    locates its container loosely ("a div that HAS both the heading and the
    countdown") matches the OUTER wrappers, whose default "row" passes the
    desktop assertion vacuously and fails mobile with a confusing delta.
    Locate the structural container directly — the countdown's
    `data-testid` PARENT (`locator("..")`) — and assert alignment there
    (session 8, P-14).
25. **useSyncExternalStore requires a CACHED snapshot.** Re-deriving the
    snapshot from the clock on every `getSnapshot` call can cross a second
    boundary between React's calls (render → post-render check) and trip the
    "getSnapshot should be cached" warning / re-render loop. The countdown
    store caches its formatted string PER TICK — invalidated on each interval
    fan-out and on re-arm (session 8, H-49).
26. **[CRITICAL] Typography drift hides behind short names — pin font
    FAMILIES on pinned faces, not just geometry.** The reference's base CSS
    maps EVERY heading rank (`h1`/`h2`/`h3` — card-name h3s included) to the
    display serif; its `font-body` utility resolves to Montserrat for
    non-heading elements (brand, price, size chips). The clone's card names
    shipped as Montserrat and NO geometry pin noticed at desktop — short
    catalog names fit one line in BOTH fonts at 260–280px, so the card
    stacks coincided byte-for-byte. The drift surfaced only at the 163px
    mobile sale-grid tiles ("Silk Draped Evening Gown" wrapped to two lines
    → +61px on the deals section) and was MIS-CLASSIFIED as catalog data
    variance for a full session (session 8's accepted note). The fix is one
    class (`font-sans` → `font-cormorant` on the card-name h3, session 9,
    P-15). Ritual addition: in every parity sweep, census computed
    `fontFamily` per heading rank on BOTH sides alongside the height census.
27. **[CRITICAL] The standalone server RENAMES its process to
    `next-server (v<N>)` — killing the OLD server by its original name
    silently fails and `reuseExistingServer` then serves a STALE bundle.**
    After `node .next/standalone/server.js` boots, its process title is no
    longer `node .next/standalone/server.js`, so `pkill -f
    "standalone/server.js"` and `pgrep` find NOTHING while the stale server
    keeps :3100 (the next boot dies with EADDRINUSE, errno -98) — and the
    E2E suite then "validates the last build" against whatever the stale
    server still has in memory (session 10: a RED-demo run validated the
    PRE-mutation bundle this way, and the next boot's EADDRINUSE was almost
    missed). Kill by PORT or PID: `kill $(ss -ltnp | grep :3100 | grep -oP
    'pid=\K[0-9]+')` or `pkill -f next-server`. Ritual: after any rebuild
    meant for a manual server, verify the SERVED CONTENT changed (e.g. the
    chip inventory in the home HTML), not just that the port answers.
28. **[HIGH] Gates must run on the FINAL tree — a tool written "after the
    gates" ships the gate red.** Session 11 committed
    `scripts/parity-sweep-session11.cjs` (CommonJS `require()`) after its
    last lint run: every fresh clone of that main failed `npm run verify`
    with 5 `no-require-imports` errors the author never saw (session 12's
    cold-clone baseline caught it — H-70). Two-part fix: (a) the eslint
    ignores carry a scoped `scripts/**/*.cjs` entry (CJS tooling by
    extension — app source stays fully linted); (b) the process rule: when
    a session creates a committed tool mid-flight, RE-RUN the full gate
    chain as the last step before commit. Corollary now enforced by tooling:
    the sweep script probes :3100 BEFORE spawning and fails fast with the
    fix spelled out when a stale server (trap #27's survivor) holds the
    port — measuring an unknown server would silently poison the census.
29. **[MEDIUM] Health-green is not liveness — a guard can race its own event
    delivery.** Session 13's second sweep-tool hardening (F1) closed the
    poison window M1's probe cannot: a child that dies at boot (EADDRINUSE
    lost in the probe→spawn gap, a crash) while a FOREIGN process answers
    the health probe. Two lessons from the RED→GREEN demo: (a) the first
    fix — a bare `childDied` flag checked right after health-green — passed
    vacuously because the foreign 200 (≈10ms) beat the dead child's exit
    event (≈50ms); a flag check must not assume event delivery has
    completed — race a death-promise against a 300ms grace window instead.
    (b) `waitHealth`'s global budget was only evaluated ACROSS retries: a
    socket that connects but never responds hung one request forever past
    its own timeout — every retry loop needs a per-request deadline
    (`req.setTimeout`), not just a cross-retry budget. Same failure family
    as trap #27 (measure the wrong thing confidently), one door narrower.
30. **[MEDIUM] axe's visible-text walk concatenates text nodes RAW — an
    aria-label can never satisfy Label-in-Name when the visible text spans
    block-level children.** Session 16's K-1 fix drove this first-hand: the
    header logotype link wraps an `h1` ("VELOUR") and an `lg:block` tagline
    ("PARIS · MILAN · NEW YORK"); axe's `visibleVirtual` returns
    "velourparis · milan · new york" — the JSX whitespace between the two
    elements belongs to NEITHER text node, so the first token is
    `velourparis` (measured via axe.setup + text.visibleVirtual). The rule
    matches token CONTIGUOUS SUBSEQUENCES (`isLabelContainedInName` →
    `isContiguousSubsequence`), so EVERY hand-written name with a separator
    after "VELOUR" fails ("VELOUR — …", "VELOUR PARIS…" — the latter fails
    because the WALK produced `velourparis`, not because of the dash). Fix:
    DROP the aria-label — the accessible name is then computed from the
    content by the same walk and the rule holds by construction (screen
    readers announce the logotype exactly as it reads). Corollary: locate
    such a label-less logotype with a header-scoped role query, not
    `getByLabel` — and remember the footer's "About Velour" link makes an
    unscoped `getByRole("link", { name: "VELOUR" })` a strict-mode violation.
31. **[MEDIUM] A count badge is VISIBLE TEXT — an icon control's aria-label
    must fold the badge in whenever it renders.** Session 17's L-1 probe
    measured `label-content-name-mismatch` (serious) on every logged-in
    surface with a cart line: the header bag button carried
    `aria-label="Shopping bag"` while rendering the badge digit "1" as
    visible text — WCAG 2.5.3 demands the visible text be contained in the
    accessible name. The wishlist heart carried the same class (badge =
    wishlist size). An EMPTY-cart axe pass can never see this — the badges
    render only when count > 0, so the gate MUST audit the STATEFUL surfaces
    (fixture via the PDP, self-cleaning). Fix: compose the label from the
    same state the badge renders (`Shopping bag, 1 item` / `Wishlist,
    2 items`; at-rest labels byte-identical) — name and visible text can
    never diverge again, the rule holds by construction. Zero visual change.
32. **[MEDIUM] Role walls hide their own a11y debt — mint gated sessions via
    SQL, and fold ANY visible state word into the accessible name.** Session
    18's L-3 seam opened the ADMIN surfaces to the axe gate with a
    SQL-minted session (a `Session` row inserted by `INSERT … SELECT`
    through `prisma db execute` + the cookie HMAC'd offline with the SAME
    `E2E_AUTH_SECRET` the webServer carries — shared via
    `tests/e2e/e2e-secrets.ts` so the two consumers cannot drift). The very
    first admin audit measured `label-content-name-mismatch` (serious) ×12
    on `/admin/products`: the visibility toggle carried
    `aria-label="Hide <name>"` while its visible text is the STATE WORD
    "Visible"/"Hidden" — WCAG 2.5.3 again, same class as trap #31 but a
    NEW instance no logged-out/logged-in pass could ever see. Fixes:
    (a) the toggle's accessible name composes from the same state the word
    renders (`Visible, hide <name>` / `Hidden, show <name>` — axe's matcher
    strips punctuation before the contiguous-subsequence check, verified
    against the installed axe-core; Playwright role-name matching is
    case-insensitive SUBSTRING by default, so existing pins survive);
    (b) the doctrine: gates behind auth walls need SQL-minted sessions —
    never extra logins (the admin bucket stays exactly consumed), and the
    storageState is an inline object, no file needed.
33. **[MEDIUM] Browsers HIDE the CSP `nonce` content attribute after
    parsing — assert the SERVED BYTES, never `getAttribute("nonce")`.**
    Session 19's N-1 seam (per-request nonce CSP via `src/proxy.ts`) ships
    every inline script WITH the nonce — verified first-hand with curl (16
    inline scripts carry the exact header nonce) — yet the Playwright
    assertion measuring `getAttribute("nonce")` read `""` on every script:
    the HTML spec moves a parser-created nonce into an internal slot (CSP
    nonce-hiding, an anti-CSS-exfiltration hardening) and the content
    attribute reads back empty. The page WORKS (the internal slot is what
    CSP checks); the measurement was wrong. Fix: parse `response.text()`
    and match `nonce="<headerNonce>"` in the raw tags — the bytes the
    browser parses are the ground truth. Corollary: test harnesses that
    inject scripts (`page.addScriptTag`, e.g. the axe gate) must opt out
    with the Playwright context option `bypassCSP: true` — harness code is
    not app code and carries no nonce.

34. **[MEDIUM] `execSync` routes the command through a shell — every `$`
    in the string is a shell expansion.** Session-21's action-seam spec
    embedded `p.$disconnect()` inside a `node -e "…"` string passed to
    `execSync`; the shell expanded `$disconnect` to EMPTY (`p.()`) and the
    script died with `SyntaxError: Unexpected token '('` — while looking
    like a Prisma bug. Fix: `spawnSync(cmd, [args-array])` — no shell, no
    expansion — for every helper that interpolates JS/SQL containing `$`.
    Same family as trap #13 (the loader quirks): child processes are a
    boundary; pass ARGV, not shell text.

35. **[HIGH] `public/` statics SHADOW app routes — metadata routes
    included.** Session-22's new SEO gate (F-H) failed its first run:
    `/robots.txt` answered with a FOREIGN body (`User-agent` lowercase, an
    `/order-success` route this app does not have, `Sitemap:
    http://localhost:4173/...`) while the setup logins passed against the
    real server. Cause: the scaffold's `public/robots.txt` +
    `public/sitemap.xml` (git-tracked since session 1, an ecommerce-store
    lineage artifact) answer BEFORE route handlers — Next serves `public/`
    first — so the wire metadata had been WRONG (not missing) for 21
    sessions while four documents advertised the real contract. Fix: `git
    rm` the stale statics (F-H2); and any new metadata route must be
    asserted on its BODY (origin + shape + counts), never its status code.

36. **[MEDIUM] killing a server's PARENT leaves its `next-server` child
    holding the port.** `pkill -f 'standalone/server.js'` killed the node
    wrapper but the `next-server (v…)` child survived, kept :3100 bound with
    a broken DB env, and playwright's `reuseExistingServer` adopted it —
    the next run's setups failed confusingly while the real standalone was
    never booted. Fix: kill by LISTENING pid (`ss -tlnp | rg :3100` → kill
    the pid whose cmdline is just `next-server (v…)`), or `pkill -f
    next-server`; and never trust "the server is dead" until the port is
    free. Session-23 recurrence: a MANUAL spike server left holding :3100
    was adopted the same way — the trap is not limited to killed parents;
    ANY foreign listener is adopted when `reuseExistingServer` is on.

37. **[MEDIUM] `git checkout <file>` reverts EVERYTHING uncommitted in that
    file — including this session's work.** Session-23's mutation demo used
    `git checkout src/lib/sweeper.ts` to undo a one-line sed mutation and
    silently reverted the session's OWN uncommitted export with it; the next
    build failed loudly (instrumentation imports the vanished export — the
    gate chain caught it) and the unit file dropped back to its RED state.
    Fix: never restore session-touched files with `git checkout` — apply the
    INVERSE edit (sed/patch) so only the mutation dies; verify with `rg` for
    the session's own markers ("F-J" etc.) before building.

38. **[LOW] `getByText` matches DOM text — CSS `text-transform` is
    invisible to it.** Session-23's PDP pin asserted the uppercase label
    ("SIZE") exactly as the spike's `innerText` dump had shown it; the
    locator found nothing because the DOM text is `Size` (the uppercase is
    the stylesheet's). Fix: assert with a case-insensitive regex
    (`getByText(/^size$/i)`) whenever the visible casing comes from CSS —
    the same measured-vs-DOM distinction as trap #22 (oklab serialization).

39. **[MEDIUM] `git checkout <untracked-file>` is a SILENT NO-OP — the
    mutation survives while you believe you restored.** Session-24's first
    mutation demo (unit seam) was "restored" with `git checkout
    src/lib/manifest.ts` — but that file was NEW (never committed), so
    checkout failed with a pathspec error that a `|| true` swallowed and
    the `display: "browser"` mutation STAYED in the tree. Trap #37's rule
    (inverse edits, never checkout) applies double to untracked files:
    checkout can't even fail loudly. Fix: restore by inverse edit ALWAYS;
    after every demo, `rg` the mutated line and confirm the original value
    BEFORE moving on (a follow-up `vitest run` of the touched file is the
    cheap verifier).

40. **[MEDIUM] The zero-drift census is NOT head-excluded for BODY-embedded
    non-visuals — a `<main>`-child data block registers as a census child.**
    Session-25's first round-20b run drifted on mainKids 10→12 (both
    viewports): the home page's two new JSON-LD data blocks rendered inside
    `<main>` (the storefront layout wraps children in main), and script
    elements are main CHILDREN to `querySelector('main').children` even at
    zero height — two h-0 `secs` entries and a +2 mainKids. The plan's
    "head-layer, rest-invisible by construction" claim was true for the
    head tags (theme-color/preloads) but false for body-embedded scripts.
    Fix: render site-level data blocks OUTSIDE `<main>` — the (storefront)
    layout is the right composition point anyway (WebSite/Organization are
    SITE entities, not home-only); after ANY head/asset round, treat the
    20b census as the verdict, not the plan's rest-invariance prediction.

41. **[MEDIUM] Next.js metadata merges SHALLOWLY per segment — a child
    `openGraph`/`twitter` object REPLACES the root's wholesale.** Session-27's
    fresh audit found the PDP head serving NO `og:type`, `og:site_name`, or
    `og:url` while every other page carried them: the F-K2 wiring declared
    `openGraph: { images: [{ url }] }` on the PDP, and Next's per-segment
    shallow merge discarded the root layout's
    `{ siteName, type: "website", url }` instead of deep-merging it (the
    PDP's og:image also lost the root card's `og:image:type/width/height`
    annotations — the file convention knows its own PNG's dimensions; a
    remote URL's are not statically known). og:type ABSENT is invisible to
    every visual gate and every console check — only a served-bytes head
    probe sees it. Fix: per-page overrides re-declare the site-level fields
    (the honest `type: "website"`; og:url keeps the site-wide origin
    convention — the canonical link carries the per-page identity), pinned
    by a brand-metadata case. Symptom family: "one page's share card is
    missing fields every other page has" → look for a child metadata
    override on that route BEFORE suspecting the root layout.

## §10 Debugging Guide (symptom → cause → fix)

| Symptom | Root cause | Fix |
|---|---|---|
| Dev overlay "This page couldn't load", log shows SQLite 1032 readonly on `db.cart.create` | Stale dev process vs reseeded DB (inode replaced) | Kill server, `rm -f db/custom.db-journal db/custom.db-wal db/custom.db-shm`, restart with `env -u DATABASE_URL`; in sandboxed shells double-fork: `(setsid … > log 2>&1 < /dev/null &)` |
| SSR HTML perfect but **nothing responds to clicks** | Chunks 404 — standalone lacks client assets | `npm run build` (runs `assemble-standalone.mjs`); verify `.next/standalone/.next/static` exists |
| E2E global-setup: "Cannot use import statement outside a module" / `import.meta` error | TS compiled as CJS | Use `process.cwd()`-based paths in `tests/e2e/global-setup.ts`, `auth.setup.ts` |
| Every COD checkout fails validation; card checkout can't pass Luhn | `FormData.get()` → `null` vs `optional()`; DOM-held wizard state | `?? undefined` coercion at the action seam; keep card fields in React state |
| E2E: auth passes in one spec, later specs see "Sign in" header | Logout spec destroyed the shared server-side session | Per-project `storageState` files; specs needing logged-out surfaces opt out explicitly |
| E2E webServer: Prisma can't open DB | Relative URL re-anchored inside standalone | Absolute `file:` path in webServer env (pass-through in `db-path.ts`) |
| A spec's `node -e` child dies with `SyntaxError: Unexpected token '('` on a line that reads `p.()` | `execSync` shell-expanded `$disconnect` to empty (§9 #34) | `spawnSync(cmd, [args-array])` — no shell, no expansion |
| A fresh E2E gate asserts 200s but the BODY is another app's (wrong origin, routes that don't exist) while the rest of the suite passes | `public/` statics shadow route handlers (§9 #35) — scaffold-era `robots.txt`/`sitemap.xml` answer first | Delete the stale statics; assert bodies (origin + shape + counts), never just status codes |
| E2E setups fail against a server you never booted; :3100 answers with a broken DB | A killed wrapper's `next-server` child — or ANY stale listener, e.g. a manual spike server — still holds the port (§9 #36); `reuseExistingServer` adopted it | `ss -tlnp | rg :3100` → kill the LISTENING pid (its cmdline is `next-server (v…)` or the script path) |
| A one-line mutation demo "restored" by `git checkout` drops the file to RED and the next build fails on a missing export | `git checkout` reverted the session's OWN uncommitted work in that file (§9 #37) | Apply the inverse edit instead; `rg` for the session's marker comments before rebuilding |
| A locator on an uppercase label (`SIZE`) finds nothing though the spike's innerText showed it | CSS `text-transform` — `getByText` matches DOM text (`Size`), not rendered casing (§9 #38) | Case-insensitive regex locator (`/^size$/i`) |
| A mutation demo in a NEW file "restores" cleanly but the mutation is still in the tree | `git checkout` no-ops on untracked files (§9 #39) — the pathspec error was swallowed | Inverse edit; `rg` the mutated line for the original value; re-run the touched test file |
| Sections/borders invisible on parity surfaces | Bare HSL triplets in `@theme` | Convert to full `hsl()` literals (§4) |
| Mobile menu rows collapse/overlap | `space-y-*` under v4 | `flex flex-col gap-5` (already pinned by spec — don't regress) |
| Cart badge stale after an action | Client didn't re-sync from action DTO | Return the DTO; merge in `StoreProvider` (§6 pattern 1) |
| DB lands in the wrong location | Sandbox `DATABASE_URL` override | `env -u DATABASE_URL` + check `src/lib/db-path.ts` resolution via its tests |
| "X-Frame-Options" / clickjacking complaints in embedders | Security headers ship from `next.config.ts` | Intentional (DENY) — do not remove |
| Fix verified in `next dev` but E2E still fails on the old behavior | Stale standalone bundle (§9 #16) | `env -u DATABASE_URL npm run build`, then re-run `npm run test:e2e` |
| Console full of CSP violations in dev; page half-hydrates | Production CSP applied to dev | Keep the `unsafe-eval` dev-conditional in `next.config.ts` (§9 #17) |
| Server action compiles but 500s with `ReferenceError: <x> is not defined` | Bare identifier shadowed by a DOM-lib global (§9 #18) | Destructure/import explicitly; `npm run lint` (no-restricted-globals) catches it at the gate |
| `animate-*` utility applies but `animation-name` computes `none` | Keyframes nested inside `@theme inline` never emit (§9 #19) | Move `@keyframes` to the top level of `globals.css` |
| Login with `?redirect=X` lands on /account instead of X (flaky) | Envelope + client push raced the action's re-rendered /login guard (§9 #20) | Server-side `redirect()` in the auth actions (fixed — do not regress) |
| Double-tap Remove/± in the cart throws P2025 → 500 in the logs | The line vanished between the action's pre-check and its write (§9 #21) | Atomic increment + `isRecordNotFound` catch → `ok` with the fresh DTO (fixed — do not regress) |
| Pin on `bg-red-500` fails with `lab(...)` though the color is right | v4 default palette serializes in oklab (§9 #22) | Probe-element token comparison, not rgb string equality |
| A new admin-login test makes LATER admin logins 429/bounce to /account | The per-IP admin bucket is exactly consumed at 10 (§9 #23) | SQL fixture via `prisma db execute` (H-2/H-39 pattern); never add logins |
| A flexDirection/alignment pin passes on desktop but fails mobile with "row ≠ column" on a container you never meant to target | `flexDirection` defaults to "row" on every element — a div-has-both locator matches an outer wrapper (§9 #24) | Locate the structural container (the testid's direct parent) |
| React warns "The result of getSnapshot should be cached" / re-renders in a loop | The store's getSnapshot re-derives from the clock each call and crosses a second boundary between React's reads (§9 #25) | Cache the snapshot per tick; invalidate on fan-out |
| A Playwright click on an SSR node "succeeds" but the state never changes (aria-pressed stays "false", no console error) — flaky, passes on retry runs | The click landed in the PRE-HYDRATION window: the SSR node has no fiber props, so React's delegated handler ignores it (session 10, H-64) | Poll for the `__reactFiber$` expando on the node before interacting (`expect.poll(() => el.evaluate(n => Object.keys(n).filter(k => k.startsWith("__reactFiber$")).length)).toBeGreaterThan(0)`) — both chip-clicking specs carry it |
| Drawer/modal keyboard users Tab into the page behind | Hand-rolled dialogs never moved focus or trapped Tab (H-26) | `installFocusTrap` in the surface's open-effect (`src/lib/focus-trap.ts`) — keep it on every new hand-rolled dialog |
| E2E fails only on the SECOND run; drawer/cart specs see extra lines | Cross-run residue: the seed never deletes (§ session-5 H-22) | `global-setup` wipes carts/wishlists/sessions — keep it |
| E2E drawer specs see TWO lines with one add (session-6, mid-run) | Within-run residue: the merge test left its line; fixed by cleaning up after itself + wiping ALL orders at setup (H-24/H-25) | `global-setup` order wipe + re-seed; specs that mutate shared state clean up |
| Census drifts +2 mainKids / two h-0 secs after a "head-layer" round (session-25, trap #40) | Body-embedded JSON-LD data blocks rendered INSIDE `<main>` — script elements are main children at zero height | Render data blocks outside `<main>` (the storefront layout — site entities); re-run the two-census ritual before believing any rest-invariance claim |
| One page's share card is missing og:type / og:site_name / og:url while every other page carries them (session-27, trap #41, F-W) | Next metadata merges SHALLOWLY per segment — that route's child `openGraph` override replaced the root block wholesale | Re-declare the site-level fields in the child `openGraph` (honest `type: "website"`, siteName, the origin og:url); pin with a served-bytes brand-metadata case |

## §11 Pre-Ship Checklist

```bash
npm run verify                      # typecheck → lint → 173 unit → build (+ assemble)
npm run test:e2e                    # 136 cases × 2 projects (+2 setup; build FIRST — §9 #16)
curl -sI localhost:3000/ | grep -i content-security   # CSP present, nonce'd (no unsafe-inline/eval in prod)

# Parity pins
rg -n "space-y-" src/components/store || echo "OK: no space-y on parity surfaces"
rg -n "hsl\(" src/app/globals.css | rg -v "hsl\(" && echo "BARE HSL FOUND" || echo "OK: all tokens are hsl() literals"
ls .next/standalone/.next/static >/dev/null && echo "OK: standalone assets assembled"

# Contract pins
git ls-files .env.example | grep -q . && echo "OK: .env.example tracked"
rg -n "DATABASE_URL" .env .env.example   # both file:../db/custom.db

# §9 #28: if this session ADDED any committed script, the lint above ran on
# it — if the script was finalized after the gates, re-run `npm run lint`
# as the LAST step before commit (session-11 shipped main lint-red).

# Fresh-clone experience
rm -rf node_modules db/custom.db && npm install && npm run db:setup && npm run dev
```

Plus human checks: parity surfaces re-screenshot to `docs/screenshots/` when touched;
mobile nav verified at 390×844; docs counts (README badge, CLAUDE.md gate) match the
suites; no `db/*.db` staged; commit goes to `main` only.

## §12 Lessons Learnt & How to Avoid Them

1. **Computed styles are ground truth.** Recon measured the reference (palette
   rgb values, font files, panel widths, gap sizes) instead of eyeballing
   screenshots — that measurement became the parity spec and the E2E assertions.
2. **Audit the reference's interactivity before cloning it.** `hasOnClick: false`
   on every commerce button redefined the mission: superset, not mimicry.
3. **"The app is broken" is usually runtime state.** 64/64 E2E passed on a fresh
   production server while the stale dev server 500'd — evidence localised the
   fault to an old inode, not product code.
4. **Contracts need pins, not comments.** `db-path.test.ts` (9 tests) and the
   mobile-nav bounding-box spec turn "do not simplify" into enforced law.
5. **Null vs undefined is a seam concern.** One `?? undefined` separates working
   COD checkout from 100% Zod rejection.
6. **Dead assets ship silently.** Catalog image URLs were audited with curl; three
   were rotten. Re-run the audit after any catalog change.
7. **Split pure from server-only modules proactively.** The `cart-dto.ts` /
   `cart.ts` split exists because Turbopack correctly refuses server traces in the
   browser bundle — model new contracts the same way.
8. **Docs are part of the gate.** README/CLAUDE.md counts are verified against the
   actual suites every session; drift in docs is treated as drift in code.
9. **Narrowing a query is a contract change — audit every consumer.** Session 3's
   F-19 replaced the admin dashboard's load-all-products query with the low-stock
   filter but left the Products KPI reading the same variable: the card silently
   showed 0 instead of 12. E2E only asserted visibility, not value. It RECURRED
   in session 4 (G-1: the F-9 destructure dropped `status`; G-1b: `??` defeated
   the clear path) — now guarded by ESLint `no-restricted-globals`, a mutation-
   exercising E2E, and value-pinned KPI assertions.
10. **The reference MOVES — re-measure everything, every session, and CENSUS
    the section heights first.** Session 5's sweep found the hero's per-slide
    left/right anchoring and the brand marquee had drifted (or been
    mis-recon'd) since session 1, while session 4's own screenshot already
    showed it — because that sweep only re-measured the mobile menu. Session
    6's sweep, hours later the same day, caught slide 3 re-anchoring from
    right to CENTER — the reference can change at HOUR granularity. Session
    7 sharpened the doctrine: every PINNED surface matched, yet the reference
    had REBUILT the Exclusive Deals section and the product-card text stack —
    the drift hid in surfaces nobody had pinned, and a 5-minute SECTION-HEIGHT
    census (total 11079 vs clone 8771) is what exposed a 2308px divergence.
    Ritual: height census → **font-family census per heading rank (session 9:
    the ONE drift that survived two full sweeps hid in a typography face
    nobody had pinned — the card-name h3 was Montserrat while the reference
    renders every heading in the display serif; it had been mis-classified
    as catalog data variance)** → pinned-surface re-measure → pin whatever
    you measured, so the next drift is a red test, not a surprise. Session 8
    validated the ritual: the census caught FOUR drifts in one sweep (size
    chips on every card, the drawer tail removed, mobile card geometry
    reverted to fixed 260px, the deals header merged) — all in never-pinned
    or structurally-underpinned surfaces. Also: a data-driven delta (the
    reference renaming/shortening a product name, changing wrap heights) is
    CONTENT drift — accept and document it; pin STRUCTURE, not catalog
    copy. **But classify before accepting: session 8 accepted a +61px
    mobile-deals delta as "content drift" that was actually a font-family
    drift (P-15) — measure the reference's own rendering of the SAME text
    before accepting a variance as data-driven.** Session 10 re-ran the FULL
    ritual (height census + font census, both viewports) same-day and found
    ZERO drift — the reference holds still at hour granularity too; the
    ritual is what makes "no news" a verified result instead of an
    assumption.

## §13 Pitfalls to Avoid (the "don't" list)

- Don't simplify `src/lib/db-path.ts` — it is pinned by tests and exists for the
  standalone-bundle quirk (§9 #4).
- Don't use `space-y-*` on any parity surface; don't touch the mobile nav's
  `flex flex-col gap-5` stack.
- Don't add caching to storefront routes (force-dynamic; see §9 #9).
- Don't import `src/lib/cart.ts` from client components — `cart-dto.ts` exists.
- Don't log in per-test (rate limit: 10 attempts/IP/15 min).
- Don't trust client-computed totals — re-derive server-side from DB rows.
- Don't treat sequential order numbers as capability tokens — guest views require
  the HMAC `?order=N&t=<hmac>` token (§20).
- Don't remove `scripts/assemble-standalone.mjs` from the build.
- Don't add `setState` in effects — the lint gate will reject it; use §6 patterns.
- Don't commit `db/*.db` artifacts; don't create branches — all commits go to
  `main`.
- Don't keep a long-lived dev server across `db:setup` runs (§9 #11).
- Don't weaken a parity pin or the money invariant to make a test pass — fix the
  product.

## §14 Best Practices

- **One mutation seam:** everything writable goes through `src/lib/actions/*.ts`
  returning `ActionResult<T>`; no REST mutations, no client-side optimistic math.
- **Validate at every seam:** forms, actions, admin updates — Zod schemas in
  `src/lib/validation.ts`.
- **Money is integer cents everywhere** (`src/lib/money.ts`); format only at
  display time.
- **Identity rows carry random tokens:** cart/wishlist rows are keyed by 192-bit
  random tokens (minted for guests AND users; guest→user merge at login).
- **Rate-limit unauthenticated write seams** (login/register/newsletter/checkout).
- **Per-project E2E auth + delta assertions** on the shared seeded DB.
- **Security headers by default** (Referrer-Policy, nosniff, HSTS,
  X-Frame-Options: DENY) from `next.config.ts`.
- **Hermetic assets:** self-hosted fonts; audited image URLs; no build-time
  network fetches.
- **Sandboxed shells:** start long-lived servers double-forked
  (`(setsid … &)`) and always `env -u DATABASE_URL` for DB-touching commands.

## §15 Coding Patterns (with code)

**Pattern A — the ActionResult envelope** (`src/lib/action-result.ts`):

```ts
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { message: string; fieldErrors?: Record<string, string> } };

// Every action: Zod-parse → authz → transaction → envelope. Never throw across.
export async function addToCartAction(productId: string, size: string, qty: number): Promise<ActionResult<CartDto>> { /* … */ }
```

**Pattern B — FormData null-coercion at the seam** (§9 #5):

```ts
const parsed = schema.safeParse({
  cardNumber: fd.get("cardNumber") ?? undefined,   // null → undefined
  // …every optional key coerced, or COD orders fail Zod
});
```

**Pattern C — adjust-state-during-render re-sync** (`StoreProvider`):

```tsx
const [lastSynced, setLastSynced] = useState(serverCart);
if (serverCart !== lastSynced) {      // during render — no effect
  setLastSynced(serverCart);
  setCart(serverCart);
}
```

**Pattern D — identity-token minting** (guests and users alike):

```ts
const newToken = randomBytes(24).toString("hex");           // 192-bit
const created = await db.cart.create({ data: { token: newToken } });
store.set(CART_COOKIE, newToken, { httpOnly: true, sameSite: "lax" /* … */ });
```

**Pattern E — schema-relative DB resolution** (`src/lib/db-path.ts`, consumed by
`db.ts`; absolute URLs pass through untouched; pinned by 9 unit tests).

**Pattern F — HMAC capability tokens for guest order views** (`order-token.ts`):

```ts
export function orderViewToken(orderNumber: string): string {
  return createHmac("sha256", secret()).update(`order-view:${orderNumber}`).digest("hex").slice(0, 40);
}
export function verifyOrderViewToken(orderNumber: string, token: string): boolean { /* length-safe compare */ }
```

## §16 Coding Anti-Patterns

- `any`-typing action responses (loses the envelope's discriminated union).
- Client-side total math or optimistic-only cart state (server truth is the
  contract; the store re-syncs from DTOs).
- Per-test logins in E2E (trips the limiter) and absolute-count assertions on the
  shared seeded DB (assert deltas/UI-visible reality).
- Broad `revalidatePath` calls after redirect-returning actions.
- Throwing across the action seam instead of returning `fail(...)`.
- Reaching for a second state mechanism (redux/zustand) — the single
  `StoreProvider` is the architecture.
- Holding cross-step wizard values in the DOM (§9 #6).

## §17 Responsive Breakpoint Reference

Mobile-first; census at distillation time: `lg:` ×97, `sm:` ×21, `md:` ×15 —
**`lg` is the primary split** (desktop chrome vs mobile chrome):

| Surface | < lg (mobile/tablet) | ≥ lg (desktop) |
|---|---|---|
| Navigation | "Open menu" button → `w-80` flush-left drawer (`flex flex-col gap-5`, `p-8`, uppercase items, divider, ACCOUNT/WISHLIST superset) | Inline dropdowns (WOMEN/MEN/ACCESSORIES) + right icon cluster + gold SALE |
| Header layout | hamburger · logotype · search/heart/bag | split nav · centered VELOUR · icons |
| Hero | stacked type; slide 1 left-anchored, slides 2–3 right-anchored (same as desktop) | full-bleed carousel, arrows, `01 / 03` counter |
| Product rows | horizontal scroll, 2-up fraction-width cards | fixed `w-[280px]` cards, 4.5 visible, arrow steppers |
| Auth card | full-width slate card | centered fixed-width card |

Validated at 390×844 (iPhone-class) and 1440×900 (desktop).

## §18 Z-Index Layer Map

Only **two tiers** exist in `src/` — keep it that way:

| Tier | Uses | Surfaces |
|---|---|---|
| `z-10` | 10 | sticky header, in-flow elevation over section backgrounds |
| `z-50` | 18 | overlays: cart drawer (Radix sheet), mobile nav drawer, search overlay, dialog backdrops |

Overlays stack by DOM order within `z-50` (drawer after header in the tree);
never introduce a third tier — if two `z-50` siblings conflict, reorder the
composition in `(storefront)/layout.tsx`.

## §19 Color Reference (Complete)

| Token | Value | Role |
|---|---|---|
| background | `hsl(30 15% 97%)` ≈ `#f8f7f6` | page (warm paper) |
| foreground / primary | `hsl(25 15% 8%)` ≈ `#171411` | ink text, buttons |
| card / popover | `hsl(0 0% 100%)` | surfaces |
| secondary | `hsl(30 20% 93%)` | subtle fills |
| muted | `hsl(30 15% 92%)` | muted fills |
| muted-foreground | `hsl(25 10% 45%)` | secondary text |
| border / input | `hsl(30 15% 88%)` | hairlines |
| accent / ring | `hsl(35 60% 55%)` | bronze accent, focus |
| gold | `hsl(42 75% 52%)` | SALE link, stars |
| gold-light | `hsl(42 80% 70%)` | gold hover |
| cream | `hsl(38 40% 96%)` | alternating sections |
| charcoal | `hsl(220 15% 18%)` | footer, auth cards |
| destructive | `hsl(0 84.2% 60.2%)` | errors, remove |
| slate-50…900 | `#f8fafc` … `#0f172a` | auth/admin surfaces |

Measured reference anchors: page `rgb(248,247,246)`, ink `rgb(23,20,17)`.

## §20 The Complete TypeScript Interface Reference

```ts
// src/lib/action-result.ts — the mutation envelope
interface ActionError { message: string; fieldErrors?: Record<string, string> }
type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError };

// src/lib/cart-dto.ts — the pure client contract (server re-exports in cart.ts)
interface CartLineDto {
  itemId: string; productId: string; slug: string; name: string; brand: string;
  image: string; size: string;
  unitPrice: number;   // integer cents
  quantity: number;
  lineTotal: number;   // integer cents
  stock: number;
}
interface CartDto {
  lines: CartLineDto[]; count: number;
  subtotal: number; shipping: number; total: number;   // integer cents
}
const EMPTY_CART: CartDto;
interface WishlistDto { productIds: Set<string> }
const EMPTY_WISHLIST: WishlistDto;

// src/lib/order-token.ts — guest order-view capability
// Secret comes from the strict authSecret() (throws in production if AUTH_SECRET
// is unset — boot-time guard in src/instrumentation.ts makes that a startup error).
function orderViewToken(orderNumber: string): string;          // HMAC-SHA256, timing-safe compare
function verifyOrderViewToken(orderNumber: string, token: string): boolean;

// src/lib/address.ts — schema-checked shipping-address reader (replaces raw JSON.parse)
interface ShippingAddress { fullName: string; phone: string; address1: string;
  address2?: string; city: string; state: string; postalCode: string; country: string }
function parseShippingAddress(raw: string | null | undefined): ShippingAddress | null;

// src/lib/money.ts — integer-cents helpers (format only at display time)
// src/lib/validation.ts — Zod schemas for every seam
// src/lib/rate-limit.ts — 10 attempts / IP / 15 min on auth seams
```

**Prisma models (13):** `User`, `Session`, `Address`, `Category`, `Product`,
`Cart`, `CartItem`, `Wishlist`, `WishlistItem`, `Order`, `OrderItem`,
`OrderEvent` (has `actor`: `system` \| `admin`, default `system` — the customer
order view hides admin notes by filtering `actor === "admin"`),
`NewsletterSubscriber` — SQLite has no enums; statuses are strings
Zod-validated at every seam; money columns are integer cents. FK child lookups
are indexed (`CartItem.cartId`, `OrderItem.orderId`, `OrderEvent.orderId`,
`WishlistItem.wishlistId`).

---

## Appendix A — The Six-Phase Working Method

1. **Reproduce/read first** — browser or test before code; read the nearest parity
   surface + action seam.
2. **Plan the seam** — page (RSC) → component → action → validation → schema.
   Mutations always through `src/lib/actions/`.
3. **Implement minimal + typed** — strict TS, no `any`, DTOs as props.
4. **Gate locally** — `npm run verify`, then `npm run test:e2e`.
5. **Verify in the browser** — dev server + agent-browser; parity screenshots to
   `docs/screenshots/`.
6. **Document drift** — change a pinned contract → update `AGENTS.md` + PAD +
   this skill in the same commit.

## Appendix B — Quick Reference Card

| Need | Path / Command |
|---|---|
| Commands & env | `AGENTS.md` |
| Working standards | `CLAUDE.md` |
| Deep architecture + ADRs | `Project_Architecture_Document.md` |
| Per-session remediation ledgers | `docs/remediation-plan-session<N>.md` (highest N is latest) |
| Session history | `docs/session_<N>.md` (per-session transcripts) + `worklog.md` |
| Parity screenshots | `docs/screenshots/` |
| Mutation seam | `src/lib/actions/*.ts` |
| Envelope | `src/lib/action-result.ts` |
| DTO contract (pure) | `src/lib/cart-dto.ts` |
| DB resolver (do not simplify) | `src/lib/db-path.ts` |
| searchParams coercion | `src/lib/search-params.ts` (firstParam — every consumer) |
| Dialog focus contract | `src/lib/focus-trap.ts` (installFocusTrap — every hand-rolled dialog) |
| Transient sweeper | `src/lib/sweeper.ts` (+ `src/instrumentation.ts` wiring; F-J: `isSchemaNotReady` downgrades the boot P2021 race) |
| Failure surfaces (session-23, F-I) | `src/app/error.tsx` (segment boundary, slate card, reset + home) + `src/app/global-error.tsx` (ROOT boundary — own `<html>/<body>`, imports globals.css) + `tests/e2e/error-surfaces.spec.ts` (the 404 card pinned + the RSC-fallback hard-navigation contract; the boundary render itself is not wire-driveable without a fault-injection backdoor — rejected, see docs/remediation-plan-session23.md §4) |
| Cart stepper planner (pure) | `src/lib/adjust-plan.ts` (planAdjustment / planCorrection) |
| Countdown store (re-arm seam) | `src/lib/countdown-store.ts` + `src/lib/countdown-store.test.ts` |
| Sweep tool primitives (H-71) | `scripts/sweep-lib.cjs` + `tests/unit/sweep-lib.test.ts` (waitHealth/assertPortFree contract pinned) |
| Automated a11y gate (K-1/L-1/M-1) | `tests/e2e/accessibility-axe.spec.ts` (axe-core; 14 surfaces incl. logged-in + SQL-minted admin, self-cleaning; zero WCAG 2.0/2.1 A+AA violations, color-contrast excluded by parity law; `bypassCSP` for the harness injection) + `tests/e2e/e2e-secrets.ts` (the shared offline-HMAC secret) |
| Security CSP seam (N-1) | `src/proxy.ts` (per-request nonce, request+response headers) + `src/lib/csp.ts` (pure directives, unit-pinned) + `tests/e2e/security-csp.spec.ts` (header shape, nonce-in-bytes, hydration, route coverage, JSON-LD) |
| Product JSON-LD (F-B) | `src/lib/structured-data.ts` (`productJsonLd` pure + `serializeJsonLd` — the F-D HTML-safe embedding) + the PDP page's data block (non-executing — CSP-exempt, nonceless by design; the per-tag nonce assertion runs on `/` only). Session-25: `dangerouslySetInnerHTML` is no longer SINGULAR — the storefront layout's identity blocks use the same serializer (both sinks enumerated, both escaped; see the session-25 row) |
| Action-seam security gate (session-21, H-59) | `tests/e2e/action-seam-security.spec.ts` — drives the PDP's server actions by direct POST (`Next-Action: <id>` + a JSON-array body; ids read from the standalone's per-route `server-reference-manifest.json` — the build-shape canary); the WRITE-FREE probe ladder (P1 classify → P2 split → P3 the H-59 payload) proves a foreign size is rejected over the wire with zero Set-Cookie and zero rows; the IDOR census proves a SQL-fixture guest bag line survives unauthenticated cart-line probes; the fail-closed census sweeps every candidate × write-free payload (always 200 + ok:false, never 5xx, never Set-Cookie) |
| SEO metadata seam (session-22, F-H/F-H2) | `src/lib/sitemap.ts` (`siteOrigin` default-origin fallback + normalization; `buildSitemapEntries` — statics first, ACTIVE products only; `buildRobots` — the exact allow/disallow set; unit-pinned) + `src/app/sitemap.ts` / `src/app/robots.ts` (`force-dynamic` — the build stays DB-free) + `tests/e2e/seo.spec.ts` (asserts the SERVED BODY on the documented default origin — the lesson of F-H2: the scaffold's foreign `public/` statics had answered for 21 sessions) |
| Brand metadata assets (session-24, F-K/F-K2/F-L/F-M) | `src/app/icon.svg` + `src/app/favicon.ico` (16/32/48) + `src/app/apple-icon.png` — the swan mark in the measured colors (`#404040` circle / `#F4ECD6` swan), rendered by `scripts/brand-assets.cjs` (chromium) + `scripts/png-to-ico.py` (explicit ICO container — Pillow's ICO save resamples from one base; the exact per-size renders ship verbatim) · `src/app/opengraph-image.png` (1200×630 card — auto-injects og:image/twitter:image on every route) · PDP og:image = the product's first photo (`parseProductImages` in `src/lib/products.ts` — malformed JSON degrades to the root card, never throws) · `src/lib/manifest.ts` (`buildManifest`, unit-pinned) + `src/app/manifest.ts` (STATIC route — origin-independent, DB-free) · fonts immutable caching (`next.config.ts` `/fonts/:file*`) · the gate: `tests/e2e/brand-metadata.spec.ts` (served artifacts + head tags + manifest body + cache header) |
| Store-root identity + transport (session-25, F-N/F-O/F-P/F-Q) | `src/lib/structured-data.ts` `storeRootJsonLd(origin)` (the reference-measured WebSite + Organization graphs, logo = the self-hosted `/icons/icon-512.png`) rendered by the (storefront) LAYOUT — outside `<main>` (trap #40) — with the request nonce via `src/lib/csp.ts` `extractNonce` (hand-rendered data blocks are NOT nonce-stamped by Next; the security-csp per-tag assertion runs on `/`) · first-paint font preloads (`src/app/layout.tsx` `<head>`: cormorant-300 + montserrat-300/400, `crossorigin` REQUIRED even same-origin) · `viewport.themeColor = "#F8F7F6"` (mobile chrome tint = the manifest's brand color) · `public/.well-known/security.txt` (RFC 9116; Expires renews yearly) · gate: `brand-metadata.spec.ts` cases 7-10 |
| Structure parity + auth identity + canonicals + product OG (session-26, F-R/F-S/F-T/F-V) | **F-R**: the newsletter band renders INSIDE `<main>` (`(storefront)/layout.tsx` — the reference moved its band inside its main: round-21a census mainKids 10→11 BOTH viewports, pageH byte-unchanged; the 21b census is the verdict) · **F-S**: `breadcrumbJsonLd(entries, origin)` (the measured BreadcrumbList shape — 1-based positions, absolutized items) + the NEW `(auth)/layout.tsx` (site-level WebSite + Organization blocks for the chrome-less group; served order = layout blocks then the page breadcrumb — byte-matching the reference's login head) + per-page breadcrumbs on login/register · **F-T**: `alternates.canonical` on `/` `/shop` `/login` `/register` (home renders the BARE ORIGIN — Next's `resolveAbsoluteUrlWithPathname` collapses pathname `/` to `result.origin`; RFC-3986-equivalent to the reference's trailing-slash form) + the PDP's existing canonical finally pinned · **F-V**: the PDP's `metadata.other` ships `product:price:amount` (cents→dollars, the JSON-LD arithmetic) + `product:price:currency` (name-attributed — Next's `other` contract; og:type stays `website`: the OpenGraphType union lacks "product", a cast was rejected) · **gate lesson**: the auth pages REDIRECT a session — auth-surface cases need the empty-storageState opt-out (the a11y/auth specs' pattern) · gate: `brand-metadata.spec.ts` session-26 describe |
| PDP site-level OG identity (session-27, F-W) | Next metadata merges SHALLOWLY per segment — the PDP's child `openGraph` (the F-K2 product image) had REPLACED the root layout's site-level block, silently dropping `og:type` / `og:site_name` / `og:url` from the served PDP head (served-bytes verified; every other page carries them; og:type ABSENT is invisible to visual gates and console checks — trap #41). Fix: the PDP's `openGraph` re-declares `type: "website"` (honest — the union lacks "product"), `siteName: "AURELIA"`, `url: siteUrl` (the site-wide origin convention; the canonical link carries the per-page identity); the og:image keeps no width/height/type annotations (remote URL dimensions not statically known — documented residual) · gate: `brand-metadata.spec.ts` "the PDP head carries the site-level OG identity fields" (surgical mutation demo: only that case fails with the fields dropped) |
| Referenced brand assets serve (session-28, F-X) | The manifest case pins the icon SRC STRINGS and the F-N case pins the Organization logo URL — but neither ever FETCHED the files: a renamed/deleted `public/icons/*.png` would 404 the PWA install and the identity graph's logo while every gate stayed green. The F-H2 lesson's sibling — assert the referenced TARGETS, not just the reference · gate: `brand-metadata.spec.ts` "every referenced brand asset serves over the wire" (expectations derived from the SERVED manifest + SERVED home JSON-LD; surgical mutation demo: the icon rename fails exactly that case while the string pins stay green) · evidence tool: `scripts/head-census-session28.cjs` (ten-route head census + six-asset fetch, 43/43 — also confirmed the canonical absence on /cart /checkout /wishlist as the ROBOTS_DISALLOW design and the twitter surface's clean inheritance) |
| REST wire contract + the preload targets (session-29, F-Y + F-Z) | README declares `/api/health` + `/api/search` + `/api/newsletter` as the product's only REST surface, yet no gate exercised the route HANDLERS over the wire (the only tests/ reference was the sweep tool's URL builder — tooling, not a gate); F-Y: the new `api-contract.spec.ts` (9 cases) pins the liveness envelope, the typeahead fast-path/DTO/degradation/clamp, the newsletter success/idempotency/Zod-400 envelopes (the row-count proof via the scratch-probe dbRead, spawnSync args-array — trap #34; the spec-unique row SQL-cleaned in afterAll, limiter arithmetic 4+1 < 10), and the 405 method matrix (NO Allow header on Next 16.4 — pin the status, never the absent header). F-Z: the F-X lesson one layer down — the F-O preload pins three href STRINGS, F-M fetches ONE font file; a renamed `public/fonts/montserrat-*.woff2` would 404 the first-paint preload with every gate green · gate: the new case derives its fetch list from the SERVED DOM's preload set (200 + font/woff2 + nonzero body) · plan-probe discipline: `scripts/plan-probe-session29.cjs` wire-verified all 13 contract assumptions BEFORE the spec was written |
| Static transport headers (session-30, F-AA) | `next.config.ts` `async headers()` ships SIX security headers on `/:path*` (Referrer-Policy, X-Content-Type-Options, Strict-Transport-Security, X-Frame-Options: DENY, Permissions-Policy, Cross-Origin-Opener-Policy) declared in AGENTS.md/README prose, yet zero wire-layer pins existed — a typo'd key would silently strip e.g. `X-Frame-Options: DENY` from every response with every gate green (the F-Y family: a declared contract the gates never exercise) · gate: a new describe in `security-csp.spec.ts` pins all six at EXACT values (`===`, not substring) on three route classes — document root, deep PDP route, API route — one case per class so a dropped header fails all three and a route-scoped regression fails exactly one · plan-probe discipline: `scripts/plan-probe-session30.cjs` (21/21) wire-verified the values BEFORE the spec · mutation demo surgical: the `X-Frame-Options` line deleted → exactly the 6 F-AA cases fail, the 10 N-1/F-B cases stay green |
| Cookie-security contract (session-31, F-BB) | THREE cookies ship the same hardened attribute set in source — `aurelia_session` (`src/lib/auth.ts`: httpOnly, sameSite lax, secure in production, path /, Expires = now + SESSION_TTL_DAYS(30)d, value = `token.hmac(token)` — the raw DB token is the cookie value's first dot-segment), `aurelia_cart` + `aurelia_wishlist` (`src/lib/cart.ts`: same flags, maxAge 2592000, value = the declared 192-bit random hex token) — and the docs declare the shape ("HMAC-signed httpOnly cookies"; "192-bit random token"), yet no gate ever asserted a Set-Cookie attribute (every tests/ Set-Cookie reference is the action-seam's ABSENCE probes; the storageState fixtures record the flags without asserting them — the F-Y/F-AA family) · gate: a new describe in `security-csp.spec.ts` drives the three REAL minting flows in fresh logged-out contexts (guest add-to-bag — the PDP preselects sizes[0]; guest wishlist toggle; demo-customer login — limiter arithmetic 2 setup + 2 throwaway + 2 = 6 < 10 documented in the spec) and pins the BROWSER-ENFORCED state via `context.cookies()` — the strongest witness: the flags the browser parsed and will enforce, immune to Next's serialization-order drift — one case per SEAM so a flipped flag fails exactly its own case; the minted rows self-clean in afterAll keyed by the captured tokens (never by userId — the canonical setup sessions must survive; H-24) · plan-probe discipline with a NEW throwaway-DB-copy harness: `scripts/plan-probe-session31.cjs` (21/21) boots the standalone against a /tmp COPY of the dev DB (the absolute-URL pass-through path) so the probe's writes never touch the dev DB · mutation demo surgical: the session setter's `httpOnly: true` flipped to `false` → exactly the 2 F-BB session cases fail, the 4 cart/wishlist cases and all N-1/F-B/F-AA cases stay green |
| Guest order-view capability gate (session-32, F-CC) | The confirmation URL's `?order=N&t=<hmac>` pair is the declared capability contract (CLAUDE.md "sequential order numbers are not capability tokens"; the `src/lib/order-token.ts` header) — unit-pinned at the pure layer (`order-token.test.ts`) yet never exercised on the wire: the checkout cases REACH `/checkout/success` only by following the placement redirect, so a dropped `isGuestWithToken` check would expose every guest order's email/name/address to anyone holding the sequential order number with every gate green · gate: a new describe in `cart-checkout.spec.ts` (the OWNING spec — the flow that mints guest orders lives there) drives the real guest COD flow in a fresh logged-out context (the F-BB storageState opt-out), captures the minted pair, and direct-fetches the capability matrix — the captured pair serves 200 with the PII it protects; absent token / flipped-char token / a VALID token minted for a DIFFERENT order / an unknown order with its own valid token all 404 into the platform not-found card leaking no guest email; the cross-order token is computed OFFLINE with the shared `E2E_AUTH_SECRET` (the `e2e-secrets.ts` constant) — one checkout-bucket slot saved, no second wizard round-trip; limiter budget 3/project, 6 < 10 per run documented in the spec · plan-probe discipline: `scripts/plan-probe-session32.cjs` (19/19) wire-verified all assumptions BEFORE the spec — including the OFFLINE-HMAC reproduction check (the minted token reproducible from the boot secret alone), the load-bearing assumption for the offline negative · mutation demo surgical: the gate's verification dropped (`!!tokenValue ||` short-circuit, type-safe with `?? ""`) → exactly the 2 F-CC case-runs fail, all placement-redirect cases stay green — they never exercise the verification |
| Account order-detail gate (session-33, F-DD) | `/account/orders/[id]` — a ZERO-coverage seam (no test ever loaded it) carrying TWO declared contracts: the owner IDOR gate (`order.userId !== user.id → notFound()` — a dropped check would serve any order's items/total/last-4/full shipping address to any signed-in customer) and the F-16 privacy filter (`events.filter(e => e.actor !== "admin")` — declared in the OrderEvent model header, the admin action's comment, the page's filter comment, and the seed's G-6/H-10 backfill comment; a dropped filter leaks every internal admin note like `processing → in_transit`) · gate: `tests/e2e/account-orders.spec.ts` (the surface's FIRST owner — no existing spec hosted it), TWO cases riding james's per-project storageState (ZERO logins — the admin bucket stays exactly consumed): the privacy case mints the admin-authored row via the SQL fixture (the H-2 pattern, the exact shape `adminUpdateOrderAction` writes — the model default is "system", the INSERT sets `actor:'admin'` explicitly), asserts the note ABSENT from the served body while the seed's system events stay visible, and self-cleans in a try/finally (H-24; global-setup wipes OrderEvent anyway); the IDOR case opens the canonical GUEST order ORD-2026-004 (`userId: null` — the seed ships the probe target, zero SQL) and asserts 404 + the not-found card + no existence leak · ids resolved at RUNTIME via the `dbRead` helper (global-setup re-seeds fresh cuids every run — never hardcode) · plan-probe discipline: `scripts/plan-probe-session33.cjs` (17/17) wire-verified all assumptions BEFORE the spec against a throwaway DB copy (zero dev-DB writes) · mutation demo surgical: the filter dropped (`order.events` unfiltered) → exactly the 2 privacy case-runs fail while the IDOR case stays green |
| Guest wishlist-merge gate (session-34, F-EE) | `mergeGuestWishlistIntoUser` (`src/lib/cart.ts:202`) — a ZERO-coverage seam on BOTH layers (`rg mergeGuestWishlist tests/` → NOTHING) invoked at BOTH auth doors (`loginAction` auth.ts:45, `registerAction` auth.ts:124) while the sibling cart merge IS wire-pinned; source-declared contracts: the H-29 one-transaction merge, the G-5 cookie-cleared-only-after-work rule ("the cookie is the browser's only reference to the guest list"), the dedupe union (`wishlistId_productId` upsert), the guest-row deletion, the no-cookie guard · the load-bearing discovery: the james login bucket is EXACTLY consumed at 10/10 per run (2 setup + 2 cart-merge + 2 wrong-password + 2 logout-throwaway + 2 security-csp; rateLimit() consumes on CALL — the wrong-password counts; one shared "local" IP) — any new james login 429s mid-run · gate: a NEW describe in `wishlist.spec.ts` (the OWNING spec), ONE case that enters through BOTH doors without touching james/admin: register a run-unique user (register bucket 6 < 10; the no-guest-cookie merge no-ops), sign out, guest-heart `wide-brim-felt-hat` (hearted by NO other spec), capture the 192-bit hex token, dbRead-verify the guest row (userId null), log in as the FRESH user through the real form (?redirect=/wishlist honored — its email is a fresh per-email limiter key), assert the merged item renders AND persists a reload (server truth), the cookie CLEARED from the jar (the G-5 visible half), the guest row GONE by the token (the cleanup half); H-24: nothing to clean (run-scoped rows only) · plan-probe discipline: `scripts/plan-probe-session34.cjs` (16/16) wire-verified all assumptions BEFORE the spec against a throwaway DB copy (zero dev-DB writes) · mutation demo surgical: the login-door call dropped (auth.ts:45) → exactly the 2 F-EE case-runs fail while both setups stay green · probe lesson: `waitForURL(/wishlist/)` matches the ?redirect= QUERY on the pre-navigation /login URL — use a pathname predicate |
| Success-gate owner-capability rows (session-35, F-FF) | The `/checkout/success` capability gate's SESSION-BEARING half (`src/app/(storefront)/checkout/success/page.tsx:38-41`: `isOwner = user && order.userId === user.id`; `isGuestWithToken = !order.userId && token && verifyOrderViewToken(...)`) — the F-CC matrix (session-32) pins the logged-out GUEST rows only; the placement cases reach the page only as the redirect target, so a dropped `isOwner` term would lock every signed-in customer out of their own confirmations with every gate green (four rounds carried, session-32 §8 #20 → 34 §8 #1) · gate: a NEW describe in `cart-checkout.spec.ts` (the OWNING spec — F-CC lives there), ONE case riding james's per-project storageState (ZERO logins — the F-DD posture): row 1 owner+own order+NO token → 200 with the order number + the owner's email; row 2 signed-in+the canonical guest order+NO token → 404 into the not-found card with no guest-email leak (the mismatch half via `order.userId === null !== user.id`); row 3 signed-in+guest order+its own VALID offline token → 200 (the token path is session-ORTHOGONAL — a gate "tightened" to require logged-out would break shared confirmation links); row 3b the cross-order negative holds under a session; all rows read CANONICAL seed data (ORD-2026-001 james / ORD-2026-004 guest) — no SQL fixtures, nothing to clean (H-24); the foreign-owner row (a different non-null userId) stays covered-by-shape (`===` has no null special-case) · plan-probe discipline: `scripts/plan-probe-session35.cjs` (13/13) logged james in through the REAL UI on a throwaway DB copy and wire-verified every row BEFORE the spec (zero dev-DB writes); probe lesson: a console-noise check must exclude the browser's own "Failed to load resource: 404" messages from DELIBERATE 404 navigations — the designed 404 surface IS the behavior under test · mutation demo surgical: `isOwner` + the `getCurrentUser()` read + its import dropped (the strict `noUnusedLocals` gate forces the mutation to its full shape) → exactly the 2 F-FF case-runs fail at `row 1: status` while rows 2/3/3b and the whole F-CC matrix stay green |
| Guest wishlist-merge DEDUPE gate (session-36, F-GG) | The per-item upsert's `update: {}` branch (`src/lib/cart.ts:220-224`, inside the H-29 transaction) — the F-EE gate's fresh user starts with an EMPTY list, so only the CREATE branch ran deterministically (the F-EE header says so verbatim); the dedupe half fires when the guest cookie holds a piece the user's list ALREADY has, and a regression there is the P2002-across-the-seam bug class the sibling toggle action's F-3 comment documents as having SHIPPED before (a blind create on the overlapping item throws inside the tx → the merge propagates → the LOGIN DOOR BREAKS for any returning member who hearted a piece before signing up) · assertion design: `getWishlistDto` reads through a `new Set(...)` — the wishlist PAGE can never render a duplicate, so the DOM count is SUPPORTING evidence only; the LOAD-BEARING assertion is the server-truth dbRead count (`wishlistItem` rows for the user's wishlist × the product == 1) plus the merge COMPLETING (the login lands) · gate: a NEW describe in `wishlist.spec.ts` (the OWNING spec — F-EE lives there), ONE case, fresh logged-out context, ZERO canonical logins, ZERO SQL fixtures: the register door AUTO-LOGS-IN (createSession + redirect inside registerAction — the session-35 plan expected an SQL fixture for the pre-load; the real-UI shape is strictly simpler), the case hearts `cashmere-overcoat` THROUGH THE PDP TOGGLE while signed in (the signed-in toggle mints NO wishlist cookie — `getOrCreateWishlist` returns on the userId branch before the cookie store is touched — pinned as a defense assertion), signs out (the Sign out control lives in the account tabs, ONLY on /account — the flow returns there first; logoutAction has no limiter), guest-hearts the SAME coat (the merge's cookie arrives here; order fixtures reference the coat but NO wishlist spec hearts it), captures the 48-hex token, dbRead-verifies the guest row (userId null, 1 item), logs in through the real form (?redirect=/wishlist, the pathname predicate), asserts the merge COMPLETED (the login lands — the dedupe branch did NOT crash), the coat's card renders exactly once (2 anchors per card — image + name; SUPPORTING), reload persists, the user's wishlist STILL holds EXACTLY 1 row for the coat (LOAD-BEARING), the cookie CLEARED post-login and the guest row GONE (the G-5 rule holds on the dedupe path); limiter arithmetic: the register bucket 8 < 10 (4 existing + F-EE 1/project + F-GG 1/project — ONE more register-per-project case fits before the shared "local" bucket saturates), the fresh email's per-email login key 1 of 10 · H-24: nothing canonical to clean (the `e2e-*@example.com` user is the wipe list's exact predicate; the merge deletes the guest row; the finally drops it by token on mid-case failure) · plan-probe discipline: `scripts/plan-probe-session36.cjs` (13/13) wire-verified every flow-step assumption BEFORE the spec against a throwaway DB copy (zero dev-DB writes) · mutation demo surgical: the per-item upsert replaced with an unconditional `create` → exactly the 2 F-GG case-runs fail (the webServer log shows P2002 through the auth seam; the login step's redirect never lands) while the F-EE merge case + all existing cases stay green (their flows take the CREATE branch, no overlap) |
| Admin event-write gate (session-37, F-HH) | `adminUpdateOrderAction`'s two `tx.orderEvent.create` calls (`src/lib/actions/admin.ts:55` status leg, `:78` tracking leg) — the admin.spec mutation case drives the real form but asserts only the toast + form values, and the F-DD gate pins the customer-side READ filter with a SQL-minted fixture: the action's WRITE side was never verified anywhere · the pinned class: a dropped mint leaves the toast green ("Order updated.") while both timelines silently go empty — the toast-blind silent class (only server-truth dbRead catches it) · gate: a NEW describe in `admin.spec.ts` (the OWNING spec), ONE case (two mutation legs), riding an OFFLINE-minted admin session — the a11y M-1/L-3 pattern at DESCRIBE scope: a random 256-bit token, HMAC'd with the shared `E2E_AUTH_SECRET`, a `Session` row inserted via `prisma db execute` INSERT…SELECT (the seeded admin's id resolved by the DB itself), deleted in afterAll — the exactly-consumed 10/10 admin login bucket untouched, ZERO logins; the case resolves ORD-2026-002 + its BASELINE event ids at RUNTIME via dbRead (never hardcode cuids), drives the real form (leg A: status `in_transit → processing` + Save; then `page.reload()` — the timeline check is SUPPORTING and the reload re-anchors the form on server truth so leg B submits only the tracking delta; leg B: a run-unique tracking value + Save), and asserts the rows minted BEYOND the baseline-id set — leg A: EXACTLY 1 `status_changed` row, `actor:'admin'` (the F-16 stamp), note `'<old> → <new>'`; legs A+B: EXACTLY 2 rows, leg B's `tracking_added` note joining carrier + tracking (the G-11 shape) · the baseline-id diff makes the assertions collision-proof against the seed's own `processing → in_transit` note; the finally restores the CAPTURED runtime state (status/carrier/tracking read at case start — immune to any earlier spec's side effects) and deletes exactly the minted rows (`NOT IN` the baseline ids); ORD-2026-002 is safe to mutate: the existing mutation case clicks the FIRST admin-orders link (placedAt desc → ORD-2026-004), F-DD mints-and-cleans its own fixture on 002 (no status assertion), F-FF reads 001/004 only, account-orders.spec.ts sorts BEFORE admin.spec.ts alphabetically, and global-setup wipes Order/OrderEvent/Session wholesale at every run start · mutation demo surgical: the status-leg `tx.orderEvent.create` dropped → exactly the 2 F-HH case-runs fail at `rows.length` (Expected 1 / Received 0 — the dbRead server-truth count is the load-bearing witness) while the toast-asserting mutation case + all other cases stay green (the toast CANNOT see the dropped write) · reusable pattern: the offline-admin-session describe is the NO-REGISTER/NO-LOGIN shape for any future admin-side pin |
| Password-rotation session-revocation gate (session-38, F-II) | `changePasswordAction`'s F-4 contract (`src/lib/actions/account.ts` — post-rotation `db.session.deleteMany({ userId, token: { not: keepToken } })`): the session table IS the denylist (ADR-006) and the rotation is the moment it gets exercised, yet NO spec ever drove the Settings-tab password form — the whole action had zero coverage, and F-4's own comment documents the hijack-survival bug as having SHIPPED (session-3) · the pinned class: a dropped `deleteMany` leaves the toast green ("Password changed.") while a hijacked session SURVIVES the rotation; an over-broad one logs the caller out mid-flow — both halves invisible to every gate · gate: a NEW describe in `auth.spec.ts` (the OWNING spec — the auth mutation surface's own; the spec count stays 18), ONE case riding the per-project storageState (the CURRENT session F-4 must keep) + the HIJACKED session minted OFFLINE — the a11y M-1/L-3 / F-HH pattern's first CUSTOMER-side use (random 256-bit token, `Session` row via `prisma db execute` INSERT…SELECT; the cookie never goes on the wire — the plan probe wire-verified the mint's validity end-to-end, 18/18) · assertions: the hijacked row GONE (LOAD-BEARING — the revoke half), the caller's session row STILL present BY TOKEN (parsed from the context's own cookie — the keep half; catches over-broad revocation), a fresh post-rotation /account render signed-in (the keep half, wire-real), the offline scrypt verification (the stored hash verifies the NEW password, no longer `Demo1234!` — the `verifyPassword` replication: `s1$salt$hex`, scrypt keylen 64, no login attempt) · the finally restores the captured passwordHash byte-identically, drops the minted row, and RESURRECTS any setup-session row the rotation lawfully revoked (insert-if-missing by the `.auth` cookie tokens — Playwright runs BOTH setup projects up-front so the other project's session row exists mid-run; the first draft's session-COUNT assertion was scheduling-dependent and replaced by the by-token assertion — the count is never the contract) · mutation demo surgical: the `deleteMany` dropped → exactly the 2 F-II case-runs fail at the hijacked-row assertion while all other cases stay green · reusable patterns: the customer-side offline-session mint (zero logins, zero registers — the register bucket stays 8 < 10), the resurrect-in-finally (the finally-restores-captured-state rule extended to session rows), and the offline scrypt hash verification (assert a stored credential WITHOUT burning a login attempt) |
| Profile-write gate (session-39, F-JJ) | `updateProfileAction`'s write contract (`src/lib/actions/account.ts:24` — `db.user.update({ where: { id: user.id }, data: { name: parsed.data.name } })`, the F-II sibling seam; the session-38 plan §8 #5 residual): the Profile tab's name form was driven by ZERO specs (the only name-value assertion in the whole suite was the logout case's READ of the prefilled value — `auth.spec.ts:79`) — the pinned class: a dropped (or no-op) write leaves the toast green ("Profile updated.") while the customer's name never changes — the toast-blind silent class on the last ungated seam of `account.ts` (cosmetic regression class, no security bearing) · gate: a NEW describe in `auth.spec.ts` (the OWNING spec — both `/account` mutation seams gated in it; the spec count stays 18), ONE case riding the per-project storageState with ZERO logins, ZERO registers, ZERO limiter consumption (`updateProfileAction` carries no limiter — re-verified by source read; only login/register/newsletter/checkout are rate-limited): captures james's runtime `name` via dbRead (never hardcoded — immune to any earlier spec's side effects; the logout case's `/Whitmore/i` prefill assertion sorts BEFORE the new describe in file order), drives the REAL form (Profile tab → `#profile-name` fill a run-unique name → Save Changes), and asserts the "Profile updated." status (SUPPORTING — the toast the mutation demo keeps green), the server-truth dbRead — the User row's name IS the new run-unique name (LOAD-BEARING — the write half; the toast CANNOT see it), the email UNCHANGED (the action writes name only), and a fresh /account render prefills `#profile-name` with the NEW name (the wire-real half — the write + `revalidatePath("/account")` + the RSC server prop) · the finally restores the CAPTURED name byte-identically (SQL-escaped UPDATE — SQLite doubles single quotes; runs even on mid-case failure; the seed's idempotent upsert re-pins the canonical name at every global-setup) · mutation demo surgical: the write swapped for a `findUniqueOrThrow` read (the exact dropped-write shape, the DTO still populated, the toast still green) → REBUILD → exactly the 2 F-JJ case-runs fail at the server-truth name assertion (Expected the new name / Received "James Whitmore") while all 14 other auth cases stay green → restored via inverse edit → rebuild → 16/16 green · harness lesson (NEW, measured first-hand): starting `next dev` over a stale PRODUCTION `.next/` (build-then-dev without wiping) puts the dev client into an INFINITE Fast-Refresh reload loop ("[Fast Refresh] rebuilding" on every HMR connect → full document navigation every ~300ms → interaction probes time out with "element was detached" loops); `rm -rf .next` before `npm run dev` after any build-heavy round — the standalone artifact was census- and E2E-green throughout (the product was never broken) |
| Logout row-revocation gate (session-40, F-KK) | `destroySession`'s ROW-REVOCATION half (`src/lib/auth.ts:105` — `db.session.deleteMany({ where: { token } })`): the existing logout case asserts only the wire half (redirect + the post-logout `/account` → `/login` bounce) and the bounce is driven by the COOKIE CLEAR ALONE — a dropped deleteMany leaves every existing assertion green while the Session row (the ADR-006 denylist) lingers up to ~30d and a cookie stolen BEFORE the logout survives it (the hijack-survival class F-4 documents at the password seam, at the logout seam instead) · gate: a NEW describe in `auth.spec.ts` (the OWNING spec — auth.ts's three mutation seams now each own a gate in it; the spec count stays 18), ONE case on an OFFLINE-MINTED session — the F-II hijack / F-HH admin / a11y M-1 family's second customer-side use (a random 256-bit token, the cookie signed `token.hmac` with the shared `E2E_AUTH_SECRET`, the row inserted via `prisma db execute` INSERT…SELECT with james's id resolved by the DB) — riding a DESCRIBE-SCOPED storageState carrying ONLY the minted cookie (the project's setup session never ridden, never destroyed — the H-24 trap): renders `/account` on the minted session (the mint's wire validity — SUPPORTING), clicks the REAL Sign out control, asserts the redirect (SUPPORTING), the server-truth dbRead — the minted row GONE (LOAD-BEARING — the revoke half; the wire CANNOT see this), the fresh `/account` bounce to `/login` + the cookie cleared (SUPPORTING — re-asserted so a both-halves-dropped regression fails visibly); ZERO logins, ZERO registers, ZERO limiter consumption (`logoutAction` carries no limiter); the afterAll belt-and-braces DELETE is a no-op on a healthy logout · mutation demo surgical: the deleteMany dropped → REBUILD → the existing logout case STAYED GREEN (the wire-blind gap's proof) while exactly the 2 F-KK case-runs failed at the row assertion (the row STILL present — the dbRead server-truth witness) → restored via inverse edit → rebuild → 18/18 green · harness lesson: the dev-shot script's cart row byproduct — clean the dev DB's cart rows after the screenshot set (an empty cart row is the natural login-merge byproduct; the item rows are the shot's artifact) |
| Low-stock KPI read gate (session-41, F-LL) | The admin dashboard's Low-Stock KPI + alert panel read (`src/app/(storefront)/admin/page.tsx:26,61,70-77` — the G-3 dedicated COUNT `db.product.count({ where: { isActive: true, stock: { lte: 3 } } })`): the canonical seed ships ALL 12 products at stock=12, so the surface renders its EMPTY state (KPI "0", panel hidden) on every run and NO assertion anywhere read it — the pinned class: the count swapped for the take-capped list length (the G-3 comment's own documented F-21 under-count shape — reads 20 once 21 products sit at the threshold), the `isActive` filter dropped, the threshold drifted (`lt: 3` → 0, `lte: 4` → over-count), the whole read dropped and hardcoded — every shape left every gate green before (the sibling H-2 take-cap seam on ORDERS got its injection gate in session-5; G-3 on products never did) · gate: a NEW describe in `admin.spec.ts` (the OWNING spec — the dashboard KPI's own; the file's uniques 7 → 8), ONE case on an OFFLINE-MINTED admin session (the F-HH pattern — random 256-bit token + HMAC cookie + Session row via `prisma db execute` INSERT…SELECT; the exactly-consumed 10/10 admin bucket untouched, ZERO logins); the fixture (beforeAll, SQL): 21 active pins at stock=3 (21 > the panel list's `take(20)` forces the count-vs-length divergence) + an INACTIVE sentinel at stock=3 (the filter half) + an active THRESHOLD sentinel at stock=4 (the boundary+1 half), categoryId by scalar subquery, `updatedAt` passed explicitly (@updatedAt has no DB default — the H-2 insert discipline); the case asserts the KPI card (the exact `getByText("Low Stock", { exact: true }).locator("..")` locator) reads EXACTLY 21 (LOAD-BEARING — the TRUE COUNT) + the alert panel's "3 or fewer remaining" copy and first pin name (SUPPORTING); the afterAll slug-prefix DELETE + session-row delete is the fixture's ONLY cleanup path (global-setup does NOT wipe Product — H-22/H-25 covers orders/carts/wishlists/sessions only; Playwright runs afterAll even on mid-case failure) and the describe sorts AFTER the dashboard test in file order (workers:1, fullyParallel:false — the serial topology that makes the injection window safe; the dashboard test's Products=12 assertion never sees the fixture) · mutation demo surgical: the dedicated COUNT dropped, the KPI rendered `lowStock.length` (the count→length swap must take its FULL shape — dropping only the render source hits TS6133 'declared but never read' and the build fails before the E2E can run) → REBUILD → the existing dashboard test STAYED GREEN (its KPI pins never read Low Stock) while exactly the 2 F-LL case-runs failed at the KPI assertion (Expected 21 / Received 20) → restored via inverse edit → rebuild → 18/18 green · harness lesson (NEW, measured first-hand): a mutation demo that strands an unused variable dies at the typecheck gate BEFORE the standalone is re-emitted — the failed build leaves no `.next/standalone/server.js` and the E2E webServer dies at MODULE_NOT_FOUND; take the mutation to its full dropped-read shape so the build stays green, and only then re-run the spec |
| Sale countdown seam | `src/lib/countdown.ts` + `src/components/store/sale-countdown.tsx` |
| Catalog source of truth | `src/lib/data/catalog.ts` (incl. HERO_SLIDES.align + BRAND_MARQUEE + COLOR_HEX) |
| Seed | `prisma/seed.ts` (`npm run db:setup`) |
| Tokens & fonts | `src/app/globals.css`, `public/fonts/` |
| Mobile nav v4 pin | `src/components/store/mobile-nav.tsx` + `tests/e2e/mobile-navigation.spec.ts` |
| Standalone assembly | `scripts/assemble-standalone.mjs` (part of `npm run build`) |
| Full gate | `npm run verify && npm run test:e2e` |

