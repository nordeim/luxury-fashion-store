# Remediation Plan — Session 3 (AURELIA / VELOUR clone)

> **Status:** EXECUTED — all P0/P1 items fixed with tests; P2 hygiene completed; accepted
> tradeoffs documented. **Mode:** Audit-first (Mode C) → agreed fixes (Mode A/B, TDD).
> **Scope:** fresh-clone re-validation, a full 12-category code audit of the application
> tree (the "recent code changes" = the `8c675a7` transformation; sessions 2+3 were
> docs-only until these fixes), and remediation of the verified findings.

---

## 1. Starting State (fresh clone, evidence-backed)

Workspace was reset; cloned `nordeim/luxury-fashion-store` at `8972c6d` (two user
commits on top of session 2's `2006219`: `e9635ec` session_2.md transcript,
`8972c6d` prompts + ssh scripts — **docs-only deltas, no product code changed**).

| Gate | Result |
|---|---|
| `npm install` + `.env` from `.env.example` + `db:setup` | ✅ 4 categories / 12 products / 2 users / 4 orders |
| typecheck / lint / unit | ✅ / ✅ / 52/52 |
| build (standalone + assemble) | ✅ 19 routes |
| E2E | ✅ 64/64 — **after** `npx playwright install chromium` (fresh sandbox lacked browser binaries — environment bootstrap, not a code bug) |
| `.env` / `.env.example` | ✅ `DATABASE_URL="file:../db/custom.db"` schema-relative; `.env.example` tracked |

## 2. Audit Method

Skills used (per `skills/skills-catalog.md`): **code-review-checklist** (tactical
12-category scan), **security-and-hardening** (OWASP tiers, authn/authz/input/data),
**code-quality-standards** (six-axis reference), plus the repo's own pins
(`AGENTS.md`, `luxury-fashion-store_SKILL.md` §9/§13). Every 🔴/🟡 finding was
re-verified by reading the cited code before being accepted into this plan.

**Clean bills of health (verified, no findings):** authorization/IDOR (every admin
action re-checks role; every user-scoped query checks ownership; guest order views
are HMAC-gated), XSS (zero `dangerouslySetInnerHTML`, all strings via React
interpolation), SQL injection (no raw queries), money integrity (integer cents,
server-side re-derivation inside the checkout transaction with an oversell guard).

## 3. Findings → Remediation

### P0 — security/integrity (all fixed)

| ID | Finding (verified) | Remediation |
|---|---|---|
| F-1 🔴 | `order-token.ts` HMAC secret falls back to a public constant with **no production guard**. Chain: no cookie → `getCurrentUser()` returns early → strict `authSecret()` never runs → site boots without `AUTH_SECRET` → guest-order view tokens are HMAC'd with a known constant + sequential order numbers → **anyone can read strangers' orders** (name/address/email/purchases). | Reuse the strict `authSecret()` (throws in production) from `auth.ts`; verify with `timingSafeEqual`; add **`src/instrumentation.ts`** boot-time env guard so a misconfigured production deploy fails at startup, not at first session; unit tests (`order-token.test.ts`) assert the production throw + dev fallback + tamper rejection. |
| F-2 🟡 | Checkout "Place Order" re-enables on a fixed 4 s `setTimeout` → double-submit window on slow requests (duplicate orders / double stock reads). | Drive the disabled state from `useActionState`'s `isPending` (plus the transition's own pending flag); drop the timer. Pinned by existing `cart-checkout` E2E (COD + card paths). |
| F-3 🟡 | `addToCartAction` / wishlist toggle: read-then-write races hit the `@@unique` and throw `P2002` across the seam — violating the "actions never throw" contract. | Catch `P2002` and retry once, then re-read; wrap each action body in try/catch returning `fail(...)`. |
| F-4 🟡 | Password change leaves all other `Session` rows valid — a hijacked session survives rotation. | Delete the user's other sessions (keep the current one) in the same flow; `revalidatePath("/account")`. No E2E for this by design: mutating james's password would poison the shared seeded fixtures for later specs. |
| F-5 🟡 | Demo credentials (incl. seeded **admin**) rendered unconditionally on the public login page. | Render only when `NODE_ENV !== "production"`. |
| F-6 🟡 | Rate limiter trusts spoofable `x-forwarded-for` unconditionally (bucket-rotation bypass; all headerless clients share `"local"`). | `clientIpFrom` honors `TRUST_PROXY=1` before trusting XFF; unit-pinned in `rate-limit.test.ts`. |
| F-7 🟡 | Security headers incomplete: no CSP, no `Permissions-Policy`, no `Cross-Origin-Opener-Policy`. | Add a pragmatic CSP (`default-src 'self'`; `img-src 'self' data: https://images.unsplash.com`; `script-src 'self' 'unsafe-inline'` — Next.js hydration payload; `style-src 'self' 'unsafe-inline'`; `frame-ancestors 'none'`), `Permissions-Policy` (camera/mic/geo off), `COOP: same-origin`. Verified via response headers after build. |
| F-8 🟡 | Unguarded `JSON.parse(order.shippingAddress)` at 3 render sites → corrupted row = 500. | New `src/lib/address.ts` `parseShippingAddress()` (schema-checked, safe fallback), unit-tested, used at all 3 sites. |

### P1 — correctness/robustness (all fixed)

| ID | Finding | Remediation |
|---|---|---|
| F-9 🟡 | Admin carrier/tracking can never be cleared (`|| undefined` maps `""` → keep-old). | Distinguish absent vs empty via `formData.has()`; empty string clears the field. |
| F-10 🟡 | Card seam inputs uncapped (`z.string().optional()`); `changePasswordAction` hand-rolls rules that `passwordSchema` already encodes. | `.max()` caps on card fields; reuse `passwordSchema`; unit tests updated. |
| F-11 🟡 | Wishlist toggles read a stale render-time `Set` — rapid toggles drift the local badge. | `StoreProvider.setWishlist` accepts a functional updater; toggles use `setWishlist(prev => …)`. |
| F-12 🟢 | `/api/search` has no try/catch and unsafe `JSON.parse(p.images)`; account address actions' results discarded (failures invisible). | Guarded search route (500 → `{ error }` + safe image parse); address action failures surface inline in `account-tabs`. |
| F-13 🟢 | `mergeGuestCartIntoUser`: non-transactional loop, no stock clamp; `setDefaultAddress` = two non-transactional writes. | `$transaction` both; merged quantities clamp to per-product stock (batched `findMany`). |
| F-14 🟢 | Order numbers allocated `count+1` inside the tx — a rolled-back attempt makes the next collision real (caught today as generic failure). | Retry the placement transaction on `P2002` (≤3 attempts) before failing. |
| F-15 🟢 | Delivery-date labels are TZ-dependent inside an SSR'd client component → hydration text mismatch. | `timeZone: "UTC"` on the formatter (server/client agree). |
| F-16 🟢 | "Hide admin notes" heuristic (`note.includes("admin@")`) leaks if the admin email ever changes; duplicate image/size keys in galleries. | `OrderEvent.actor` column (`system`/`admin`, default `system`); customer order view filters `actor === "admin"`; admin update stamps `actor: "admin"`; galleries key by index. Schema migration (`db push`, additive, non-destructive) + seed updated. |

### P2 — hygiene (all fixed)

| ID | Finding | Remediation |
|---|---|---|
| F-17 | 8 of 9 `src/components/ui/*` shadcn primitives are dead code (only `tabs.tsx` is imported; `sheet.tsx`'s header comment lies). | Deleted the 8 dead files (imports grep-verified); kept `tabs.tsx`. Unused Radix deps left in `package.json` (documented; no lockfile churn this session). |
| F-18 | Dead `hydrated` context field; dead `categoryHref` export; quirky dynamic `await import("@/lib/db")` in checkout page. | Removed/normalized (static import). |
| F-19 | Unbounded `findMany`s (shop/home/account); admin dashboard loads **all** products to compute low-stock in JS. | `take` caps on storefront reads (60); admin low-stock via `count({ where: { stock: { lte: … } } })`. |
| F-20 | No FK indexes on SQLite for `cartId` / `orderId` / `wishlistId` child lookups. | `@@index` on `CartItem.cartId`, `OrderItem.orderId`, `OrderEvent.orderId`, `WishlistItem.wishlistId` (same migration as F-16); PAD data-model section updated same-commit. |

### Accepted tradeoffs (documented, not "fixed")

- **VELOUR on chrome vs AURELIA in metadata** — intentional reference parity (comments in `header.tsx`/`footer.tsx`).
- **Register enumeration copy** — deliberate signup UX; login keeps anti-enumeration copy.
- **`dev` script pipes through `tee dev.log`** — deliberate (log capture for agents); exit-code masking noted.
- **`db:push --accept-data-loss` in `db:push`/`db:setup`** — dev convenience; production uses migrations.
- **Session/cart table growth (lazy cleanup only)** — residual risk for high-traffic single-node; scheduled sweeps deferred.
- **SQLite WAL theoretical double-pass on stock** — caught by unique constraints, no silent oversell; comment added at the seam.
- **Unused Radix deps after F-17** — removed in a future dependency-hygiene pass (requires lockfile churn).

### F-21 — regression caught by the post-fix browser sweep (fixed, TDD)

| ID | Finding | Remediation |
|---|---|---|
| F-21 🟡 | **Self-inflicted by F-19:** the admin dashboard's Products KPI still read the variable that F-19 had re-pointed to the low-stock-filtered query → card showed **0** instead of **12** (both Products and Low Stock displayed the low-stock count). The existing E2E only asserted KPI *visibility*, not values — the slip was caught visually in the post-fix sweep screenshot, then reproduced red in E2E. | `db.product.count()` joins the dashboard `Promise.all`; the Products card reads the dedicated count. New E2E **value pin**: `expect(productsCard).toHaveText(/12/)`. Lesson recorded (SKILL §12 #9: narrowing a query is a contract change — audit every consumer; pin values, not just visibility). |

## 4. ToDo ledger (execution order)

| # | Item | Status |
|---|---|---|
| 1 | Write failing unit tests: order-token production guard, rate-limit TRUST_PROXY, card caps, `parseShippingAddress` | ✅ |
| 2 | F-1 + F-8 lib fixes (`order-token.ts`, `address.ts`, `instrumentation.ts`) | ✅ |
| 3 | F-3/F-13/F-14 action-layer integrity fixes (cart/wishlist P2002, merge tx, address tx, order retry) | ✅ |
| 4 | F-4/F-6/F-9/F-10 action-layer security fixes (account, rate-limit, admin, validation) | ✅ |
| 5 | F-2/F-5/F-11/F-12 component fixes (checkout-flow, auth-form, provider toggles, account-tabs, search route) | ✅ |
| 6 | F-15/F-16/F-19/F-20 page/schema fixes (delivery TZ, actor column + indexes + `db push` + seed, take caps, lowStock count) | ✅ |
| 7 | F-7 headers (CSP/Permissions-Policy/COOP) + curl verification | ✅ |
| 8 | F-17/F-18 dead-code removal | ✅ |
| 9 | Full gate re-run (typecheck/lint/unit/build/E2E) | ✅ |
| 10 | Browser parity + mobile-nav sweep (reference vs clone) | ✅ |
| 11 | Screenshots refresh → `docs/screenshots/` | ✅ |
| 12 | Docs alignment: SKILL.md, AGENTS.md, CLAUDE.md, README.md, PAD (schema/actor/headers/test counts) | ✅ |
| 13 | `worklog.md` session-3 record; commit to main; SSH-wrapper push | ✅ |
| 14 | F-21 regression: red E2E pin → `db.product.count()` fix → green; rebuild before E2E (stale-standalone trap) | ✅ |

## 5. Verification ledger (post-remediation, evidence-backed)

- **Unit: 64/64** (7 files — 52 pre-existing anchored + 12 new/updated pins incl.
  `address.test.ts` × 5) · **E2E: 64 passed** (31 unique × 2 device projects + 2
  setup, incl. the new admin-KPI value pin) · typecheck/lint/build clean.
- Browser (agent-browser, dev server):
  - Mobile nav @390×844 re-measured post-fix: panel **320px** flush-left (x=0),
    links 256px @ x=32, gaps `[20, 20, 20, 20, 29, 20]` — flex `gap-5` pin intact,
    identical to session-2 baseline.
  - Console: **0 errors / 0 warnings** on home, PDP, cart, account, admin.
  - Headers on responses: CSP (dev-conditional `unsafe-eval`),
    Permissions-Policy, COOP `same-origin`, XCTO, XFO `DENY`, Referrer-Policy.
  - Functional smoke: login james → `/account`; admin login → `/admin` KPIs
    (Revenue $9,594.99 / Orders 4 / Products 12 / Low Stock 0).
- Screenshots refreshed to `docs/screenshots/` (9 files): home-desktop, shop-plp,
  pdp, cart, login, account, admin-dashboard (new), mobile-home, mobile-menu-open.
- No parity surface was restyled (parity law holds); all fixes are behavioral/behind-the-seam.

## 6. Residual risks / next steps

1. Dependency hygiene pass (unused Radix deps, `npm audit` review) — needs lockfile churn.
2. Scheduled cleanup for expired sessions/abandoned guest carts (residual growth).
3. Real PSP behind the checkout seam (card path remains a Luhn-verified demo by design).
4. Skip-to-content link + `prefers-reduced-motion` (a11y roadmap from SKILL §8).
5. E2E runs the last **build**, not the last edit (SKILL §9 #16): after any source
   change, rebuild before `npm run test:e2e` or the suite validates stale code.
