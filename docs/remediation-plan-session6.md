# Remediation Plan — Session 6 (AURELIA / VELOUR clone)

> **Status:** EXECUTED. **Mode:** Audit-first (Mode C) → TDD fixes (Mode A/B).
> **Scope:** (1) fresh-clone re-validation of `998aab8` (session-5 + its session
> log); (2) a fresh audit of the session-5 remediation commit `c6173c2` and
> current HEAD (skills: `code-review-checklist`, `security-and-hardening`,
> `code-quality-standards`, `tdd`, `agent-browser`, per
> `skills/skills-catalog.md`); (3) a **live reference parity sweep** of
> pastel-aurelia-fashion-edit.base44.app (desktop 1440×900 + mobile 390×844,
> logged-out surfaces) — which found **one new reference drift** (hero slide 3);
> (4) TDD remediation of the verified findings.

---

## 1. Starting state

Fresh clone at `998aab8` (workspace had been reset). Environment rebuilt: npm
install (486 pkgs), `.env` from `.env.example` (`DATABASE_URL="file:../db/custom.db"`
+ dev AUTH_SECRET), `db:setup` (4/12/2/4), Playwright chromium re-installed
(fresh-sandbox quirk: the pre-cached browser build predated the repo's
playwright — `npx playwright install chromium`).
**Baseline gates all green, matching the session-5 ledger exactly:**
typecheck ✓ lint ✓ **77/77 unit (10 files)** ✓ build ✓ **E2E 91 passed +
1 skipped** (45 unique × 2 + 2 setup) ✓. Docs (SKILL/README/CLAUDE/PAD/plan)
verified aligned with the codebase at HEAD.

`npm audit`: 11 findings (1 moderate / 8 high / 2 critical) — **all
dev-toolchain only**, unchanged from sessions 2–5 (vitest→tinypool, eslint
braces chain, prisma CLI deepmerge-ts; every fix is a breaking major).
Zero runtime exposure → **accepted with rationale** per the security skill's
triage tree.

Sandbox note (new this session): Chromium's built-in resolver could not resolve
any external host (`ERR_NAME_NOT_RESOLVED`) while system DNS worked — solved
with a local forward proxy (`scripts/forward-proxy.js`, CONNECT tunnel on
127.0.0.1:3128) passed to agent-browser via `AGENT_BROWSER_PROXY`; the clone is
reached on `127.0.0.1:3000` (`localhost` itself fails inside headless Chromium
in this sandbox).

## 2. Audit method

Explore-agent full-HEAD scan (12 categories) + main-agent first-hand
verification of every 🔴/🟡 before acceptance (each accepted finding below was
re-confirmed by reading the code). Browser sweep on the reference
(desktop + mobile, live DOM measurement) and the clone (dev server, 0 console
errors). Session-5's fixes verify as claimed: `firstParam` at every
searchParams consumer, server-side auth redirects, cart/wishlist upserts +
zero-stock clamp, admin orders COUNT, checkout fieldErrors render, address
key-remount, hero push/inert, marquee top-level keyframes, newsletter 503
guard, global-setup transient wipe.

## 3. Findings → Remediation

### A. Reference drift — visual parity (measured live 2026-10-14 ~14:00 UTC)

| ID | Measured drift (reference = ground truth) | Remediation |
|---|---|---|
| P-8 🟡 | **Hero slide 3 re-anchored to CENTER.** Live sampling of all three slides: slide 1 `justify-start` + copy `text-left` (x=80), slide 2 `justify-end` + `text-left` (x=1033) — unchanged — but slide 3 ("Rare Accessories") now renders `absolute inset-0 flex items-center justify-center px-10 lg:px-20` with copy block `text-white max-w-lg text-center` (h2/h3/p all x=568, `text-center`, CTA centered at x=603). Confirmed on BOTH 1440×900 and 390×844. Session-5 measured the same slide `justify-end` ~2.5h earlier — the prototype's CMS data changed mid-day (the reference oscillates; lesson #10 doctrine: latest measurement wins). The clone still anchors slide 3 right (`align:"right"`, copy `text-left`). The catalog's `align` union lost its `"center"` member in session-5. | Restore `"center"` to the `align` union; slide-3 data `right`→`center`; `JUSTIFY` map gains `center: "justify-center"`; copy block class becomes `align === "center" ? "text-center" : "text-left"` (CTA centers via inline-block + text-align; description keeps `max-w-sm` — reference measures p max-width 384px, text centered). E2E pin updated (slide-3 `justify-content` + copy `text-align`) — RED against the pre-fix build. Evidence: `docs/screenshots/ref-hero-slide3-centered{,-m}.png`. |

**Verified-identical (re-measured, no action):** slide 1/2 anchoring, 96px/300
hero type scale, push transition, brand marquee (anim `marquee 30s`, border-y
1px, py 20px, span 18px/300/ls 5.4px/rgb(126,113,103), ◆ rgb(224,169,41), same
8 houses), product-row cards 280px (img 280×373), The Edit 302×403 aspect-[3/4],
Styled-by-You 4-col gap-16px (293×390) + "Tag @velour in your looks to be
featured", newsletter/footer/announcement, footer © line "© 2026 VELOUR. ALL
RIGHTS RESERVED.".

**Mobile menu re-verified @390×844 — the session's explicitly requested
surface:** reference drawer `fixed left-0 top-0 h-full w-80 bg-background z-50
p-8 flex flex-col gap-6` — **char-identical** to the clone; nav `flex flex-col
gap-5 mt-4`; items 256px @x=32 h=20, y-delta 40 (gap-5); the reference's items
are still inert `<div>`s (their prototype regression) — the clone keeps real
`<a>` links per the superset law. Clone pin re-measured live: gaps
**[20,20,20,20,29,20]** unchanged, 320px panel, 256px links, 0 console errors.
**No Tailwind v4 regression.**

### B. Code audit (current HEAD) — all findings first-hand verified

#### P1 — correctness / robustness

| ID | Finding | Remediation |
|---|---|---|
| H-23 🟡 | **Cart adjust/remove races still escape the envelope (raw P2025 → 500 + rejected transition).** `adjustCartItemAction`/`removeCartItemAction` do pre-check-then-write: a concurrent delete wins between check and write and the second write throws P2025 across the seam. Also `adjust` computes `item.quantity + delta` then writes the sum — the module's own header invariant ("steppers post ±1 DELTAS, rapid clicks can't lose updates") is a read-modify-write that CAN lose updates under concurrency. | Atomic delta writes: `update({ data: { quantity: { increment: delta } } })`, then post-correct (delete when ≤ 0, clamp when above stock); both adjust and remove wrap their writes in try/catch `isRecordNotFound` (new P2025 helper beside `isUniqueViolation`) and treat "line already gone" as success — re-read the DTO and return `ok` (the caller's desired end-state already holds; no error banner for an idempotent double-tap). E2E pins: rapid double-remove on drawer + cart page → empty bag, zero 5xx (invariant tests — the §5 ledger explains why the RED phase is not reliably reproducible through the UI). |
| H-24 🟡 | **The logout spec destroys its project's canonical session.** It runs on the setup project's `storageState`; alphabetical file order only spares the earlier specs — every later spec silently tolerates guest mode, and the config comment's "order-independent" claim actually hinges on file naming. | The logout test gets its own `test.use({ storageState: loggedOut })` + an in-test login → asserts account content → signs out. The canonical per-project sessions (and their server rows) survive the whole run; suite becomes genuinely order-independent. Rate budget: +1 login/project (5 total < 10/15min). |
| H-25 🟡 | **Cross-run order residue: the global-setup wipe misses checkout-created orders.** Specs create `ORD-2026-0XX` rows every run (seed only upserts `001–004`); the wipe deletes `ORD-9999-%` only, so the shared DB grows unboundedly and the H-2 header pin (`1xx orders`) breaks once the total reaches 200 (~85 runs). | The wipe now deletes ALL `Order`/`OrderItem`/`OrderEvent` rows after the first seed, then re-runs the seed (idempotent upserts recreate the 4 canonical orders). Every run starts byte-canonical. Side benefit: absolute dashboard KPI pins become deterministic (H-28). |
| H-26 🟡 | **Hand-rolled dialogs never move focus and don't trap Tab** (cart drawer, mobile nav, quick view). `aria-modal="true"` with a still-tabbable background is an ARIA contract violation — keyboard users tab into the occluded page. (The search overlay intentionally keeps its existing behavior: it's a full-screen takeover WITHOUT `role="dialog"`/`aria-modal`, so no ARIA contract applies; its input already receives initial focus.) | New `src/lib/focus-trap.ts` (`installFocusTrap(container): cleanup` — a plain DOM util, NOT a hook, per SKILL §6 "no custom hooks"): focuses the first focusable on open, wraps Tab/Shift+Tab within the panel, restores focus to the opener on close. Wired into the three surfaces' existing `useEffect`s (visual no-op — behavior only). E2E pins: opening the drawer/mobile nav moves focus inside `[role=dialog]`; Tab from the last control wraps to the first. |
| H-27 🟡 (test) | **`emptyTheBag` helper polls with `waitForTimeout(150)` and re-clicks the first Remove button** — a slow action roundtrip double-clicks the same line (currently safe product-side, but it's the suite's one remaining fixed-sleep race and it now also risks a spurious H-6 error banner in assertions). | Deterministic: click → wait for THAT row to detach (`expect(row).toHaveCount(0)`) → re-query. No sleeps. |
| H-37 🟢 | **PDP delivery label straddles the UTC day boundary during hydration.** `product-detail.tsx` calls `estimateDelivery()` (= `new Date()`) during BOTH the server render and the client hydration; F-15 pinned the timezone but not the date source, so a render straddling midnight yields two different labels → React hydration text mismatch (rare, real). (`checkout/success` is already correct — the RSC passes `order.placedAt`.) | The PDP RSC computes `estimateDelivery()` once and passes `deliveryLabel` down as a prop; the client component renders the prop (single clock). |

#### P2 — consistency / hygiene

| ID | Finding | Remediation |
|---|---|---|
| H-28 🟢 | **Admin Revenue KPI aggregates cancelled orders** (`db.order.aggregate` with no `where`) — cancelled orders inflate Revenue. (Orders KPI intentionally stays "all orders placed".) | Revenue gets `where: { status: { not: "cancelled" } }` + a comment; dashboard E2E gains absolute value pins (Orders "4", Revenue from the canonical seed totals) — deterministic only because H-25 makes every run start canonical. |
| H-29 🟢 | `mergeGuestWishlistIntoUser` runs per-item upserts outside a transaction — the sibling cart merge is transactional; a mid-loop failure half-merges. | Wrap in the same `$transaction` shape as `mergeGuestCartIntoUser`. |
| H-30 🟢 | `admin/products` `findMany` is the last uncapped list query (F-19/H-2 discipline). | `take: 200`. |
| H-31 🟢 | `saveAddressAction` decides `isDefault: count === 0` outside a transaction — two concurrent first-address creates both see 0 → two defaults. | Count + create inside one `$transaction` (SQLite serializes writes; the transaction closes the decision window). |
| H-32 🟢 | **`shop-client` drops the `designers` filter from URL sync**: `syncUrl`'s merged object omits it (any filter interaction rewrites `/shop` without `?designers=1` while the showcase filter stays applied until reload) and `activeFilters` ignores it (the "clear" affordance under-counts). | Include `designers` in the sync merge + `activeFilters`; clear-all resets it. |
| H-33 🟢 | `updateProfileAction` hand-rolls the name length check — the sole mutation seam outside the Zod dialect (the H-19 drift class). | `profileSchema` in `validation.ts`, action parses through it. |
| H-34 🟢 | Every admin page calls `getCurrentUser()` **then** `isAdmin()` — the latter re-fetches session + user (2 lookups where 1 suffices), 5 pages. | Single `getCurrentUser()`; role checked inline (`user.role !== "admin"`). |
| H-35 🟢 | `.env.example` omits `TRUST_PROXY`, which changes rate-limit identity semantics at every seam (documented only in README). | Add the (empty) var with a comment — example now mirrors the full contract. |
| H-36 🟢 | ~14 files carry stray empty JSX expressions `{ }` left from the removed `next/image` scaffold. | Deleted mechanically. |
| H-38 🟢 (test) | **"Empty wishlist shows guidance" passes vacuously** — it runs on the project session right after the add-to-wishlist test, so the grid is visible and the `if` has no else. | Rewritten with a logged-out `storageState` (fresh cookie ⇒ empty wishlist) asserting the "Nothing saved yet" guidance deterministically. |
| K-1 🟢 | **Carried 4 sessions: expired sessions / abandoned guest carts are never swept** — logged-out-elsewhere session rows and stale guest carts accumulate forever. | New `src/lib/sweeper.ts`: `sweepCutoffs(now)` (pure: sessions expire after their expiry; guest carts/wishlists idle 30 days) unit-pinned in `src/lib/sweeper.test.ts`; `runSweep()` deletes expired `Session` rows + idle guest `Cart`/`Wishlist` rows (and children). Wired in `src/instrumentation.ts` after the boot guard: one sweep at boot + hourly `setInterval` (`unref()`'d; interval cleared on reload guard). |

**Accepted tradeoffs (documented, not fixed):** dev-toolchain npm-audit
findings (breaking majors, zero runtime reach); CSP `'unsafe-inline'` (nonce
CSP stays on the roadmap); guest order-view HMAC in URLs (documented
deployment tradeoff); per-run auth budget (5 of 10 logins/project — safe);
E2E tolerating guest mode in later specs is now moot for order-dependence
(H-24) but the guest-tolerant assertions stay as defense-in-depth.

## 4. ToDo ledger (execution order)

| # | Item | Status |
|---|---|---|
| 1 | RED (E2E, baseline build): slide-3 center pin (P-8) + focus-trap pins (H-26) fail as designed (7 failures); unit RED for the sweeper (module missing) | ✅ |
| 2 | GREEN: catalog `align` union + slide-3 data + hero-carousel center (justify + text-center) | ✅ |
| 3 | GREEN: `prisma-errors.isRecordNotFound`; cart adjust atomic increment + P2025→ok; remove P2025→ok | ✅ |
| 4 | GREEN: `focus-trap.ts` + cart-drawer / mobile-nav / quick-view wiring (search-overlay intentionally excluded — no aria-modal contract) | ✅ |
| 5 | GREEN: global-setup order wipe + re-seed (H-25); logout spec own-login + merge-spec cleanup (H-24); emptyTheBag deterministic (H-27); wishlist empty-state guest run (H-38) | ✅ |
| 6 | GREEN: PDP delivery prop (H-37); Revenue filter + KPI floor/semantic pins (H-28); wishlist merge tx (H-29); admin products take (H-30); address tx (H-31) | ✅ |
| 7 | GREEN: shop-client designers sync (H-32); profileSchema (H-33); admin single-fetch ×5 (H-34); .env.example TRUST_PROXY (H-35); dead JSX (H-36) | ✅ |
| 8 | K-1: sweeper.ts + sweeper.test.ts (RED first) + instrumentation wiring | ✅ |
| 9 | Rebuild → full gates (typecheck/lint/unit/build/E2E) — **build BEFORE E2E** (SKILL §9 #16) | ✅ |
| 10 | Browser sweep post-fix (slide-3 center live, mobile pin, console clean) + screenshots → docs/screenshots/ | ✅ |
| 11 | Docs alignment: SKILL (counts, §1 slide-3 fact, §5/§10/§17 rows), README, CLAUDE, PAD, plan ledger; worklog | ✅ |
| 12 | Commit to main; SSH-wrapper push; verify remote ref | ✅ |

## 5. Verification ledger (post-remediation, evidence-backed)

- Unit: **82/82** (11 files — 77 prior + 5 `sweeper.test.ts`) ·
  E2E: **100 passed + 2 skipped** (50 unique cases × chromium + mobile, the
  two desktop-only pins skip on the 390px project; + 2 setup projects) ·
  typecheck/lint/build + assemble clean, observed on the final code.
- Unique-case math: 45 prior + 5 new (P-8 slide-3, H-23 drawer double-remove,
  H-23 cart-page double-remove, H-26 drawer focus, H-26 mobile-nav focus;
  the rewritten H-38 wishlist test replaces its vacuous predecessor 1:1).
- Red→green evidence: the P-8 slide-3 pin and both H-26 focus pins failed
  RED against the pre-fix build (7 failures as designed); all green
  post-fix. H-23's P2025 interleaving is NOT reliably reachable from the UI
  (a two-page concurrent-remove probe on the unfixed build also serialized
  clean — see §3 B/P1) — its pins stay as no-5xx invariant tests, and the
  fix itself is defense-in-depth for real-world concurrency, the same class
  sessions 3–5 sealed elsewhere (F-3/G-4 retries, H-3 upserts).
- Parity live-verified on the remediated build: slide 3 `justify-center` +
  `text-center` (matches the fresh reference capture), slides 1–2 unchanged,
  marquee/rows/tiles unchanged, mobile nav gaps `[20,20,20,20,29,20]`
  unchanged, drawer focus lands INSIDE the panel on open, console 0 errors,
  admin dashboard Revenue `$9,594.99` / Orders `4` / Products `12` /
  Low Stock `0` (canonical, dev DB).
- Screenshots refreshed: `clone-hero-slide3-centered.png` +
  `ref-hero-slide3-centered{,-m}.png` (new evidence), plus the standard
  clone set (home, mobile home/menu, PDP, PLP, login, account, admin, cart).

## 6. Residual risks / next steps

1. Dev-toolchain npm-audit findings — revisit when vitest 5 / prisma 7 land
   non-breaking paths (carried).
2. Real PSP behind the checkout seam (carried).
3. Skip-to-content + `prefers-reduced-motion` (carried a11y roadmap).
4. Nonce-based CSP to retire `'unsafe-inline'` (carried).
5. The reference oscillates at session granularity (slide 3 flipped right →
   center between two measurements of the same day). Keep re-measuring every
   parity surface every session; the E2E pins make the next drift a red test.
6. shop-client `result-count` derives from the take-capped page load (catalog
   fixed at 12 — latent only).
7. The sweeper runs in-process (standalone server) — multi-instance deployments
   would run duplicate sweeps (harmless: deletes are idempotent).
