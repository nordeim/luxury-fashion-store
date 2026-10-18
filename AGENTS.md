# AGENTS.md — AURELIA (VELOUR)

Production luxury-fashion e-commerce storefront + admin console: **Next.js 16.4 (App Router) · React 19.3 · TypeScript strict · Tailwind CSS 4 (CSS-first) · Prisma 6 / SQLite · custom scrypt auth**. A functional superset of the reference prototype `pastel-aurelia-fashion-edit.base44.app` with resting-state visual parity.

## Commands

| Task | Command |
|---|---|
| Install | `npm install` |
| Dev server | `npm run dev` (port 3000, turbopack) |
| Production build | `npm run build` (also assembles the standalone bundle) |
| Start standalone | `PORT=3100 node .next/standalone/server.js` |
| Typecheck | `npm run typecheck` (must exit 0) |
| Lint | `npm run lint` (eslint 9 flat config) |
| Unit tests | `npm run test` (Vitest, node env) |
| Single unit file | `npx vitest run src/lib/money.test.ts` |
| E2E (**requires build first**) | `npm run test:e2e` (boots the standalone on :3100 vs `db/e2e.db`; 135 cases × 2 device projects) |
| Single E2E spec | `npx playwright test tests/e2e/mobile-navigation.spec.ts` |
| Push schema | `npm run db:push` |
| Seed | `npm run db:seed` |
| Schema + seed | `npm run db:setup` |
| Full pre-push gate | `npm run verify` (typecheck → lint → unit → build), then `npm run test:e2e` |

## Environment & database contract

- `.env` pins `DATABASE_URL="file:../db/custom.db"` — **schema-relative** (Prisma CLI resolves it against `prisma/`, landing at `<repoRoot>/db/custom.db`). `db/` is git-ignored; `db/custom.db` is materialized by `npm run db:setup`.
- `src/lib/db-path.ts` reproduces the CLI resolution rule and is pinned by `tests` via `src/lib/db-path.test.ts`. **Do not simplify.**
- `src/lib/db.ts` re-anchors the URL through that resolver before constructing the client.
- **Absolute `file:` URLs pass through the resolver untouched** — the E2E webServer deliberately uses an absolute path because `output: "standalone"` copies `prisma/schema.prisma` into `.next/standalone` (file tracing sees `db-path`'s `existsSync` reads), which would otherwise re-anchor the relative URL to a nonexistent `<standalone>/db/` path.
- **Sandbox quirk:** some CI shells export a parent-workspace `DATABASE_URL` that overrides `.env`. Run DB/dev commands as `env -u DATABASE_URL <cmd>` when the database lands in the wrong place.
- `AUTH_SECRET` — session-cookie HMAC; any 32-byte random string for dev.
- `NEXT_PUBLIC_SITE_URL` — canonical/og:url fallback + sitemap origin.

## Architecture rules (binding)

1. **Server actions are the only mutation seam.** All writes go through `src/lib/actions/*.ts` ("use server"). No client-side optimistic math — responses carry server-derived DTOs and the client store re-syncs from them. No REST mutation API.
2. **Money is integer cents everywhere** (`src/lib/money.ts`); formatting happens only at display time. Totals are re-derived server-side from DB rows — never trusted from the client.
3. **One client state seam.** `StoreProvider` (single context) holds cart/user/wishlist + UI overlays. Server truth flows in as props and re-syncs via the **adjust-state-during-render** pattern (no setState-in-effect — React Compiler / `react-hooks` lint enforces this).
4. **DTO contract split:** client components import types/constants from `src/lib/cart-dto.ts` (pure). `src/lib/cart.ts` is server-only (`next/headers` + Prisma) and re-exports them. Importing server modules from client components fails the Turbopack build.
5. **Validation at every seam** with Zod (`src/lib/validation.ts`). Beware: `FormData.get()` returns `null` for absent keys — `z.string().optional()` rejects `null`; coerce with `?? undefined` at the seam (see `placeOrderAction`).
6. **Routes are force-dynamic** (per-request RSC). Do not add caching without revisiting the checkout redirect race (see `placeOrderAction`'s "no revalidatePath" note).

## Tailwind CSS v4 pins (parity-critical)

- Theme tokens are **full `hsl(...)` literals** in `@theme inline` inside `globals.css` — bare HSL triplets (the v3 style the reference used) resolve to transparent in v4.
- The mobile nav stacks with **`flex flex-col gap-5`** — never `space-y-*` (v4's selector rewrite changes row geometry). Geometry is pinned by `tests/e2e/mobile-navigation.spec.ts` (bounding-box gap assertions).
- Fonts are self-hosted `@font-face` (Cormorant Garamond 300–600 + Montserrat 200–700 in `public/fonts/`), classes `font-cormorant` / `font-montserrat`.

## Testing quirks

- **Playwright boots the production standalone** (`npm run build` first, always) on :3100 against `db/e2e.db` (schema-pushed + seeded by `tests/e2e/global-setup.ts`). Unit tests never touch E2E specs (vitest matches `*.test.ts`, playwright matches `tests/e2e/*.spec.ts`).
- **Per-project auth:** `setup-chromium` and `setup-mobile` projects each sign in once and save `tests/e2e/.auth/{chromium,mobile}.json`. A single shared session is a trap: the logout spec destroys the server-side session row and silently logs out every later spec. Specs that need a logged-out surface opt out with an empty storageState.
- Auth endpoints are rate-limited (10 attempts/IP/15 min) — never log in per-test.
- Specs share one seeded DB: write assertions against **deltas/UI-visible reality**, not absolute counts.
- Demo accounts (also shown on /login): `james@example.com` / `Demo1234!` (customer), `admin@aurelia.com` / `Admin1234!` (admin).

## Build & deploy

- `next build` emits the standalone server, then `scripts/assemble-standalone.mjs` copies `.next/static` + `public/` into `.next/standalone/` — the step the Next.js docs require and the build does NOT do. Skipping it yields SSR-perfect pages whose chunks 404 (zero hydration — every click inert).
- Security headers (Referrer-Policy, X-Content-Type-Options/nosniff, HSTS, X-Frame-Options: DENY, Permissions-Policy, COOP — the full six-header inventory) ship from `next.config.ts` `/:path*` and are wire-pinned by `security-csp.spec.ts` (F-AA); session-31 (F-BB) extends the same gate over the cookie-security contract: the three identity cookies (`aurelia_session`/`aurelia_cart`/`aurelia_wishlist`) pin their hardened browser-enforced flags — HttpOnly + SameSite=Lax + Secure + Path=/ + ~30d persistence + the declared token shapes — across the real cart/wishlist/session minting flows; session-32 (F-CC) extends `cart-checkout.spec.ts` over the guest order-view capability contract: the confirmation's `?order=N&t=<hmac>` pair serves with the PII it protects, and absent/wrong/cross-order/unknown variants all 404 with no existence leak and no PII leakage; session-33 (F-DD) pins the account order-detail surface's owner IDOR gate (the canonical guest order 404s with no existence leak) and its F-16 privacy filter (admin-authored timeline events never reach the customer body); session-34 (F-EE) pins both auth doors of the guest wishlist merge over the wire (the merged item persists a reload, the cookie clears post-login, the guest row is deleted — with james/admin login buckets untouched); session-35 (F-FF) pins the session-bearing rows of the /checkout/success capability gate (a signed-in owner reaches their own confirmation without a token and ONLY it — guest orders 404 under a bare session, a valid token serves regardless of session state — zero logins on james's storageState); session-36 (F-GG) pins the guest wishlist merge's DEDUPE half (a login whose guest piece is already on the user's list completes the merge without duplicating — server-truth row count == 1, the cookie clears, the guest row is deleted; the P2002 crash class that would break the login door is pinned — zero canonical logins); session-37 (F-HH) pins the admin mutation action's event-write path (a status transition mints exactly one `status_changed` OrderEvent row with the F-16 admin stamp and the `<old> → <new>` note, a tracking change exactly one `tracking_added` row with the G-11 joined carrier note — asserted by server-truth dbRead beyond a baseline-id diff on an offline-minted admin session, zero logins; a dropped mint leaves the toast green while both timelines silently go empty — the pinned silent class); session-38 (F-II) pins the password rotation's F-4 session-revocation contract (a rotation revokes every OTHER session — the session table IS the denylist — while keeping the caller's own: an offline-minted second session for the same user is revoked server-truth, the caller's session survives by token and on the wire, and the stored hash verifies the NEW password by offline scrypt; zero logins, zero registers — the resurrect-in-finally pattern restores any lawfully-revoked setup-session rows for the later project); session-39 (F-JJ) pins the profile save's write contract (the F-II sibling seam: the User row's name IS the submitted value — server-truth dbRead the toast cannot see, the email untouched, a fresh render prefills the new name; zero logins, zero registers — the finally restores the captured name byte-identically; both `/account` mutation seams now gated); session-40 (F-KK) pins the logout's ROW-REVOCATION contract (destroySession's `db.session.deleteMany` — the cookie-clear half alone keeps every URL-level logout assertion green, the mutation demo's proof; the row — the ADR-006 denylist — must be GONE after the real Sign out click, a pre-logout stolen cookie must not survive the logout; pinned on an offline-minted session riding a minted-cookie storageState, zero logins, zero registers, zero limiter consumption — auth.ts's three mutation seams each own a gate in auth.spec.ts); the CSP is minted per-request with a nonce by `src/proxy.ts` (production `script-src 'self' 'nonce-…'` — no `unsafe-inline`; directives unit-pinned in `src/lib/csp.ts`, E2E-gated by `tests/e2e/security-csp.spec.ts`; dev keeps the React-runtime `unsafe-eval` escape hatch).
