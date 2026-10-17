# CLAUDE.md — AURELIA (VELOUR)

Guidance for Claude Code working in this repository. Read alongside `AGENTS.md`
(commands/env quick reference), `Project_Architecture_Document.md` (deep architecture + ADRs), and
`luxury-fashion-store_SKILL.md` (the distilled 20-section engineering skill: trap log, debugging
guide, patterns, and quick reference card).

## Project Identity

A production-grade luxury fashion e-commerce storefront and admin console — a **functional superset** of the reference prototype (`pastel-aurelia-fashion-edit.base44.app`, a visual-only React prototype with inert commerce buttons) with **resting-state visual parity**. Built on the `ecommerce-store` architecture model: Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4 (CSS-first), Prisma 6/SQLite, Zod-validated server actions, custom scrypt+session auth.

**Parity law:** on every parity surface (announcement bar, header, hero, product card, mobile nav, cart drawer, search overlay, footer, login/register cards), the *resting* visual output must match the reference's measured geometry and typography. Functional additions (working PLP/PDP/checkout/admin) may extend, never restyle, those surfaces.

## Tech Stack (pinned)

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.4.2 |
| UI runtime | React | 19.3.1 |
| Language | TypeScript (strict) | 5.9.3 |
| Styling | Tailwind CSS (CSS-first `@theme`) | 4.3.3 |
| ORM / DB | Prisma + SQLite (single file) | 6.19.3 |
| Validation | Zod | 3.25.76 |
| Unit tests | Vitest (node env) | 3.2.7 |
| E2E | Playwright (standalone server) | 1.64.1 |
| Icons | lucide-react | 0.545.0 |

## Six-Phase Workflow

1. **Reproduce/read first** — for bugs, reproduce in the browser or a test before touching code. For features, read the nearest parity surface and the action seam you'll extend.
2. **Plan the seam** — decide which layer changes: page (RSC) → component → action (mutation) → validation → schema. Mutations ALWAYS go through `src/lib/actions/`.
3. **Implement minimal + typed** — strict TS; no `any`; DTOs flow server→client as props.
4. **Gate locally** — `npm run verify` (typecheck → lint → 173 unit tests → build), then `npm run test:e2e` (130 E2E cases × 2 device projects + 2 setup — includes the automated axe a11y gate across logged-out, logged-in, AND admin surfaces, the CSP/JSON-LD security gate — plus the F-AA static-transport-headers pin: the six next.config.ts security headers at exact values on three route classes, plus the F-BB cookie-security pin: the three identity cookies' hardened browser-enforced flags (HttpOnly + SameSite=Lax + Secure + Path=/ + ~30d) across the cart/wishlist/session minting flows, the action-seam security gate — crafted server-action POSTs over the wire — the SEO metadata gate, the failure-surfaces gate: the 404 card + the RSC-fallback hard-navigation contract, the API-contract gate: the three REST route handlers pinned over the wire — the health liveness envelope, the typeahead DTO/degradation/clamp, the idempotent newsletter upsert + Zod 400s, the 405 method matrix, the checkout capability gate (F-CC): the guest confirmation's HMAC view-token contract driven end-to-end — the minted `?order=&t=` pair serves with the PII it protects, and absent/wrong/cross-order/unknown variants all 404 with no existence leak and no PII leakage — the account order-detail gate (F-DD): the surface's owner IDOR gate (a foreign/guest order 404s with no existence leak) and its F-16 privacy filter (admin-authored timeline events never reach the customer body) — the guest wishlist-merge gate (F-EE): both auth doors of `mergeGuestWishlistIntoUser` on the wire (register no-op + login merge with a run-unique user — james/admin buckets untouched), the merged item persisting a reload, the cookie cleared post-login, the guest row deleted — the success-gate owner-capability gate (F-FF): the session-bearing half of the /checkout/success capability matrix direct-fetched on james's storageState (owner+own order+no token → 200 with the PII it protects; signed-in+guest order+no token → 404 with no leak; signed-in+guest order+its own valid token → 200 — the token path session-orthogonal; zero logins), and the brand-metadata gate: the swan mark over the wire, the og share cards, the manifest body, the immutable font cache, the store-root WebSite/Organization JSON-LD with nonce-carrying data blocks, the first-paint font preloads and their referenced font files, the theme-color tint, the security.txt contract, the auth-page identity + breadcrumb graphs, the canonical links, the product-price metas, the PDP's site-level OG identity surviving its own openGraph override, and every referenced brand asset actually serving over the wire — the manifest icons, the Organization logo, the apple icon, the share card). All must pass before commit.
5. **Verify in the browser** — dev server + `agent-browser` for visual/behavioral checks; screenshots for parity surfaces live in `docs/screenshots/`.
6. **Document drift** — if you changed a pinned contract (env, db path, parity pins, test strategy), update `AGENTS.md` + the PAD in the same commit.

## Non-Negotiable Implementation Standards

### Mutations (server actions)
- `"use server"` modules may only export async functions; shared types live in plain modules beside them (e.g. `src/lib/actions/checkout-types.ts`).
- Every action: Zod-parse input → authz check (`getCurrentUser` / `isAdmin`) → transactional DB write → return `ActionResult<T>` (`src/lib/action-result.ts` envelope: `{ ok, data | error: { message, fieldErrors? } }`).
- Rate-limit unauthenticated write seams (`src/lib/rate-limit.ts`) — login/register/newsletter/checkout all do.
- Cart/wishlist rows are keyed by a 192-bit random `token` (unique) — user-owned rows mint tokens on create too; guest→user merge happens at login (`mergeGuestCartIntoUser`).
- Guest order confirmations ride an HMAC view token (`src/lib/order-token.ts`) — sequential order numbers are not capability tokens.

### React 19 / Next.js 16 client code
- **No `setState` inside effects** — `react-hooks/set-state-in-effect` is an error here. Use adjust-state-during-render (last-seen-props pattern, see `StoreProvider`) or derived state (see `SearchOverlay.visibleHits`).
- Async action fns from `useActionState` must dispatch inside `startTransition` when called programmatically (see `CheckoutFlow.submit`).
- `FormData.get()` returns `null` for absent keys → coerce `?? undefined` before Zod `optional()` (absent card fields broke every COD order once).
- Values needed across wizard steps must live in React state, not the DOM (step-2 review unmounts step-1 inputs).

### Tailwind v4 (CSS-first)
- All theme tokens are full `hsl(...)` literals in `@theme inline` (`src/app/globals.css`) — bare HSL triplets render transparent in v4.
- Vertical stacks use `flex flex-col gap-*`; **never `space-y-*`** for parity surfaces (v4 selector rewrite changes geometry). Pinned by E2E bounding-box assertions.
- Self-hosted fonts via `@font-face` in `globals.css` from `public/fonts/` — no Google Fonts network dependency.

### Database
- Schema-relative URL contract: `DATABASE_URL="file:../db/custom.db"` → `<repoRoot>/db/custom.db`. Resolution rule in `src/lib/db-path.ts` (pinned by unit tests; do not simplify).
- Money columns are integer cents. SQLite has no enums — statuses are strings Zod-validated at every seam.
- Seed (`prisma/seed.ts`) is deterministic (fixed scrypt salts) and idempotent (upserts): 4 categories, 12 products (catalog = array order = `sortOrder`), 2 users, 4 canonical orders.

### Testing strategy
- **Vitest** (`src/lib/*.test.ts` + `tests/unit/*.test.ts`, node env): pure seams only — money, db-path resolution, validation schemas (incl. `profileSchema`, `wishlistMutationSchema`, the `sizeAllowed` bag-size allowlist), rate limiter, search-params coercion, delivery windows, HMAC tokens, shared image/P2002/P2025 helpers, sweeper cutoffs, cart-adjust planner (`adjust-plan`), countdown formatter + countdown store (re-arm/cache), the CSP directive builder (`csp` — N-1: nonce-only prod script-src; session-25 `extractNonce` — the request-nonce source step for hand-rendered data blocks), the Product JSON-LD builder + its HTML-safe serializer (`structured-data` — F-B/F-D: `productJsonLd` + `serializeJsonLd`; session-25 `storeRootJsonLd` — the reference-measured WebSite + Organization graphs; session-26 `breadcrumbJsonLd` — the measured BreadcrumbList shape with 1-based positions and absolutized items), the SEO metadata contract (`sitemap` — F-H: `siteOrigin` default-origin fallback + normalization, active-only sitemap entries, the exact robots allow/disallow set), the sweeper's boot-race classifier (`sweeper` — F-J: `isSchemaNotReady` recognizes the P2021 shape and nothing else), the PWA installability contract (`manifest` — F-L: `buildManifest`, origin-independent, static route, self-hosted icons), plus the sweep-tool primitives contract (`tests/unit/sweep-lib.test.ts` — H-71: waitHealth's F3/G-2 deadline contract is permanently pinned).
- **Playwright** (`tests/e2e/*.spec.ts`): boots the production standalone on :3100 against `db/e2e.db` via `global-setup.ts`; `npm run build` must run first. Web server env uses an **absolute** `DATABASE_URL` (file tracing copies `prisma/schema.prisma` into the standalone bundle, which would re-anchor a relative URL to a nonexistent path).
- **Accessibility gate (K-1 + L-1 + M-1):** `accessibility-axe.spec.ts` runs axe-core on FOURTEEN surfaces at both projects, asserting ZERO WCAG 2.0/2.1 A+AA violations; `color-contrast` is excluded by the parity law (the reference's own measured palette fails the same rule). Logged-out surfaces (home/shop/PDP/cart/login/register/wishlist) use an empty storageState; logged-in surfaces (account; wishlist with one heart; cart with one line — both self-cleaning fixtures) reuse the per-project storageState; admin surfaces (dashboard/products/orders/order-detail) mint their session OFFLINE — a `Session` row inserted via `prisma db execute` (the H-2 pattern, F-A token-derived id) plus a cookie HMAC'd with the shared `E2E_AUTH_SECRET` (`tests/e2e/e2e-secrets.ts`, also imported by playwright.config.ts). The context opts out with `bypassCSP` — the injected axe script is harness code, not app code. Zero login-budget consumption either way.
- **Security CSP gate (N-1 + F-B):** `security-csp.spec.ts` pins the per-request nonce CSP — production `script-src 'self' 'nonce-…'` with NO `unsafe-inline`/`unsafe-eval` (minted by `src/proxy.ts`, directives unit-pinned in `src/lib/csp.ts`), the nonce reaching EVERY inline script **in the served bytes** (browsers hide `getAttribute("nonce")` — trap #33), hydration + clean console under the policy, and the PDP's schema.org Product JSON-LD data block (non-executing, CSP-exempt). Since session-30 it also pins the six static transport headers at exact values on three route classes (F-AA), and since session-31 the cookie-security contract (F-BB): the three identity cookies' hardened browser-enforced flags (HttpOnly + SameSite=Lax + Secure + Path=/ + ~30d persistence + the declared token shapes) asserted from `context.cookies()` across the real cart/wishlist/session minting flows, with the minted rows SQL-cleaned in afterAll (H-24).
- **Checkout capability gate (F-CC):** `cart-checkout.spec.ts` (session-32) drives the real guest COD flow in a fresh logged-out context, captures the minted `?order=&t=` pair from the success URL, and direct-fetches the capability matrix — the captured pair serves 200 with the PII it protects (order number + guest email); absent token, flipped-char token, a VALID token minted for a DIFFERENT order (computed offline with the shared `E2E_AUTH_SECRET`, the `e2e-secrets.ts` constant — one checkout-bucket slot saved, no second wizard round-trip), and an unknown order with its own valid token all 404 into the platform not-found card, leaking no guest email. Limiter budget documented in the spec: 2 existing + 1 = 3 per project, 6 < 10 per run.
- **Account order-detail gate (F-DD):** `account-orders.spec.ts` (session-33) — the surface's first owner, TWO cases riding james's per-project storageState (ZERO logins, zero limiter budget): the F-16 privacy filter (a SQL-minted `actor:"admin"` OrderEvent — the H-2 fixture pattern — never reaches the customer body while the seed's system events stay visible; the fixture row self-cleans in a try/finally) and the owner IDOR gate (the canonical GUEST order ORD-2026-004, `userId: null`, 404s into the not-found card with no existence leak). The admin mutation itself is wire-exercised by `admin.spec.ts`; what was never asserted is the event minting's customer-side visibility — the read side this spec pins.
- **Guest wishlist-merge gate (F-EE):** `wishlist.spec.ts` (session-34) — ONE case entering through BOTH auth doors of `mergeGuestWishlistIntoUser` WITHOUT logging james or admin in: the james login bucket is EXACTLY consumed at 10/10 per run (2 setup + 2 cart-merge + 2 wrong-password + 2 logout-throwaway + 2 security-csp; rateLimit() consumes on CALL so the wrong-password counts), so the case registers a run-unique user (the register bucket: 6 < 10), signs out, guest-hearts `wide-brim-felt-hat`, then logs in as THAT user (its email is a fresh per-email limiter key) — asserting the merged item persists a reload (server truth), the `aurelia_wishlist` cookie cleared post-login (the G-5 visible half), and the guest row deleted by its captured token (the cleanup half); H-24: nothing to clean (run-scoped rows only).
- **Success-gate owner-capability gate (F-FF):** `cart-checkout.spec.ts` (session-35) — ONE case riding james's per-project storageState (ZERO logins, zero limiter budget) direct-fetching the SESSION-BEARING rows of the /checkout/success capability gate that the F-CC matrix (logged-out guest rows) never touches: owner+own order+NO token → 200 with the order number + the owner's email (the DIRECT owner capability); signed-in+the canonical guest order+NO token → 404 into the not-found card with no guest-email leak (the mismatch half via `order.userId === null !== user.id`); signed-in+guest order+its own VALID offline token → 200 (the token path is session-ORTHOGONAL — a gate "tightened" to require logged-out would break shared confirmation links); the cross-order negative holds under a session too. All rows read CANONICAL seed data (ORD-2026-001 james / ORD-2026-004 guest) — no SQL fixtures, nothing to clean (H-24); the foreign-owner row stays covered-by-shape (`===` has no null special-case).
- Auth: `setup-chromium` / `setup-mobile` projects each log in once → `tests/e2e/.auth/{chromium,mobile}.json`. Per-test logins would trip the 10/15min limiter.
- Shared seeded DB across specs → assert deltas or canonical floors, not absolute counts; the logout spec runs its OWN throwaway login (H-24) so the per-project canonical sessions survive the whole run, and specs that create shared-state rows (cart merge, injected orders) clean up after themselves. global-setup wipes ALL transient tables (carts/wishlists/sessions/orders) and re-seeds, so every run starts canonical (H-22/H-25). **The admin login bucket is exactly consumed (10 per IP+email across both projects — SKILL §9 #23), and since session-34 so is the james customer bucket (measured 10/10: 2 setup + 2 cart-merge + 2 wrong-password + 2 logout-throwaway + 2 security-csp): tests needing an admin-side state change use the `prisma db execute` SQL fixture pattern (H-2/H-39); new auth-flow tests register a run-unique user and log in as THAT user (the F-EE shape), never an extra james/admin login.**
- `scripts/assemble-standalone.mjs` runs as part of `npm run build` — without it the standalone serves SSR HTML with 404 chunks (zero hydration). Never remove it.

## Environment Variables

| Var | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Schema-relative SQLite URL (`file:../db/custom.db`) |
| `AUTH_SECRET` | yes (prod) | Session-cookie HMAC secret |
| `NEXT_PUBLIC_SITE_URL` | optional | Canonical/og:url + sitemap origin (default `http://localhost:3000`) |

## Commands

See the command table in `AGENTS.md`. The pre-commit gate is exactly:

```bash
npm run verify        # typecheck → lint → unit → build
npm run test:e2e      # 130 E2E cases × 2 device projects + 2 setup
```

## Escalation Rules

- Never weaken a parity pin, the Zod seam, or the money invariant to make a test pass — fix the product.
- Never add a client-side data fetch where an RSC prop or server action exists.
- Never introduce a second client-state mechanism besides `StoreProvider`.
- Schema changes require: `npm run db:push` + seed re-run + updated PAD data-model section in the same commit.
