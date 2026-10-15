# Remediation Plan — Session 9 (AURELIA / VELOUR clone)

> **Status:** EXECUTED. **Mode:** Audit-first (Mode C) → TDD fixes (Mode A/B).
> **Scope:** (1) fresh-clone re-validation of `890d672` (session-8 + its session
> log — remote carried the completed session-8 work `3c337a1`); (2) a fresh audit
> of the session-8 remediation commit `3c337a1` (skills: `code-review-checklist`,
> `security-and-hardening`, `code-quality-standards`, `tdd`, `agent-browser`, per
> `skills/skills-catalog.md`); (3) a **live reference parity sweep** (desktop
> 1440×900 + mobile 390×844, logged-out) — section-height census FIRST (the
> session-7/8 doctrine), which re-verified every pinned surface identical but
> caught **one drift** the census had been mis-classifying since session 8:
> the product-card NAME font (P-15); (4) TDD remediation of the verified
> findings.

---

## 1. Starting state

Fresh clone at `890d672` (workspace had been reset — the remote already carried
the completed session-8 work `3c337a1` plus the user-added session-8
transcript). Environment rebuilt: npm install, `.env` from the tracked
`.env.example` (`DATABASE_URL="file:../db/custom.db"` + dev AUTH_SECRET),
`db:setup` (4/12/2/4), `npx playwright install chromium` (fresh-sandbox cache —
same quirk as sessions 6–8).

**Baseline gates all green, matching the session-8 ledger exactly:**
typecheck ✓ lint ✓ **109/109 unit (14 files)** ✓ build + assemble ✓
**E2E 118 passed + 2 skipped** (60 unique × 2 + 2 setup) ✓.

`npm audit`: 11 findings (1 moderate / 8 high / 2 critical) — **all
dev-toolchain only**, unchanged from sessions 2–8. Zero runtime exposure →
**accepted with rationale** (carried).

Sandbox note (changed vs sessions 6–8): **egress now works without the CONNECT
forward proxy** — `agent-browser` reached the reference site directly; the
proxy helper was NOT rebuilt this session.

## 2. Audit method

Explore-agent full-diff scan of `3c337a1` (20 code/test files, 8 dimensions) +
main-agent first-hand verification of every 🟡/🟢 before acceptance. All 13
commit-message claims verified TRUE in code (countdown-store re-arm/cache/
ticker-stop, fresh-stock pre-read for positive deltas, wishlist Zod seam,
zero-delta planner skip, two-transition tick pin, exactly-consumed admin
budget, P-11 chips markup outside the Link, P-12 five-item drawer, P-13 fixed
widths, P-14 merged row via testid-parent locator, PDP card-language
alignment). Nine findings survived verification — 4 🟡 + 5 🟢 below.

## 3. Findings → Remediation

### A. Reference drift — visual parity (measured live 2026-10-15)

The census re-verified every pinned surface identical: desktop page 11079
(hero 810, marquee 70, rows 835/706/835/835, deals 3549, 835/835, UGC 746,
newsletter 470 — byte-equal to the session-7/8 ledgers), marquee 18px/300/
5.4px/rgb(126,113,103) + gold ◆ rgb(224,169,41), size chips 10px/py-4px/1px
border rgb(229,224,220)/radius 0/transparent on 548px cards with 158px stacks,
drawer panel class char-identical with 5 inert items over gaps [20,20,20,20],
mobile page 11257. The census ALSO caught the one drift below — and
**corrected session-8's own record**:

| ID | Measured drift (reference = ground truth) | Remediation |
|---|---|---|
| P-15 🟡 | **Every product-card NAME renders in Cormorant Garamond on the reference — the clone renders Montserrat.** The reference's base CSS maps ALL headings (`h1`/`h2`/`h3` — census: 40/40 sampled, including card-name H3s) to the display serif; its `font-body` utility resolves to Montserrat for non-heading elements (brand, "(89)", price, size chips — all Montserrat on both sides ✓) but the H3 element rule wins on names. **Session-8 classified the resulting +61px mobile-deals delta as "accepted catalog name-length variance" — a MISDIAGNOSIS:** the reference's sale-grid slot carries the SAME long name ("Silk Draped Evening Gown") and still fits ONE line (14px Cormorant, 149px < 163px tile), because the family differs, not the name. The clone's Montserrat name wraps to two lines at the 163px mobile sale-grid tiles (name 39px vs 19px → stack 208 vs 187 → tile 441 vs 421 → deals 3232 vs 3171). Latent at desktop (short catalog names fit one line in BOTH fonts at 260–280px, so the 548/549 stacks coincide) — exactly the "unpinned face" class the census doctrine warns about: card-name FONT was never pinned. | `product-card.tsx` name H3: `font-sans` → `font-cormorant` (font-medium/leading-snug/text-sm/mb-2 untouched — the reference measures 14px/500/19.25px). One-line fix covers every card surface (rows, sale grid, related row, wishlist). E2E RED→GREEN: computed `fontFamily` pin on a row-card name + mobile sale-grid name height 19px/one-line pin. Session-8 plan's accepted-variance note annotated as corrected. |

### B. Code audit (session-8 commit `3c337a1`) — all findings first-hand verified

#### P1 — correctness / robustness

| ID | Finding | Remediation |
|---|---|---|
| H-56 🟡 | **H-54 is half-done in the executor**: `planAdjustment` returns `{ kind: "skip" }` and its docstring claims "a no-op must not UPDATE + touch the parent row + revalidate" — but `adjustCartItemAction` has NO skip branch: a `skip` plan falls through to `touchTransientParent("cart", …)` + `revalidatePath("/", "layout")` (`cart.ts:207-208`). A zero-delta call (and the sold-out skip) still bumps the parent `updatedAt` — defeating the sweeper's idle>30d predicate (H-42) for a no-op — and invalidates the router cache pointlessly. | Early-return the skip path: return the fresh DTO WITHOUT the parent touch or revalidate (nothing was written; all routes force-dynamic; the client store re-syncs from the response DTO). |
| H-57 🟡 | **The P-11 E2E is weaker than its documentation**: the plan claims "chip count == sizes length, chip labels, border token via probe" but the shipped test asserts only per-chip fs/pad/border/radius + `chips.length >= 1`; `label`/`bg` are captured and never asserted. Worse, the resting-state capture (`before = borderTopColor`) is never asserted — a build that renders a DEFAULT-SELECTED chip at rest (the exact parity violation P-11 forbids) still passes because clicking toggles the color either way. And the behavioral half — "clicking selects the size the card's Add to Bag posts" — is pinned nowhere (`rg "\bsize\b" cart-checkout.spec.ts` → 0 hits). | Strengthen the pin: assert the resting chip border is NOT the selected token AND bg transparent + labels equal the product's sizes + `chips.length === sizes.length` (server-derived via the size chips' own labels vs the PDP/add payload is not available client-side — pin the label list against the rendered set). Add the behavioral E2E: click the 2nd chip → hover Add to Bag → open the drawer → the line reads `Size: <clicked>`; clean the line up afterwards (within-run residue rule). |
| H-58 🟡 | **P-13's "View All hides below lg" sub-claim has no test** (`rg "View All" tests/e2e/` → 0 hits). The class shipped (`ml-2 hidden lg:inline-block`), but a dropped `hidden` regresses every mobile row header (103–118px vs the measured uniform 63px) silently — the same underpinned-face drift class as P-11/P-15. | Viewport-conditional E2E pin: below lg the row-header "View All" link has `display: none`; at ≥lg it is visible. |
| H-59 🟡 | **`addToCartAction` never allowlists `size` against `product.sizes`**: `cartAddSchema` enforces only `z.string().max(20)`; after the product fetch the action checks `isActive`/`stock` but nothing constrains `size` to the product's actual size list (`sizes` is a JSON-string column). A crafted server-action call can persist an arbitrary ≤20-char variant (duplicate lines per fake size, echoed back into the cart UI; Prisma parameterizes — data integrity only). Pre-existing, but **P-11 widened the seam**: size is now a user-clicked input on every card, not a server-derived `sizes[0]`. | New pure seam `sizeAllowed(productSizesJson, requested)` in `validation.ts` (parse JSON; non-array/malformed/empty → unconstrained `true`; string list → `includes`). The action fails the envelope when the product's sizes are known and the request is foreign. Unit-pinned (6 cases); existing add-to-bag E2Es prove no false positives. UI-driven rejection is unreachable (every surface posts server-derived sizes) — the action wiring itself is 3 lines and disclosed as E2E-unpinned. |

#### P2 — hygiene / pins / docs

| ID | Finding | Remediation |
|---|---|---|
| H-60 🟢 | Session-8 plan §3 H-55 row still says mobile bento tiles are "4:3 / 3:4" while the shipped test (and §5's refinement note) assert stacked tiles `2 / 3` — internal doc drift. | Correct the §3 row in `remediation-plan-session8.md` (annotation, not silent rewrite). |
| H-61 🟢 | Session-8 plan §3 H-50 claims remediation "pinned by … a new unit on the executor's fresh-read helper" — no helper was extracted and no such unit exists (the fresh read is inline). | Correct the §3 row (annotation): coverage is E2E-only via the H-39 sold-out pin (which discriminates: stale 12 → grow vs fresh 0 → skip). |
| H-62 🟢 | The drawer gap pin asserts `gap > 8` — `gap-4` (16px) would pass. The measured truth (re-verified live this session) is 20px ([20,20,20,20]). | Tighten to the measured band: every gap in `19 ≤ g ≤ 21`. |
| — 🟢 | Two audit observations accepted with rationale, no change: swatch keys are index-composite (`${color}-${i}` — documented in session-8 §3, static list, fine); a latent PDP edge where `tag:"SALE"` without `onSale` would render the primary chip (every `tag:"SALE"` row in the catalog carries a `compareAtPrice` — catalog-safe). | Documented here; no code change. |

**Accepted tradeoffs (documented, not fixed):** dev-toolchain npm-audit
findings (carried); real PSP / nonce CSP / skip-to-content / reduced-motion
(carried roadmap); H-50's residual ~ms sellout window (checkout guard owns the
consequence); the countdown's mount-relative semantics (matches the reference);
newsletter band on all storefront pages (superset choice).

## 4. ToDo ledger (execution order)

| # | Item | Status |
|---|---|---|
| 1 | Unit RED: `sizeAllowed` seam pins (H-59 — 4 cases, 11 assertions) | ✅ |
| 2 | E2E RED (pre-fix build): P-15 name-font pin + mobile sale-grid name-height pin (TRUE red); H-57 resting/labels/count + posted-size behavioral pin, H-58 View-All pin, H-62 20px gap band (characterization — pass on the current build, disclosed) | ✅ |
| 3 | GREEN: `product-card.tsx:144` `font-sans` → `font-cormorant` (P-15); `cart.ts` skip early-return (H-56) + `sizeAllowed` wiring (H-59); spec strengthening (H-57/H-58/H-62) | ✅ |
| 4 | Rebuild → full gates (typecheck/lint/unit/build/E2E) — **build BEFORE E2E** (§9 #16) | ✅ |
| 5 | Browser sweep post-fix (mobile deals 3232 → ~3171; desktop unchanged 11085; drawer 5 items [20,20,20,20]; Cormorant card names live) + screenshots → docs/screenshots/ | ✅ |
| 6 | Docs alignment: session-8 plan annotations (H-60/H-61 + P-15 misdiagnosis correction), SKILL/README/CLAUDE/PAD fact refresh, worklog session-9 | ✅ |
| 7 | Commit to main; SSH-wrapper push; verify remote ref | ✅ |

## 5. Verification ledger (post-remediation, evidence-backed)

- Unit: **113/113** (14 files — 109 prior + 4 `sizeAllowed` seam cases:
  offered size accepts, foreign size rejects, unconstrained on
  empty/malformed/non-array data, non-string entries ignored) ·
  E2E: **126 passed + 2 skipped** (63 unique cases × chromium + mobile; two
  desktop-only pins skip on the 390px project — P-8 slide-3 and the P-9
  sale-grid; + 2 setup projects), **observed twice consecutively on the final
  build** · typecheck/lint/build + assemble clean, observed on the final code.
  The +4 unique cases × 2 projects = exactly the +8 execution delta vs the
  session-8 baseline (118+2 → 126+2).
- Unique-case math: session-8 suite + 4 new (P-15 name font, P-15 mobile
  name-height, H-58 View All, H-57b posted-size behavioral) + 1 strengthened
  in place (P-11 resting/labels/count) + 1 tightened in place (P-12 gap band
  19–21).
  H-57/H-58/H-62 pins pass on the pre-fix build too
  (characterization/defense-in-depth — the regressions they guard are not
  present today); P-15's two pins failed RED on the pre-fix build (Montserrat
  measured; the geometric pin failed on the mobile project and the font pin
  on BOTH) and went GREEN after the one-line fix — true red→green evidence.
- Parity live-verified on the remediated build (1440×900 + 390×844): desktop
  page 11085 (ref 11079, ≤2px/section line-box rounding, unchanged by the
  fix — name line box is 19px in both families at desktop widths); **mobile
  deals 3171 = 3171 byte-equal** (was 3232), mobile page 11261 (ref 11257,
  +4px accumulated rounding), sale-grid tiles 421 = 421, card names compute
  to Cormorant Garamond everywhere; drawer 5 items gaps [20,20,20,20]
  char-identical panel; marquee/hero/chips/bento unchanged; console 0 errors.
- Screenshots refreshed: `clone-size-chips.png` (now with Cormorant names),
  `clone-mobile-home.png`, `clone-exclusive-deals.png`, `clone-home-desktop.png`,
  `clone-pdp.png` + the standard set.

## 6. Residual risks / next steps

1. Dev-toolchain npm-audit findings — revisit when vitest 5 / prisma 7 land
   non-breaking paths (carried).
2. Real PSP behind the checkout seam (carried).
3. Skip-to-content + `prefers-reduced-motion` (carried a11y roadmap).
4. Nonce-based CSP to retire `'unsafe-inline'` (carried).
5. The reference oscillates at session/hour granularity — this sweep's census
   matched the session-8 ledger byte-for-byte, and the ONE remaining drift hid
   in a typography face nobody had pinned (name font) — mis-classified as
   content drift for a full session. Lesson added to SKILL §12: **pin
   typography FAMILIES on pinned faces, not just geometry**; a font-family
   census (computed `fontFamily` per heading rank, both sides) is now part of
   the ritual.
6. H-59's action wiring is unit-pinned via the pure seam but not E2E-pinned
   (UI surfaces cannot post a foreign size) — disclosed.
7. H-56's executor skip is behavior-pinned only indirectly (the planner unit +
   the absence of regressions in cart E2Es); a DB-mocking harness would be
   needed for a direct pin — disclosed.
8. P-12 note: if the reference re-adds the drawer ACCOUNT/WISHLIST tail,
   restore the clone's tail and re-pin 7 items (session-8 §6 #7 — unchanged).
9. E2E admin rate budget remains EXACTLY consumed (10/10) — SQL-fixture
   pattern only (unchanged).
