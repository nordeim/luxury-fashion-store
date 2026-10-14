# Remediation Plan — Session 8 (AURELIA / VELOUR clone)

> **Status:** EXECUTED. **Mode:** Audit-first (Mode C) → TDD fixes (Mode A/B).
> **Scope:** (1) fresh-clone re-validation of `db02842` (session-7 + its session
> log); (2) a fresh audit of the session-7 remediation commit `c789f2a` (skills:
> `code-review-checklist`, `security-and-hardening`, `code-quality-standards`,
> `tdd`, `agent-browser`, per `skills/skills-catalog.md`); (3) a **live
> reference parity sweep** (desktop 1440×900 + mobile 390×844, logged-out) —
> section-height census FIRST (the session-7 doctrine), which caught **four
> drifts**: size chips on every product card (P-11), the mobile drawer's
> ACCOUNT/WISHLIST tail removed by the reference (P-12), the product rows'
> mobile geometry back to fixed 260px cards over `gap-6` (P-13), and the deals
> header merged into one row with the countdown STACKED on the right (P-14);
> (4) TDD remediation of the verified findings.

---

## 1. Starting state

Fresh clone at `db02842` (workspace had been reset — the remote already carried
the completed session-7 work `c789f2a` plus the user-added session-7
transcript). Environment rebuilt: npm install, `.env` from the tracked
`.env.example` (`DATABASE_URL="file:../db/custom.db"` + dev AUTH_SECRET),
`db:setup` (4/12/2/4), `npx playwright install chromium` (fresh-sandbox cache —
same quirk as sessions 6–7).

**Baseline gates all green, matching the session-7 ledger exactly:**
typecheck ✓ lint ✓ **98/98 unit (13 files)** ✓ build + assemble ✓
**E2E 111 passed + 3 skipped** (57 unique × 2 + 2 setup) ✓.

`npm audit`: 11 findings (1 moderate / 8 high / 2 critical) — **all
dev-toolchain only**, unchanged from sessions 2–7. Zero runtime exposure →
**accepted with rationale** (carried).

Sandbox notes (same as 6–7): headless Chromium cannot resolve external hosts —
the CONNECT forward proxy rebuilt at `scripts/forward-proxy.js` :3128 via
`AGENT_BROWSER_PROXY`; `agent-browser open` → `set viewport W H` → `open <url>`
(the `--viewport` flag CONNECTs to the literal host `1440x900`).

## 2. Audit method

Explore-agent full-diff scan of `c789f2a` (19 code/test files, 8 dimensions) +
main-agent first-hand verification of every 🟡/🟢 before acceptance. All 16
commit-message claims verified TRUE in code (planner-before-write, conditional
corrections, document-level focus trap, latest-ref quick view, parent-row
touches, useSyncExternalStore countdown, single seed, dead `_count` removal,
admin login budget exactly 10/10, P-9/P-10 pins present).

## 3. Findings → Remediation

### A. Reference drift — visual parity (measured live 2026-10-15)

The census re-verified every pinned surface identical (hero anchors
slide1 start/left · slide2 end/left · slide3 center/center + push, marquee
30s/18px/300/ls 5.4px/rgb(126,113,103) + gold ◆, The Edit, UGC, newsletter,
page height 11079, drawer panel class char-identical `fixed left-0 top-0
h-full w-80 bg-background z-50 p-8 flex flex-col gap-6`, nav `flex flex-col
gap-5 mt-4`, items still inert divs). The census ALSO caught four drifts in
surfaces whose pins were structural but incomplete:

| ID | Measured drift (reference = ground truth) | Remediation |
|---|---|---|
| P-11 🟡 | **Every product card gained a SIZE-CHIP row** (the row cards, the bento-adjacent sale tiles — every card is 548px @280 / 521px @260 with it; the clone is 512 without): `flex flex-wrap gap-1` of one bordered button per product size — "XS S M L", "XS…XL", "S…XXL", "One Size" — `text-[10px] px-2.5 py-1 border border-border text-muted-foreground`, radius 0, transparent bg (measured 4px 10px / rgb(229,224,220) / rgb(126,113,103)). Text stack = brand / name / stroke stars+(89) / price(+compareAt) / swatches / **sizes** (158px total). Session-7's P-10 pin asserted structure but not HEIGHT — the chips slipped in underneath it. | ProductCard renders the size row from `product.sizes` after the swatch row (`flex flex-wrap gap-1` — the swatch row keeps its `mb-3`). Superset: chips are REAL buttons — clicking selects the size the card's Add to Bag posts (`selected ?? sizes[0]`), selected state `border-foreground text-foreground`; resting visuals identical to the reference (no default selection). E2E: chip count == sizes length, chip labels, border token via probe. |
| P-12 🟡 | **The mobile drawer's ACCOUNT/WISHLIST tail is GONE from the reference** (session-6 measured 7 items, gaps [20,20,20,20,29,20]; now the panel is logo + 5 inert nav divs, gaps [20,20,20,20], panel text "VELOUR Women Men Accessories Designers Sale"). The mobile header has no account icon either — mobile has no account entry at all on the reference. | Remove the clone's tail block (`pt-2 border-t` + Account/Wishlist links) from `mobile-nav.tsx`. The v4 pin (`flex flex-col gap-5`) is untouched; the E2E spec asserts positive gaps (not item count) — updated to pin the 5-item census so the next drift is red. Wishlist stays reachable via the header heart; account via checkout/login (superset URLs). |
| P-13 🟡 | **Product rows on mobile/tablet are FIXED-WIDTH cards again**: measured @390 — scroll row `flex gap-6 …pb-4` (**24px gap at every breakpoint**) with `w-[260px]`-class cards (measured 260px; 1.36 visible), NOT the 2-up fractions the clone renders (`w-[calc(50%-8px)] md:calc(33.333%-16px)`, `gap-4 lg:gap-6` → 163px cards / 16px gap; every row section 65–130px short). Session-5's P-4 recon actually recorded `w-[260px] lg:w-[280px]` — the calc() fraction reinterpretation was the drift. | Row wrappers → `w-[260px] shrink-0 lg:w-[280px]`; scroll row → `gap-6` uniformly. The product-row.tsx header comment (flagged stale by the audit) becomes TRUE again. E2E: mobile card width pin = 260 @390. |
| P-14 🟡 | **The deals header is ONE row with the countdown STACKED right**: `flex flex-col lg:flex-row items-start lg:items-center justify-between mb-12 gap-6` — left text block 131px (kicker 10px/ls 4px/**mb-2** gold, h2 60px font-light "Exclusive *Deals*" with italic span, copy 14px muted wrapping TWO lines at 40px) + right countdown stack 72px (`flex flex-col items-start lg:items-end gap-2`: "SALE ENDS IN" label 12px ABOVE the three 48px boxes, right-aligned at lg). The clone renders a 119px header block (mb-10, kicker mb-3, one-line copy) and the countdown as its own label-left/boxes-right row (mb-12) — 3577px section vs 3549. | `exclusive-deals.tsx`: merge header + countdown into the measured row (kicker `mb-2`, copy `text-sm` constrained by the flex column so it wraps like the reference); `SaleCountdown` becomes the right-hand STACK (label above boxes, `items-start lg:items-end`), row layout owned by the section. Ref-verified arithmetic: 131 + mb-12 48 + bento 1908 + mb-14 56 + (36+32+1178) = 3549. |

### B. Code audit (session-7 commit `c789f2a`) — all findings first-hand verified

#### P1 — correctness / robustness

| ID | Finding | Remediation |
|---|---|---|
| H-49 🟡 | **The countdown deadline is module-global, not mount-relative** (`sale-countdown.tsx` `let deadline`): captured once per JS context on the first CLIENT access and never reset — the header comment claims "genuinely mount-relative" but only the FIRST mount is. After 8h24m of SPA session time every later mount shows a frozen `00:00:00`; the reference recomputes per page load. Every E2E does a full `goto`, so the suite cannot catch it. | Re-arm the deadline when the listener count transitions 0→1 in `subscribe` (a fresh mount cycle = a fresh target; ticking within a mount unchanged). `countdown.test.ts` pins the re-arm seam via a small injectable store (no fake timers on the component). |
| H-50 🟡 | **H-39's sold-out gate is only as fresh as the action-start read** (`cart.ts` `adjustCartItemAction`): `planAdjustment(delta, item.product.stock)` + `planCorrection(qty, item.product.stock)` both consume the pre-read snapshot; a sellout landing between that read and the increment still fires a positive delta, and the `none` correction branch leaves the line inflated with no fresh re-read (only the `clamp` branch re-reads). Bounded by the checkout guard (H-15) but weaker than `addToCartAction`'s per-attempt re-read (G-4). | For POSITIVE deltas, re-read stock immediately before planning and use it for both the plan and the correction base (the window shrinks from the whole action prologue to ~ms; SQLite serializes writers). Decrement path unchanged (always allowed). Residual documented in `adjust-plan.ts`'s header. Unit: planner unchanged (pure) — the executor seam is pinned by the existing H-39 E2E + a new unit on the executor's fresh-read helper. |
| H-51 🟡 | **The "live countdown" E2E pin can pass vacuously**: `s0` is usually the server placeholder (`08:24:00`); the first post-hydration snapshot (`08:23:59`) differs from it even if the interval never fires — `poll(not.toBe(s0))` does not prove a real 1s tick. | Strengthen to TWO client-value transitions: capture `s1` after the first change, then `poll(not.toBe(s1))` — proves the interval keeps firing while mounted (also covers H-49's re-arm: after a client-side remount the value must still move). |
| H-52 🟡 | **The admin rate-budget comment is stale and the budget has zero headroom**: `admin.spec.ts` still opens with "a few extra auth attempts are well under the … budget" while the suite consumes EXACTLY 10/10 (trap §9 #23). A copy-pasted extra admin login (or a `--last-failed` re-run) silently 429s later specs. | Refresh the comment to state the exact-consumption contract and the SQL-fixture rule. No behavior change. |
| H-53 🟡 | **`toggleWishlistAction` bypasses the Zod seam** (`wishlist.ts`): `wishlistMutationSchema` is defined and unused; a malformed `productId` reaches `db.product.findUnique` unvalidated → `PrismaClientValidationError` → raw 500 (the `findUnique` sits OUTSIDE the try/catch). Violates AGENTS.md rule 5 (Zod at every seam). Pre-existing; the file was touched in `c789f2a` (H-42) and left. | Parse at the seam top (`wishlistMutationSchema.safeParse` → `fail("Invalid wishlist request.")`). Unit pins: valid id passes through; empty/non-string rejected before any DB call. |

#### P2 — hygiene / pins

| ID | Finding | Remediation |
|---|---|---|
| H-54 🟢 | Comment/doc-drift bundle (audit nits): `adjust-plan.test.ts` title contradicts its assertion ("never skips a zero delta…" asserts `skip`); `delta = 0` passes the schema and performs a pointless UPDATE + parent touch + revalidate; stale comments — `cart-checkout.spec.ts` "stale 5" / `admin.spec.ts` "still 5" (seed stock is 12), `admin/page.tsx` "take-capped (20)" (list is `take: 8`), `home.spec.ts` "2s window" (timeout is 10s); `product-row.tsx` header comment says `w-[260px] lg:w-[280px]` while the code renders calc() fractions (P-13 makes the comment TRUE again); swatch `key={color}` would warn on duplicate color names. | Fix the test title; add `delta === 0 → skip` to `planAdjustment` (unit-pinned); sweep the stale comments; key swatches by index-color; P-13 aligns the row code with its comment. |
| H-55 🟢 | **Bento geometry has no E2E pin** (audit nit): the P-9 `lg:aspect-[2/3]` stacked tiles + tall-tile stretch were only live-verified — a dropped utility would not fail the suite (the exact class of drift the census doctrine warns about). | New home.spec pin: at desktop the bento is 2 equal columns; the right column stacks two tiles each ≈ half the LEFT tile's height (tall-tile stretch ≈ 2× stacked + gap); mobile tiles are 4:3 / 3:4 (aspect-ratio computed style, viewport-independent assertions). |

**Accepted tradeoffs (documented, not fixed):** H-50's residual race window
(~ms between the fresh pre-read and the increment — the airtight fix is a
$transaction with SQLite's deferred-BEGIN caveat, same class as H-31);
multi-instance sweeper duplication; dev-toolchain npm-audit findings (carried);
real PSP / nonce CSP / skip-to-content / reduced-motion (carried roadmap);
newsletter band renders on ALL storefront pages from the layout (reference
evidence only exists for home — superset choice, visually identical there);
`wishlistMutationSchema` error copy surfaces as a generic envelope fail (no
field errors — the arg is programmatic, never user-typed).

## 4. ToDo ledger (execution order)

| # | Item | Status |
|---|---|---|
| 1 | Unit RED: `countdown-store` re-arm pins (H-49), wishlist-schema seam pins (H-53), `planAdjustment` zero-delta skip (H-54) | ✅ |
| 2 | E2E RED (pre-fix build): P-11 size-chip pins, P-13 mobile 260px pin, P-14 header/countdown pins, H-51 two-transition tick, H-55 bento geometry | ✅ |
| 3 | GREEN: `sale-countdown.tsx` subscribe re-arm (H-49); `wishlist.ts` Zod seam (H-53); `adjust-plan.ts` zero-delta skip (H-54) | ✅ |
| 4 | GREEN parity: ProductCard size-chip row (P-11, selectable superset); mobile-nav tail removal (P-12); product-row `w-[260px] lg:w-[280px]` + `gap-6` (P-13); deals header row merge + stacked countdown (P-14) | ✅ |
| 5 | H-50 fresh-stock pre-read for positive deltas + residual doc; H-52 comment refresh; stale-comment sweep (H-54) | ✅ |
| 6 | Rebuild → full gates (typecheck/lint/unit/build/E2E) — **build BEFORE E2E** (§9 #16) | ✅ |
| 7 | Browser sweep post-fix (heights vs the measured reference: rows 835, deals 3549, card 548/521, drawer 5 items) + screenshots → docs/screenshots/ | ✅ |
| 8 | Docs alignment: SKILL/README/CLAUDE/PAD/plan ledger; worklog session-8 | ✅ |
| 9 | Commit to main; SSH-wrapper push; verify remote ref | ✅ |

## 5. Verification ledger (post-remediation, evidence-backed)

- Unit: **109/109** (14 files — 98 prior + 7 `countdown-store` re-arm/cache +
  1 `planAdjustment` zero-delta skip + 3 `wishlistMutationSchema` seam) ·
  E2E: **118 passed + 2 skipped, observed TWICE consecutively on the final
  build** (60 unique cases × chromium + mobile; TWO desktop-only pins skip on
  the 390px project — P-8 slide-3 and the P-9 sale-grid; the P-4 rewrite went
  viewport-conditional and now runs on BOTH projects; + 2 setup projects) ·
  typecheck/lint/build + assemble clean, observed on the final code.
- Unique-case math: 57 prior + 3 new (P-14 merged-header, H-55 bento
  geometry, P-11 size chips) + 1 rewritten in place (P-4 → viewport-
  conditional 280/260 + gap-24) + 1 rewritten in place (P-9 countdown: H-51
  two-transition tick + P-14 stack pins) + 1 tightened in place (P-12 drawer
  5-item). H-51 and H-55 are characterization/defense-in-depth pins (the
  countdown-freeze and the dropped-aspect drift they guard are not
  deterministically reachable in a single run) — disclosed.
- Red→green evidence: the P-11/P-13/P-14/P-12 pins failed RED on the pre-fix
  build (9 failures across both projects — missing chips, 163px fraction
  cards, split header, 7-item drawer); `countdown-store` failed RED on the
  missing module; the zero-delta pin failed RED on the planner.
- Parity live-verified on the remediated build (1440×900 + 390×844), heights
  vs the SAME-DAY reference measurements: desktop rows 836 (ref 835), deals
  3551 (ref 3549), card 549 (ref 548), page 11085 (ref 11079) — every delta
  ≤2px line-box rounding; mobile rows 801 (ref 800), bento **1331 = 1331
  byte-equal**, card 522 (ref 521), page 11208+ vs 11257 (the residual +49
  is the accepted catalog name-length variance — see §3 A note); drawer 5
  items gaps [20,20,20,20] char-identical panel class; countdown ticking
  real seconds (poll-verified 46→43); hero anchors + marquee + The Edit +
  UGC + newsletter unchanged; console 0 errors.
- **Verification-round refinements** (found by re-measuring after the first
  GREEN, all live-verified byte-equal): row kickers are `mb-2` (8px — the
  clone's `mb-3` made every row header 4px tall); the deals copy carries
  `max-w-[320px]` + `mt-2` (wraps to two 40px lines exactly like the
  reference's 131px header block); the bento's RIGHT tiles are **2:3 at
  EVERY breakpoint** (mobile 342×513 = the image's natural 2:3 — session-7's
  mobile 3:4 was the drift); "View All" is **hidden below lg** (display:none
  measured @390 — the clone's visible link wrapped the mobile row header to
  103–118px vs the reference's uniform 63px).
- **Accepted (documented):** the mobile SALE-GRID tiles render ~20px taller
  than the reference's — the clone's catalog name ("Silk Draped Evening
  Gown") wraps to two lines at 163px while the reference's current (shorter)
  name fits one. Data-driven, not structural; the row-card and bento faces
  are byte-equal. Chasing reference RENAMES per sweep is churn — the
  structural pins hold.
- Screenshots refreshed (20): NEW `clone-size-chips.png` (P-11 evidence) +
  NEW `ref-size-chips.png` (the reference's own chip row, same-day evidence)
  + the standard clone set (home desktop, mobile home/menu, PDP, PLP, login,
  account, admin, cart, exclusive deals, slide-3) + the session-7 reference
  evidence set retained.

## 6. Residual risks / next steps

1. Dev-toolchain npm-audit findings — revisit when vitest 5 / prisma 7 land
   non-breaking paths (carried).
2. Real PSP behind the checkout seam (carried).
3. Skip-to-content + `prefers-reduced-motion` (carried a11y roadmap).
4. Nonce-based CSP to retire `'unsafe-inline'` (carried).
5. The reference oscillates at session/hour granularity — this session it
   removed drawer items and re-grew card stacks. The census-first ritual held:
   all four drifts were caught by height/geometry deltas in ONE sweep. The
   new pins (size chips, 260px mobile, drawer 5-item, bento aspect, merged
   header) make the next move a red test.
6. **E2E admin rate budget remains EXACTLY consumed** (10/10 per IP+email) —
   the H-52 comment now states the contract; SQL-fixture pattern only.
7. P-12 note: the reference's mobile surface now has NO account entry at all;
   if it re-adds ACCOUNT/WISHLIST (it oscillates), restore the clone's tail
   and re-pin 7 items.
8. H-50 residual: a sellout landing inside the ~ms between the fresh pre-read
   and the increment still writes (checkout guard owns the consequence) —
   documented in `adjust-plan.ts`.
9. The countdown remains mount-relative (~8h24m) — matching the reference's
   own measured semantics; H-49 makes it re-arm per mount cycle so SPA
   navigation can no longer freeze it at 00:00:00.
10. shop-client `result-count` derives from the take-capped page load (catalog
    fixed at 12 — latent only).
