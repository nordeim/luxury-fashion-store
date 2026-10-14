# Remediation Plan — Session 4 (AURELIA / VELOUR clone)

> **Status:** EXECUTED. **Mode:** Audit-first (Mode C) → TDD fixes (Mode A/B).
> **Scope:** re-validation of `bbea031` (the session-3 remediation commit — the
> "recent code changes"), a fresh 12-category audit of that diff (skills:
> `code-review-checklist`, `security-and-hardening`, `code-quality-standards`,
> per `skills/skills-catalog.md`), and remediation of the verified findings.

---

## 1. Starting state

Remote added `docs/session_3.md` (saved transcript, docs-only) on top of
`bbea031`. Local gates re-run: typecheck ✓ lint ✓ **64/64 unit** ✓ build ✓
**E2E 64 passed** ✓. Docs (SKILL/README/CLAUDE/PAD/plan) verified aligned with
the codebase. Env intact (deps / `.env` schema-relative URL / seeded db / dev
server).

## 2. Audit method & clean bills of health

Explore-agent full-diff scan (12-category tactical checklist) + main-agent
first-hand verification of every 🔴/🟡 before acceptance. Two claims were
**empirically probed** (instrumentation boot behavior in real standalone prod;
DOM-global compile blindness).

**Solid (verified, no action):** instrumentation guard compiles into the
standalone and hard-fails boot without `AUTH_SECRET` (probed: HTTP 500 on every
request); order-token production throw + timing-safe compare + airtight guest
gate; `placeOnce` retry cannot double-charge/decrement (everything inside the
tx; `number @unique` is the only Order unique constraint); merge clamp
correctness; session-revoke has no self-lockout path; CSP/COOP/PP headers break
no known functionality (self-hosted fonts, unsplash+data images, inline
hydration scripts); `address.ts` parser pins; actor stamping has zero leftover
email heuristics; wishlist functional setter fully wired; `has()`-based
clearing correct.

## 3. Findings → Remediation

### P0 — blocking (all fixed, TDD)

| ID | Finding (verified first-hand) | Remediation |
|---|---|---|
| G-1 🔴 | **`adminUpdateOrderAction` is 100% broken at runtime.** The F-9 rewrite narrowed the destructure to `const { orderId } = parsed.data` but line 46 still reads bare `status` → `ReferenceError` inside the tx → **every admin order mutation (status change OR carrier/tracking edit) 500s**. Why all gates missed it: (a) tsconfig `lib: ["dom",…]` exposes the legacy `window.status` global, so TS typechecks the bare reference (probed); (b) ESLint has no `no-undef` for TS; (c) no E2E ever *performs* an admin mutation; (d) unit tests don't cover actions. Same regression class as F-21 (narrowed source, forgotten consumer) — but live in production. | Destructure `status`; **new E2E** performs a real admin mutation (status transition + carrier set + carrier clear, asserting the "Order updated." state and persisted values); **ESLint `no-restricted-globals`** for the DOM-global footguns (`status`, `name`, `origin`, `event`, `close`) so this class of silent compile can never ship again. |
| G-1b 🔴 | **Caught by the new G-1 E2E (red→green proof the test earns its keep):** F-9's own clear path never worked — the three-valued field mapping used `carrier ?? order.carrier`, and `??` treats the clear intent (`null` from an empty submitted field) as nullish, silently re-writing the old value. Clearing a carrier/tracking number was a no-op since session 3. | Explicit three-valued mapping: `carrier === undefined ? order.carrier : carrier` (same for tracking). The new E2E's clear-then-reload step pins it. |

### P1 — correctness/security (all fixed)

| ID | Finding | Remediation |
|---|---|---|
| G-2 🟡 | **F-6 incomplete:** `x-real-ip` fallback is ungated in `clientIpFrom` — a direct client rotates that header instead and defeats the login/register buckets anyway. | Honor `x-real-ip` only under `TRUST_PROXY=1`; headerless/untrusted clients share `"local"`. Unit pins updated (red first). |
| G-3 🟡 | **Another F-21-pattern instance (latent):** admin "Low Stock" KPI renders `lowStock.length` from the `take: 20` list — silently under-counts once >20 low-stock products exist. | Dedicated `db.product.count({ isActive, stock lte 3 })` for the KPI; capped list kept for the name strip. |
| G-4 🟡 | `addToCartAction`'s P2002 retry is single-shot and sits **unwrapped inside `catch`** — a second violation escapes to a 500 (the exact seam F-3 set out to seal); clamp also reuses pre-race stock. | Bounded retry loop (≤3 attempts, mirroring `checkout.ts`), final failure mapped to `fail(...)`; stock re-read inside the loop. |
| G-5 🟡 | Guest-cart cookie is deleted **before** the merge `$transaction` — if the tx throws (SQLITE_BUSY under WAL contention, which the seam's own comment predicts), the cookie is gone and the guest cart is orphaned. | Delete the cookie only after the transaction succeeds. |
| G-6 🟡 | `OrderEvent.actor` has **no backfill** — admin-authored events written before the session-3 deploy (notes ending "by admin@…") default to `actor="system"` and leak back into customer timelines on upgraded DBs. Seed DBs are clean (verified). | Idempotent backfill in `seed.ts` (runs every `db:setup`): `updateMany` events whose note contains the admin email → `actor: "admin"`. |

### P2 — hygiene (all fixed)

| ID | Finding | Remediation |
|---|---|---|
| G-7 🟢 | Helper duplication **with drift**: `firstImage` ×3 (`cart.ts` copy returns `arr[0]` even when non-string; `checkout.ts`/`search` copies use `find(typeof === "string")`), `isUniqueViolation` ×2. | Extract `src/lib/image.ts` + `src/lib/prisma-errors.ts` (single hardened contract), migrate all 5 consumers, delete local copies, unit pins for the parser. |
| G-8 🟢 | Checkout-success `?t=a&t=b` hands `token` an `string[]` despite the declared `string` — currently lands at a benign 404 (length mismatch; probed `Buffer.from(['a','b'])` does **not** throw — auditor's 500 claim corrected), but the type lie stays one refactor from a crash. | Coerce non-string `t` (take first element) before verification. |
| G-9 🟢 | README still says demo accounts are "printed on `/login`" — false in production builds since F-5. | Reword (dev-only). |
| G-10 🟢 | `CATEGORY_SLUGS` has zero consumers (grep-verified) after the `categoryHref` removal. | Delete. |
| G-11 🟢 | Clearing tracking emits `"DHL —"` (trailing em-dash). | Join non-empty parts. |

### Accepted tradeoffs (documented, not "fixed")

- `mergeGuestWishlistIntoUser` stays a per-item loop (cart merge got the
  transaction) — sibling-seam inconsistency; wishlist items have no stock
  constraint, so the failure mode is a partial merge, not corruption.
- All headerless direct clients share the `"local"` rate-limit bucket on
  direct (non-proxied) deployments; the boot guard warns but serves 500s
  rather than exiting (deployment-friendly default).
- Unused Radix deps (lockfile churn), session-table sweeps, real PSP,
  skip-to-content/`prefers-reduced-motion` — carried from session 3's list.

## 4. ToDo ledger (execution order)

| # | Item | Status |
|---|---|---|
| 1 | RED: E2E admin-mutation spec (status change + carrier set/clear) | ✅ |
| 2 | RED: unit pins for `x-real-ip` gating | ✅ |
| 3 | GREEN: G-1 destructure + G-2 proxy gate + G-3 lowStock count | ✅ |
| 4 | GREEN: G-4 bounded cart retry + G-5 cookie-after-tx + G-6 seed backfill | ✅ |
| 5 | G-7 shared helpers (image.ts, prisma-errors.ts) + G-8 token coerce + G-10 dead export + G-11 note tidy | ✅ |
| 6 | GREEN: G-1b explicit three-valued clearing (caught red by the new spec, then fixed) | ✅ |
| 7 | ESLint `no-restricted-globals` guard + lint gate re-run | ✅ |
| 8 | Full gates (typecheck/lint/unit/build/E2E) | ✅ |
| 9 | Browser sweep: admin flow, parity, mobile nav @390×844 | ✅ |
| 10 | Screenshots refresh; docs alignment (SKILL trap #18, README, plan ledger); worklog | ✅ |
| 11 | Commit to main; SSH-wrapper push; verify remote ref | ✅ |

## 5. Verification ledger (post-remediation, evidence-backed)

- Unit: **72/72** (9 files — 64 prior + 5 `image.test.ts` + 2
  `prisma-errors.test.ts` + 1 strengthened rate-limit pin) · E2E: **66 passed**
  (32 unique × 2 device projects + 2 setup — incl. the new admin-mutation
  spec) · typecheck/lint (incl. the new global guard)/build clean.
- G-1/G-1b runtime proof: the admin spec failed red pre-fix (action 500 at the
  status step; carrier clear silently kept "DHL"), passes green post-fix on
  both Chromium and iPhone-14 profiles against the production standalone.
- Mobile nav @390×844: 320px panel, gaps `[20,20,20,20,29,20]` — pin intact.
- Console: 0 errors/warnings across swept pages.

## 6. Residual risks / next steps

1. Dependency hygiene (unused Radix deps) — lockfile churn.
2. Scheduled sweeps for expired sessions/abandoned guest carts.
3. Real PSP behind the checkout seam.
4. Skip-to-content + `prefers-reduced-motion` (a11y roadmap).
5. E2E still boots the last build (SKILL §9 #16) — rebuild-before-E2E ritual.
