# Remediation Plan — Session 7 (AURELIA / VELOUR clone)

> **Status:** EXECUTED. **Mode:** Audit-first (Mode C) → TDD fixes (Mode A/B).
> **Scope:** (1) fresh-clone re-validation of `3210dcf` (session-6 + its session
> log); (2) a fresh audit of the session-6 remediation commit `7f71490` and
> current HEAD (skills: `code-review-checklist`, `security-and-hardening`,
> `code-quality-standards`, `tdd`, `agent-browser`, per
> `skills/skills-catalog.md`); (3) a **live reference parity sweep** of
> pastel-aurelia-fashion-edit.base44.app (desktop 1440×900 + mobile 390×844,
> logged-out surfaces) — which found **two major reference drifts** (the
> Exclusive Deals section rebuilt into a countdown + bento + inline sale
> grid; the product-card text stack gained a name-adjacent swatch row and a
> discount chip); (4) TDD remediation of the verified findings.

---

## 1. Starting state

Fresh clone at `3210dcf` (workspace had been reset — the remote already carried
the completed session-6 work `7f71490` plus the user-added session-6 transcript).
Environment rebuilt: npm install (486 pkgs), `.env` from `.env.example`
(`DATABASE_URL="file:../db/custom.db"` + dev AUTH_SECRET), `db:setup`
(4/12/2/4), `npx playwright install chromium` (fresh-sandbox browser cache
predated the repo's Playwright — same quirk as session 6).
**Baseline gates all green, matching the session-6 ledger exactly:**
typecheck ✓ lint ✓ **82/82 unit (11 files)** ✓ build + assemble ✓
**E2E 100 passed + 2 skipped** (50 unique × 2 + 2 setup) ✓.

`npm audit`: 11 findings (1 moderate / 8 high / 2 critical) — **all
dev-toolchain only**, unchanged from sessions 2–6. Zero runtime exposure →
**accepted with rationale** (carried).

Sandbox notes (same as session 6): headless Chromium cannot resolve external
hosts (system DNS fine) — solved with the local CONNECT forward proxy
(`scripts/forward-proxy.js` on `127.0.0.1:3128` via `AGENT_BROWSER_PROXY`; the
helper was never committed, it is sandbox tooling). `agent-browser`'s `open`
chokes on `--viewport` (it CONNECTs to the literal host `1440x900`) — the
correct sequence is `open` → `set viewport 1440 900` → `open <url>`.

## 2. Audit method

Explore-agent full-diff scan of `7f71490` (12 audit dimensions) + main-agent
first-hand verification of every 🟡/🟢 before acceptance (each accepted finding
below was re-confirmed by reading the current code). The audit also verified
every session-6 claim against the code (P-8 center maps, H-23 atomic increment,
H-24 order independence, H-25 order wipe, H-26 trap wiring, H-27 deterministic
emptyTheBag, H-28 revenue split, H-29 tx, H-30 take, H-31 tx, H-32 designers
sync, H-33 schema migration lossless, H-34 single-fetch, H-35 env, H-36 count,
H-37 RSC clock, H-38 guest run, K-1 sweeper wiring — **all implemented as
claimed**).

## 3. Findings → Remediation

### A. Reference drift — visual parity (measured live 2026-10-15)

The first sweep re-verified every PINNED surface identical (hero anchors
slide1 start/left · slide2 end/left · slide3 center/center on both
breakpoints, push transition, marquee 30s/18px/300/ls 5.4px/gold ◆, 280px row
cards, The Edit 302×403, UGC copy, footer ©, page height 11079, mobile drawer
char-identical with gaps [20,20,20,20,29,20] and their items still inert
divs). But a SECTION-HEIGHT census then caught a 2308px total divergence the
pinned surfaces could not explain — two major drifts in surfaces nobody had
pinned before:

| ID | Measured drift (reference = ground truth) | Remediation |
|---|---|---|
| P-9 🟡 | **Exclusive Deals section REBUILT by the reference** (767px promo band → 3549px composite): kicker "MEMBERS-ONLY PRICING"→"LIMITED TIME OFFER"; added copy "Curated luxury at exceptional value. Each piece, a statement." (LEFT-aligned header — evidence shots, not centered); added a live countdown row ("SALE ENDS IN" label ↔ three 48px ink digit boxes, cormorant digits + 8px unit labels, HRS/MIN/SEC; reference semantics measured: mount-relative ~8h24m target ticking real seconds); bento grid (lg:grid-cols-2 gap-6 mb-14): LEFT tall women tile (628×1908 — stretches to the right column; aspect-[4/3] mobile; bottom-left copy, white "Shop Women" CTA, -40% red-600 circle badge 56×56) | RIGHT grid-rows-2 (men 628×942 + accessories 628×942, aspect-[3/4] mobile / **lg:aspect-[2/3]**; left gradient; h3 30px, "Shop Now →" border-b; accessories image swapped to the reference's current photo); "Sale Items" 30px serif + "View All Sale" (12px; clone links to /shop?sale=1 — superset over their inert button); **the standalone Sale row is ABSORBED as a 4-col grid** (`grid-cols-2 md:3 lg:4 gap-4 lg:6`) of all 6 catalog sale products (302×403 tiles @1440). E2E pins: countdown format + real 1s tick + 3×48px ink boxes; bento headings; 4-equal-column sale grid; rows count 6→5. Evidence: `ref-exclusive-deals{,-m}.png` / `clone-exclusive-deals.png`. |
| P-10 🟡 | **Product-card text stack diverged**: reference = brand / **name h3** / 5×16px STROKE stars in muted-foreground (no gold, no fill) + "(89)" 10px / price 16px semibold + **compareAt 14px strikethrough** / **COLOR SWATCH row** (`w-4 h-4 rounded-full border` chips, tan #d2b48c measured fill, transparent for unmapped names); **no "NEW" chip anywhere**; sale cards carry a `-{discount}%` chip (10px, **red-500**, square, ~40×17) top-left on the image — not the clone's red-600 "SALE" word. Card 548px tall (clone 484) — every row section rendered 60px short. | ProductCard: brand ✓ + name h3 ✓ kept; stars → w-4 h-4 stroke muted-foreground; (89) → 10px; price row → items-center gap-2 mb-3 with text-sm compareAt; NEW swatch row (title={color}, COLOR_HEX catalog map — 24 fashion names, Tan = the reference's measured value); tag chip → `-{discount}%` bg-red-500 for sale products, nothing for isNew; root gains `data-product-card` (moved from the row wrapper — the sale grid renders bare cards). E2E pins: stack structure + star color/size + swatch count + chip token (probe-element comparison — v4 serializes the default palette in oklab). |

**Why the first sweep missed it (lesson #10 sharpened):** every previously
PINNED surface matched — the drift lived in surfaces never pinned (deals
interior, card text stack). The section-height census (a 5-minute check
added this session) is what exposed them. New doctrine: census the section
heights FIRST, then re-measure the pinned surfaces.

### B. Code audit (session-6 commit `7f71490`) — all findings first-hand verified

#### P1 — correctness / robustness

| ID | Finding | Remediation |
|---|---|---|
| H-39 🟡 | **`adjustCartItemAction` fires the atomic increment BEFORE the H-15 sold-out guard — the "leave the line untouched" invariant is violated by the fix that was supposed to uphold it.** The `update({ data: { quantity: { increment: delta } } })` writes unconditionally; the `stock <= 0` branch runs after the write and only skips the CLAMP — the +1 has already persisted. A stale UI (drawer rendered at stock 5, admin zeroes stock, drawer DTO still says stock 5 → "+" enabled) inflates the persisted quantity on every click with no clamp at all; `cartDeltaSchema` (±99) lets direct calls inflate arbitrarily. The "-1 on a sold-out line" also silently changed from no-op to decrement — an improvement, but unflagged. | New pure planner `src/lib/adjust-plan.ts`: `planAdjustment(delta, stock)` returns `skip` (sold-out line + non-negative delta — growth forbidden) or `increment(delta)` (decrement always allowed; any delta in stock). The action executes the plan; skip touches nothing. Unit-pinned (RED first — module missing). |
| H-40 🟡 | **H-23's post-corrections act on the action's own snapshot.** The `<=0` delete can erase a concurrent `+1` (serialize: -1→0, +1→1, then the -1 caller's snapshot-delete removes the line the other tab just grew — a lost update, not "the caller's desired end-state"); the clamp writes the PRE-READ `item.product.stock`, so a concurrent checkout decrement can leave qty above real stock. | Pure `planCorrection(observed, stock)` decides delete / clamp / none; the executor makes both corrections CONDITIONAL on the observed state still holding (`deleteMany/updateMany` with `where: { id, quantity: observed }`) and re-reads fresh stock for the clamp (fresh ≤ 0 → leave the line for the checkout guard, per H-15). Unit-pinned (RED first). |
| H-41 🟡 | **`focus-trap.ts`'s keydown listener is container-scoped, so both `!container.contains(current)` recovery arms are dead code.** Keydown fires on the focused element and bubbles through ITS ancestors — once focus escapes the dialog (removed node, programmatic focus), Tab events on body never pass through the container and the wrap-into-dialog recovery never runs. The dialog a11y contract degrades exactly when it's most needed. | Attach `onKey` at `document` level in `installFocusTrap` (removed in the returned cleanup). The two E2E wrap pins (drawer, mobile nav) stay green — they exercise wrap from INSIDE. The recovery arm itself is not deterministically UI-reachable (same disclosure class as H-23's P2025 window) — the fix is defense-in-depth. |
| H-42 🟡 | **K-1's "idle > 30d" actually measures row-CREATION age: guest `Cart`/`Wishlist.updatedAt` never moves** (no `db.cart.update`/`db.wishlist.update` anywhere in `src/`; item mutations touch only the child rows). The sweep deletes guest carts by creation age while the comment/test claim idle-since-activity semantics — safe today ONLY because the guest cookie `maxAge` is also exactly 30 days from creation. If the cookie lifetime is ever extended/refreshed, the sweeper silently deletes active guest bags. | Touch the parent row's `updatedAt` on every item mutation (`addToCart`, `adjust`, `remove`, wishlist toggle; best-effort `.catch(() => {})` — a failed touch must never fail the user's mutation). The documented semantics become real; no cookie-lifetime coupling. (Prisma `@updatedAt` stamps the touch automatically.) |
| H-43 🟡 | **Quick-view is the most fragile of the three trap surfaces:** (a) effect deps `[product, onClose]` — BOTH parents pass a fresh inline closure `() => setQuickView(null)`, so any parent re-render mid-open tears down and reinstalls the trap, re-focusing the close button and capturing a wrong `previouslyFocused` (latent today — neither parent subscribes to the store — one `useStore()` call away from a focus-yank bug); (b) the trap container is the outer overlay INCLUDING the backdrop — an inconsistent dialog boundary (drawer/mobile-nav trap the `role=dialog` panel itself); (c) no E2E pin on the third wired surface. | Latest-ref pattern for `onClose` (ref updated in a no-deps effect — not setState-in-effect); trap ref moves to the INNER card (the dialog proper); new E2E pin: quick view focuses its first control on open and Tab wraps last→first. (New-surface pin — green immediately on the old build too; the hardening is defense-in-depth, disclosed.) |

#### P2 — hygiene / pins

| ID | Finding | Remediation |
|---|---|---|
| H-44 🟢 | `isRecordNotFound` (the new H-23 P2025 helper) has no unit pin — the E2E double-remove tests cannot reach the P2025 branch, so the catch path was entirely untested. | Symmetric unit pins: P2025 → true; P2002 / Error / null / string → false. |
| H-45 🟢 | `global-setup.ts` seeds TWICE per run (once after `db push`, once after the wipe) — the first pass is pure wasted time (12 product upserts + scrypt hashing × 2). | Drop the pre-wipe seed; the post-wipe seed is the only one needed (push creates schema, wipe cleans, seed fills). |
| H-46 🟢 | `admin/page.tsx` `revenueAgg` still fetches `_count: true`, dead since H-28's dedicated `db.order.count()` — invites the next reader to regress H-28. | Dropped; comment at the site already warns. |
| H-47 🟢 | The H-28 semantic pin (`Revenue` bit-identical across a 104-cancelled injection) silently assumes `workers: 1` — raised parallelism would make a concurrent non-cancelled checkout break it non-deterministically. | Comment pinning the assumption next to the assertion (config keeps `fullyParallel: false, workers: 1`). |
| H-48 🟢 | Focus restore can land on a visually-hidden opener: the quick-view eye button lives in the hover-revealed action row (`opacity-0 translate-y-2 group-hover:…`) — focus succeeds but the focused element is invisible until hover. | `group-focus-within` reveal on the action row (resting visuals unchanged — the reference has no focus behavior on these inert controls; a11y superset, not a restyle). |

**Accepted tradeoffs (documented, not fixed):** H-31's transaction narrows but
does not eliminate the two-defaults race on SQLite (deferred BEGIN read-lock
upgrade) — the airtight fix is a partial unique index via raw SQL, schema
surgery for a demo-nuisance case; `focusableIn`'s `offsetParent` filter
excludes `position: fixed` elements themselves (irrelevant for today's three
surfaces — all traps query CONTROLS inside a positioned panel; generalize when
a fourth surface needs it); npm-audit dev-toolchain findings (carried); real
PSP / nonce CSP / skip-to-content / reduced-motion (carried roadmap).

## 4. ToDo ledger (execution order)

| # | Item | Status |
|---|---|---|
| 1 | Unit RED: `adjust-plan.test.ts` (10 pins — module missing) + `countdown.test.ts` (4 pins) | ✅ |
| 2 | Unit pins: `isRecordNotFound` symmetric tests (H-44) | ✅ |
| 3 | E2E RED (pre-fix build): H-39 sold-out pin failed both projects (line inflated to 2); P-9/P-10 pins failed as designed (4 failures) | ✅ |
| 4 | GREEN: `adjust-plan.ts` + cart.ts executor (plan-driven increment + conditional corrections + fresh-stock clamp) | ✅ |
| 5 | GREEN: focus-trap document-level listener (H-41); quick-view latest-ref + inner-card boundary (H-43) | ✅ |
| 6 | GREEN: cart/wishlist parent-row touches (H-42); product-card focus-within reveal (H-48); prisma-errors pins | ✅ |
| 7 | Hygiene: global-setup single seed (H-45); revenueAgg `_count` drop (H-46); workers:1 comment (H-47) | ✅ |
| 8 | Parity GREEN: `countdown.ts` + `sale-countdown.tsx` (useSyncExternalStore — hydration-safe, no setState-in-effect); exclusive-deals rebuilt (countdown + bento + inline sale grid); standalone Sale row removed from storefront-home; ProductCard P-10 stack; catalog COLOR_HEX + accessories image | ✅ |
| 9 | Test redesign under a real constraint: the H-39 pin's own admin login pushed the shared-IP admin bucket to 12 > 10/15min and H-7/H-39 mobile failed on login — H-39 rewritten onto the canonical james session with an SQL stock edit (H-2's fixture pattern); admin logins restored to exactly 10 | ✅ |
| 10 | Evidence-shot corrections: reference header is LEFT-aligned (not centered) and secondary bento tiles are 3:4 mobile / **2:3 desktop** (628×942; the tall tile stretches to 1908px) — fixed, then live-verified byte-equal (628×1908 / 942 / 942) | ✅ |
| 11 | Rebuild → full gates (typecheck/lint/98 unit/build/E2E) — **build BEFORE E2E** (SKILL §9 #16; a stale dev-server CSS cache also bit once — arbitrary `lg:aspect-[2/3]` only appeared after a real rebuild) | ✅ |
| 12 | Browser sweep post-fix (clone parity surfaces, mobile pin, console clean) + screenshots → docs/screenshots/ | ✅ |
| 13 | Docs alignment: SKILL/README/CLAUDE/PAD/plan ledger; worklog session-7 | ✅ |
| 14 | Commit to main; SSH-wrapper push; verify remote ref | ✅ |

## 5. Verification ledger (post-remediation, evidence-backed)

- Unit: **98/98** (13 files — 82 prior + 10 `adjust-plan` + 2 `isRecordNotFound`
  + 4 `countdown`) · E2E: **111 passed + 3 skipped** (57 unique cases ×
  chromium + mobile; the three desktop-only pins — P-8 slide-3, P-4 280px,
  P-9 sale-grid — skip on the 390px project; + 2 setup projects) ·
  typecheck/lint/build + assemble clean, observed on the final code.
- Unique-case math: 51 prior + 6 new (H-39 sold-out guard, H-43 quick view
  focus, P-9 countdown, P-9 sale-grid columns, P-10 card stack, P-10 sale
  chip; the section-order test was rewritten in place 1:1).
- Red→green evidence: H-39 failed RED on the pre-fix build (sold-out "+"
  inflated the line to 2); `adjust-plan`/`countdown` unit files failed RED on
  the missing modules; the P-9/P-10 home pins failed RED (4 failures) before
  the parity GREEN. The H-43 quick-view pin and H-41's recovery arm are
  characterization/defense-in-depth (disclosed in §3B).
- Parity live-verified on the remediated build: deals countdown ticks real
  seconds (poll-verified), bento byte-equal (628×1908 / 942 / 942 vs the
  reference's measured 628×1908 / 942 / 942), sale grid 4 equal columns,
  slide-3 center (03/03), mobile menu 320px drawer gaps [20,20,20,20,29,20]
  with focus INSIDE the panel and real navigation (Women → /shop), admin
  dashboard Revenue $9,594.99 / Orders 4 / Products 12 / Low Stock 0, console
  0 errors.
- Screenshots refreshed (18): NEW `clone-exclusive-deals.png` +
  `ref-exclusive-deals{,-m}.png` (P-9 evidence) + the standard clone set
  (home desktop, mobile home/menu, PDP, PLP, login, account, admin, cart,
  slide-3).

## 6. Residual risks / next steps

1. Dev-toolchain npm-audit findings — revisit when vitest 5 / prisma 7 land
   non-breaking paths (carried).
2. Real PSP behind the checkout seam (carried).
3. Skip-to-content + `prefers-reduced-motion` (carried a11y roadmap).
4. Nonce-based CSP to retire `'unsafe-inline'` (carried).
5. The reference oscillates at session/hour granularity — this session it
   REBUILT a whole section (P-9). The section-height census is now part of
   the sweep ritual; the new deals/card pins make the next drift a red test.
6. **E2E rate budget is now EXACTLY consumed**: 10 admin logins per 15-min
   window across both projects (setup 1 + 4 in-spec each = 5 × 2). Any new
   test that logs in as admin must reuse the SQL-fixture pattern (H-2/H-39)
   instead of adding a login, or raise the limiter's test budget first.
7. H-31 two-defaults race: the partial-unique-index fix is documented but not
   applied (raw-SQL schema surgery vs demo-nuisance impact — see §3 accepted).
8. The countdown is mount-relative (~8h24m) — matching the reference's own
   measured semantics; a fixed sale-end datetime would eventually read
   00:00:00 forever (documented tradeoff, §3A).
9. Sweeper runs in-process; multi-instance deployments run duplicate sweeps
   (harmless: idempotent deletes).
10. shop-client `result-count` derives from the take-capped page load (catalog
    fixed at 12 — latent only).
