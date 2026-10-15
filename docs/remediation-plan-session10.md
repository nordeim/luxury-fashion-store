# Remediation Plan — Session 10 (AURELIA / VELOUR clone)

> **Status:** EXECUTED. **Mode:** Verify-first (Mode C) → pin-strengthening TDD.
> **Scope:** (1) fresh re-validation of the pulled remote state `220bce5`
> (session-9 work `55e6556` + the user-added session-9 transcript); (2) an audit
> of the session-9 remediation commit `55e6556` (skills: `code-review-checklist`,
> `security-and-hardening`, `code-quality-standards`, `tdd`, `agent-browser`, per
> `skills/skills-catalog.md`); (3) a **live reference parity sweep** (desktop
> 1440×900 + mobile 390×844, logged-out) running the full session-9 ritual —
> section-height census AND the font-family census per heading rank, both sides —
> which re-verified every pinned surface and found **ZERO new drift** (the
> reference has not moved since session 9's same-day sweep); (4) TDD
> remediation of the audit findings — all pin-strengthening, no production-code
> changes required this session.

---

## 1. Starting state

Workspace intact (no reset this session): pull fast-forwarded `55e6556` →
`220bce5`, which added `docs/session_9.md` (the user-visible session-9
transcript) — no code changes. Environment already warm: `.env` pins
`DATABASE_URL="file:../db/custom.db"`, db materialized and canonical
(4 categories / 12 products / 2 users / 4 orders verified live via Prisma
counts), node_modules + Playwright browsers present.

**Baseline gates reproduce the session-9 ledger exactly:**
typecheck ✓ lint ✓ **113/113 unit (14 files)** ✓ build + assemble ✓
**E2E 126 passed + 2 skipped** (63 unique × chromium + mobile + 2 setup) ✓.

`npm audit`: 11 findings (dev-toolchain only) — **accepted with rationale**
(unchanged since session 2; zero runtime exposure).

Sandbox note: egress works without a forward proxy (session-9 state), the dev
server proved flaky under CDP evals (Next.js dev recompiles reload the tab
mid-measurement) — **parity measurements were taken against the production
standalone on :3100** instead (same target the E2E webServer boots; no HMR).

## 2. Audit method

Explore-agent full-diff scan of `55e6556` (claims → evidence) + main-agent
first-hand verification of every finding before acceptance. All six
commit-message claims verified TRUE in code: the P-15 font class switch
(`product-card.tsx:151`), the H-56 skip early-return placed after the
conditional fresh-stock read and before any parent touch
(`cart.ts:185-187`), the `sizeAllowed` pure seam wired BEFORE
`getOrCreateCart` (no cart row minted on a rejected crafted call,
`validation.ts:51-62`, `cart.ts:68-70`), the H-57 resting-state +
behavioral pins, the H-58 viewport-conditional pin, and the H-62 19–21px
gap band. Unit suite re-run green (113/113), test-count arithmetic re-derived
(59 → 63 unique declarations = +4).

## 3. Findings → Remediation

### A. Reference drift — live sweep 2026-10-15 (second sweep, same day): NONE

The full ritual ran on both sides at both viewports:

| Surface (ledger) | Reference (measured) | Clone (measured) | Verdict |
|---|---|---|---|
| Desktop page | **11079** | 11085 (+6) | known line-box rounding |
| Desktop sections | 810/70/835/706/835/835/3549/835/835/746/470 | ≤ +2px each | byte-parity holds |
| Desktop footer | 444 | 444 | equal |
| Mobile page | **11257** | 11264 (+7) | known rounding |
| Mobile deals | **3171** | 3174 (+3) | session-9 pinned residue (P-15) |
| Font census h1/h2/h3 | 100% Cormorant (36 h3 desktop) | 100% Cormorant | P-15 holds |
| Font census h4 | Montserrat ×3 | Montserrat ×3 | holds |
| Mobile drawer panel | `fixed left-0 top-0 h-full w-80 bg-background z-50 p-8 flex flex-col gap-6` | **char-identical** | holds |
| Mobile drawer nav | `flex flex-col gap-5 mt-4`, 5 items, x=32/w=256/h=20, gaps [20,20,20,20] | **identical** | holds (v4 pin intact) |
| Size chips | 10px / 4px / 1px / r0 / transparent / rgb(229,224,220) | identical | P-11 holds |
| Sale-grid name | Cormorant, 19px one-line | Cormorant, 19px | P-15 holds live |

Two structural observations, no visual consequence (documented, no change):

1. The reference renders the newsletter band as the LAST CHILD of `main`
   (11 children); the clone renders it as `main`'s sibling section
   (`(storefront)/layout.tsx` composition) — same 470px band, same visual
   order; the E2E census tests target the visible sections, not the parent.
2. The reference's drawer menu items are inert `<div>`s; the clone's are real
   links (the documented superset). Geometry identical.

### B. Code audit (session-9 commit `55e6556`) — all findings first-hand verified

#### P1 — pin quality (the defect class H-57 itself was raised for)

| ID | Finding | Remediation |
|---|---|---|
| H-63 🟡 | **The H-57 chip-count pin shipped weaker than its own documentation.** The in-test comment says "the labels are the product's size list (H-57: labels + count pinned)" and `remediation-plan-session9.md` §3 H-57 promises "labels equal the product's sizes + `chips.length === sizes.length`" — but the shipped assertion is only `chips.length >= 1` plus label distinctness (`home.spec.ts:327-331`). A build that renders 2 of 4 chips (dropped size in the render path) passes every visual and behavioral pin, because the behavioral test only proves the *clicked* chip posts. | Strengthen in place: locate the first card, read its rendered name h3, resolve the catalog product by name (`import { CATALOG_PRODUCTS } from "../../src/lib/data/catalog"` — the module is pure, zero imports), and assert the chip label list **exactly equals** `catalogProduct.sizes` (count + spelling + order). The pin is characterization on today's build (the render path is `product.sizes.map(...)` — full list) and is demonstrated to have teeth via a build-time mutation demo: `product.sizes.map` → `product.sizes.slice(0, -1).map` → rebuild → the strengthened pin fails RED → revert → rebuild → GREEN. |
| H-64 🟢 | **The post-click "exactly one selected" assertion is hover-confounded** (`home.spec.ts:357-367`): after `first.click()` the pointer rests on the clicked chip, whose class carries `hover:border-foreground` — so `after.filter(c => c !== before).length === 1` passes even if selection never applied and only the hover flip fired (sound today only in combination with H-57b). | Move the pointer away (`page.mouse.move(0, 0)`) before re-reading the borders; hover flips revert, state flips persist. The same assertion then unambiguously means selection, and additionally assert the surviving flip is the clicked chip. |
| H-65 🟢 | **H-58's ≥lg branch is weaker than the <lg branch** (`home.spec.ts:406`): it asserts only `display !== "none"`; a `visibility: hidden` desktop regression would pass. | Also assert `visibility === "visible"` in the ≥lg branch. |

#### P2 — docs hygiene

| ID | Finding | Remediation |
|---|---|---|
| H-66 🟢 | **`remediation-plan-session9.md` contains two internal contradictions** created during its own execution write-up: (a) §3 H-59 says "Unit-pinned (6 cases)" while §4/§5 and the code say 4 (actual: 4 cases, 9 assertions — §4's "11 assertions" is also wrong); (b) §5 records the post-fix mobile parity as "deals 3171 = 3171 byte-equal … page 11261" while the commit message, worklog and today's independent re-measurement all say **3174 vs 3171 / tiles 422 vs 421 / page 11264**. | Correct both §3/§4 spots and the §5 numbers (annotated corrections per the H-60 precedent — not silent rewrites). |
| — 🟢 | Commit-message artifact-list overreach: the "`.env.example` tracked" bullet describes repo status, not this commit's footprint (the file last changed in `7f71490`). No action — noted here so the ledger is accurate. | Documented; no change. |
| — 🟢 | Newsletter-band DOM position differs (see §A) — structural only. | Documented; no change. |

**Accepted (documented, carried):** dev-toolchain npm-audit findings; real PSP /
nonce CSP / skip-to-content / reduced-motion roadmap; H-59's action wiring
E2E-unpinned (UI surfaces cannot post a foreign size) and H-56's executor skip
indirectly pinned (planner unit + cart E2E absence-of-regression) — both
disclosed in session 9, unchanged; the E2E admin rate budget stays exactly
consumed (10/10).

## 4. ToDo ledger (execution order)

| # | Item | Status |
|---|---|---|
| 1 | H-63/H-64/H-65 spec changes (strengthen in place — no new cases, counts stay 113 unit / 63×2 E2E) | ✅ |
| 2 | Characterization baseline: strengthened pins GREEN on the current build | ✅ |
| 3 | Teeth demo for H-63: build-time mutation (`slice(0, -1)` on the chip render path) → RED (exact-list `toEqual` array diff, both assertions in 1.5s) → revert → rebuild → GREEN. Two live lessons en route: the standalone server RENAMES its process to `next-server (v1)` — `pkill -f "standalone/server.js"` silently misses it and `reuseExistingServer` then serves a STALE bundle (EADDRINUSE on the next boot; kill by port/PID); and a Playwright click landing in the pre-hydration window is silently lost (no fiber props → no React handler → the session-9 border poll passed vacuously through it) — fixed with a `__reactFiber$` expando probe before every chip click | ✅ |
| 4 | H-66: annotate `remediation-plan-session9.md` (§3 H-59 counts, §4 assertions, §5 parity numbers) | ✅ |
| 5 | Rebuild → full gates (typecheck/lint/unit/build/E2E, E2E observed twice on the final build) | ✅ |
| 6 | Screenshots refresh → docs/screenshots/ (standalone :3100, desktop + mobile set) | ✅ |
| 7 | Docs alignment: SKILL §12 census-validation note (same-day re-sweep), worklog session-10; README/CLAUDE counts unchanged (verified) | ✅ |
| 8 | Commit to main; SSH-wrapper push; verify remote ref | ✅ |

## 5. Verification ledger (post-remediation, evidence-backed)

- Unit: **113/113** (14 files — unchanged; all edits strengthen existing
  cases in place) · E2E: **126 passed + 2 skipped**, observed **twice
  consecutively** on the final build · typecheck/lint/build + assemble clean.
- H-63 teeth demo: mutated build → the exact-list pin failed RED at the `toEqual` (rendered `[…, "M"]` vs catalog `[…, "M", "L"]` — array diff, 1.5s) on the chromium project; reverted build → GREEN. The pin's discriminative power is demonstrated, not assumed. H-64/H-65 are characterization (disclosed); the H-64 work ALSO surfaced and fixed a real flake source: the pre-hydration lost click (see §4 #3), now guarded by the fiber-key probe in both chip-clicking specs.
- Parity re-verified on the final build (:3100 standalone, 1440×900 + 390×844):
  desktop 11085 / mobile 11264 — identical to the session-9 ledger; drawer
  char-identical with 5 items and gaps [20,20,20,20]; sale-grid names Cormorant
  19px one-line; console clean.
- Screenshots refreshed: clone-home-desktop, clone-mobile-home,
  clone-mobile-menu-open, clone-size-chips, clone-exclusive-deals, clone-pdp,
  clone-shop-plp (+ the reference evidence set re-captured same day).

## 6. Residual risks / next steps

1. Dev-toolchain npm-audit findings — revisit when vitest 5 / prisma 7 land
   non-breaking paths (carried).
2. Real PSP behind the checkout seam (carried).
3. Skip-to-content + `prefers-reduced-motion` (carried a11y roadmap).
4. Nonce-based CSP to retire `'unsafe-inline'` (carried).
5. The reference oscillates at session/hour granularity — today it held still
   across two same-day sweeps, but the ritual (height census + font-family
   census, both viewports) is what keeps a move a red test instead of a
   surprise. Keep running it in FULL every session.
6. If the reference re-adds the drawer ACCOUNT/WISHLIST tail, restore the
   clone's tail and re-pin 7 items (session-8 §6 #7 — unchanged).
7. H-56/H-59 disclosed E2E gaps (DB-mocking harness) — unchanged, carried.
8. E2E admin rate budget remains EXACTLY consumed (10/10) — SQL-fixture
   pattern only (unchanged).
