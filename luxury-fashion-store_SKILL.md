---
name: luxury-fashion-store
description: "Engineering skill for the AURELIA (VELOUR) luxury-fashion e-commerce codebase — Next.js 16 App Router + React 19 + Tailwind v4 + Prisma/SQLite. Use when extending, debugging, onboarding, or replicating this storefront: server-action mutation seams, Tailwind v4 parity pins (hsl() literals, flex gap stacking), standalone-bundle assembly, schema-relative SQLite resolution, and the two-layer vitest/playwright test architecture."
version: 1.1.0
last_updated: 2026-10-14
tags: [nextjs, react19, tailwind-v4, prisma, sqlite, ecommerce, server-actions, playwright, vitest, design-parity]
project_state: "Production-ready. Gates: typecheck ✓ lint ✓ 82/82 unit (11 files) ✓ build ✓ E2E 100 passed + 2 skipped (50 unique cases × chromium+mobile, two desktop-only pins skip on mobile; + 2 setup projects). 13 Prisma models. Demo: james@example.com/Demo1234! (customer), admin@aurelia.com/Admin1234! (admin)."
reference_site: "pastel-aurelia-fashion-edit.base44.app — a visual-only prototype (inert commerce buttons). This repo is its functional superset with resting-state visual parity."
---

# luxury-fashion-store SKILL — AURELIA (VELOUR)

> Single source of truth for working in this codebase. Every fact below is verified
> against source at distillation time (v1.0.0). Companion docs: `AGENTS.md`
> (commands/env quick reference), `CLAUDE.md` (working standards),
> `Project_Architecture_Document.md` (deep architecture + ADRs),
> `docs/remediation-plan-session6.md` (latest remediation ledger).

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
- Hover-revealed commerce: product card action row (ADD TO BAG / eye / heart)
  appears on hover, exactly like the reference; product rows use FIXED 280px
  cards at desktop (not container-width fractions).

**Superset mission:** everything the reference fakes, this codebase really does —
full catalog, cart, guest+member checkout (card + COD), wishlist, customer accounts,
role-gated admin, working PLP/PDP (the reference's `/shop` 404s on itself).

## §2 Tech Stack & Environment

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.4.0 | `output: "standalone"` + manual asset assembly |
| UI runtime | React | 19.3.0 | React Compiler-era lint rules enforced |
| Language | TypeScript (strict) | 5.9.3 | `tsc --noEmit` gate |
| Styling | Tailwind CSS (CSS-first `@theme`) | 4.3.3 | v4 traps — see §9 #1–#2 |
| ORM / DB | Prisma + SQLite (single file) | 6.19.3 | 13 models, `db/custom.db` |
| Validation | Zod | 3.25.76 | every seam |
| Unit tests | Vitest (node env) | 3.2.7 | 82 tests in `src/lib/*.test.ts` (11 files) |
| E2E | Playwright (standalone server) | 1.64.0 | 50 unique cases × 2 device projects (+2 setup) |
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
  not-found.tsx
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
anchor + push transition), `cart-drawer`
(Radix-style sheet, focus-trapped), `search-overlay` (typeahead via
`/api/search`), `product-card`
(hover-revealed action row), `product-row` (fixed-width scroll rows), `category-edit`,
`exclusive-deals`, `styled-by-you`, `quick-view-modal` (focus-trapped),
`shop-client` (PLP filters + URL sync), `product-detail` (PDP gallery/chips/stepper),
`cart-page-client`, `wishlist-client`, `storefront-home` (13-section home), `footer`,
`newsletter`.

`src/components/ui/`: local shadcn-style primitives (button, input, sheet, dialog,
dropdown-menu, select, …) — Radix underneath, tokens from §4.

`src/lib/` also carries two plain-DOM/server utilities that are NOT hooks:
`focus-trap.ts` (`installFocusTrap` — the dialog focus contract for the
hand-rolled drawer/modals, H-26) and `sweeper.ts` (`buildSweepPlan` pure +
`runSweep` executor — expired sessions / idle guest carts, K-1, wired in
`src/instrumentation.ts` at boot + hourly).

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

Known gaps (roadmap, not regressions): no skip-to-content link yet; no
`prefers-reduced-motion` guards on the hero carousel.

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
    Ritual: **build → then E2E**, always (§11).
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

## §10 Debugging Guide (symptom → cause → fix)

| Symptom | Root cause | Fix |
|---|---|---|
| Dev overlay "This page couldn't load", log shows SQLite 1032 readonly on `db.cart.create` | Stale dev process vs reseeded DB (inode replaced) | Kill server, `rm -f db/custom.db-journal db/custom.db-wal db/custom.db-shm`, restart with `env -u DATABASE_URL`; in sandboxed shells double-fork: `(setsid … > log 2>&1 < /dev/null &)` |
| SSR HTML perfect but **nothing responds to clicks** | Chunks 404 — standalone lacks client assets | `npm run build` (runs `assemble-standalone.mjs`); verify `.next/standalone/.next/static` exists |
| E2E global-setup: "Cannot use import statement outside a module" / `import.meta` error | TS compiled as CJS | Use `process.cwd()`-based paths in `tests/e2e/global-setup.ts`, `auth.setup.ts` |
| Every COD checkout fails validation; card checkout can't pass Luhn | `FormData.get()` → `null` vs `optional()`; DOM-held wizard state | `?? undefined` coercion at the action seam; keep card fields in React state |
| E2E: auth passes in one spec, later specs see "Sign in" header | Logout spec destroyed the shared server-side session | Per-project `storageState` files; specs needing logged-out surfaces opt out explicitly |
| E2E webServer: Prisma can't open DB | Relative URL re-anchored inside standalone | Absolute `file:` path in webServer env (pass-through in `db-path.ts`) |
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
| Drawer/modal keyboard users Tab into the page behind | Hand-rolled dialogs never moved focus or trapped Tab (H-26) | `installFocusTrap` in the surface's open-effect (`src/lib/focus-trap.ts`) — keep it on every new hand-rolled dialog |
| E2E fails only on the SECOND run; drawer/cart specs see extra lines | Cross-run residue: the seed never deletes (§ session-5 H-22) | `global-setup` wipes carts/wishlists/sessions — keep it |
| E2E drawer specs see TWO lines with one add (session-6, mid-run) | Within-run residue: the merge test left its line; fixed by cleaning up after itself + wiping ALL orders at setup (H-24/H-25) | `global-setup` order wipe + re-seed; specs that mutate shared state clean up |

## §11 Pre-Ship Checklist

```bash
npm run verify                      # typecheck → lint → 82 unit → build (+ assemble)
npm run test:e2e                    # 50 cases × 2 projects (+2 setup; build FIRST — §9 #16)
curl -sI localhost:3000/ | grep -i content-security   # CSP present (no unsafe-eval in prod)

# Parity pins
rg -n "space-y-" src/components/store || echo "OK: no space-y on parity surfaces"
rg -n "hsl\(" src/app/globals.css | rg -v "hsl\(" && echo "BARE HSL FOUND" || echo "OK: all tokens are hsl() literals"
ls .next/standalone/.next/static >/dev/null && echo "OK: standalone assets assembled"

# Contract pins
git ls-files .env.example | grep -q . && echo "OK: .env.example tracked"
rg -n "DATABASE_URL" .env .env.example   # both file:../db/custom.db

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
10. **The reference MOVES — re-measure everything, every session.** Session 5's
    sweep found the hero's per-slide left/right anchoring and the brand marquee
    had drifted (or been mis-recon'd) since session 1, while session 4's own
    screenshot already showed it — because that sweep only re-measured the
    mobile menu. Session 6's sweep, hours later the same day, caught slide 3
    re-anchoring from right to CENTER — the reference can change at HOUR
    granularity. Doctrine: capture fresh computed styles on every parity
    surface you touch, never trust the previous session's baseline (or even
    this morning's), and pin what you measure into E2E so the next drift is a
    red test, not a surprise.

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
| Latest remediation ledger | `docs/remediation-plan-session6.md` |
| Session history | `docs/session_1.md` … `session_5.md`, `worklog.md` |
| Parity screenshots | `docs/screenshots/` |
| Mutation seam | `src/lib/actions/*.ts` |
| Envelope | `src/lib/action-result.ts` |
| DTO contract (pure) | `src/lib/cart-dto.ts` |
| DB resolver (do not simplify) | `src/lib/db-path.ts` |
| searchParams coercion | `src/lib/search-params.ts` (firstParam — every consumer) |
| Dialog focus contract | `src/lib/focus-trap.ts` (installFocusTrap — every hand-rolled dialog) |
| Transient sweeper | `src/lib/sweeper.ts` (+ `src/instrumentation.ts` wiring) |
| Catalog source of truth | `src/lib/data/catalog.ts` (incl. HERO_SLIDES.align + BRAND_MARQUEE) |
| Seed | `prisma/seed.ts` (`npm run db:setup`) |
| Tokens & fonts | `src/app/globals.css`, `public/fonts/` |
| Mobile nav v4 pin | `src/components/store/mobile-nav.tsx` + `tests/e2e/mobile-navigation.spec.ts` |
| Standalone assembly | `scripts/assemble-standalone.mjs` (part of `npm run build`) |
| Full gate | `npm run verify && npm run test:e2e` |

