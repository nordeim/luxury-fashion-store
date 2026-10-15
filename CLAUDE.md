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
| Framework | Next.js (App Router, Turbopack) | 16.4.0 |
| UI runtime | React | 19.3.0 |
| Language | TypeScript (strict) | 5.9.3 |
| Styling | Tailwind CSS (CSS-first `@theme`) | 4.3.3 |
| ORM / DB | Prisma + SQLite (single file) | 6.19.3 |
| Validation | Zod | 3.25.76 |
| Unit tests | Vitest (node env) | 3.2.7 |
| E2E | Playwright (standalone server) | 1.64.0 |
| Icons | lucide-react | 0.545.0 |

## Six-Phase Workflow

1. **Reproduce/read first** — for bugs, reproduce in the browser or a test before touching code. For features, read the nearest parity surface and the action seam you'll extend.
2. **Plan the seam** — decide which layer changes: page (RSC) → component → action (mutation) → validation → schema. Mutations ALWAYS go through `src/lib/actions/`.
3. **Implement minimal + typed** — strict TS; no `any`; DTOs flow server→client as props.
4. **Gate locally** — `npm run verify` (typecheck → lint → 113 unit tests → build), then `npm run test:e2e` (63 E2E cases × 2 device projects + 2 setup). All must pass before commit.
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
- **Vitest** (`src/lib/*.test.ts`, node env): pure seams only — money, db-path resolution, validation schemas (incl. `profileSchema`, `wishlistMutationSchema`, the `sizeAllowed` bag-size allowlist), rate limiter, search-params coercion, delivery windows, HMAC tokens, shared image/P2002/P2025 helpers, sweeper cutoffs, cart-adjust planner (`adjust-plan`), countdown formatter + countdown store (re-arm/cache).
- **Playwright** (`tests/e2e/*.spec.ts`): boots the production standalone on :3100 against `db/e2e.db` via `global-setup.ts`; `npm run build` must run first. Web server env uses an **absolute** `DATABASE_URL` (file tracing copies `prisma/schema.prisma` into the standalone bundle, which would re-anchor a relative URL to a nonexistent path).
- Auth: `setup-chromium` / `setup-mobile` projects each log in once → `tests/e2e/.auth/{chromium,mobile}.json`. Per-test logins would trip the 10/15min limiter.
- Shared seeded DB across specs → assert deltas or canonical floors, not absolute counts; the logout spec runs its OWN throwaway login (H-24) so the per-project canonical sessions survive the whole run, and specs that create shared-state rows (cart merge, injected orders) clean up after themselves. global-setup wipes ALL transient tables (carts/wishlists/sessions/orders) and re-seeds, so every run starts canonical (H-22/H-25). **The admin login bucket is exactly consumed (10 per IP+email across both projects — SKILL §9 #23): tests needing an admin-side state change use the `prisma db execute` SQL fixture pattern (H-2/H-39), never an extra login.**
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
npm run test:e2e      # 63 E2E cases × 2 device projects + 2 setup
```

## Escalation Rules

- Never weaken a parity pin, the Zod seam, or the money invariant to make a test pass — fix the product.
- Never add a client-side data fetch where an RSC prop or server action exists.
- Never introduce a second client-state mechanism besides `StoreProvider`.
- Schema changes require: `npm run db:push` + seed re-run + updated PAD data-model section in the same commit.
