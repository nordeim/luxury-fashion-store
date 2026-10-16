# Remediation Plan — Session 16 (AURELIA / VELOUR clone)

> **Status:** EXECUTED. **Mode:** Verify-first (Mode C) → cold-clone re-validation
> → audit → TDD remediation. **Scope:** (1) fresh-clone re-validation of the
> pulled remote `5bb9013` (session-15 work `b1f9808` + the user-added session-15
> transcript) — the workspace had been RESET again (lone "Initial commit", no
> remote), so the environment was rebuilt cold (`npm install`, `.env` re-pinned
> to `file:../db/custom.db`, `db:setup` → canonical 4/12/2/4, Playwright chromium
> v1248); (2) an audit of the session-15 commit `b1f9808` (skills:
> `code-review-checklist`, `security-and-hardening`, `code-quality-standards`,
> `tdd`, per `skills/skills-catalog.md`) — all commit-message claims verified
> TRUE first-hand with file:line evidence (zero production diff under `src/` +
> `prisma/`; `scripts/sweep-lib.cjs` extraction behavior-identical with
> `WAIT_HEALTH_DEFAULTS` = 2000/4000/500 frozen; 9 real-fixture contract tests;
> docs counts 113→122 / 14→15 aligned across CLAUDE/PAD/README/SKILL/vitest
> config); (3) a **live reference parity sweep round 11** (desktop 1440×900 +
> mobile 390×844, FULL two-census ritual) — **ZERO drift**, the eighth
> consecutive same-day zero-drift sweep (sessions 9→…→16); (4) TDD remediation
> of the audit finding **K-1**: the carried `axe-core` unused-devDependency
> residual (#7, open since session 11) is closed BY ADOPTION — a permanent
> automated a11y gate (`tests/e2e/accessibility-axe.spec.ts`) whose RED run
> surfaced and drove two zero-visual-change production fixes (aria-prohibited
> swatch spans; Label-in-Name logotype).

---

## 1. Starting state

Workspace RESET again (fresh sandbox: lone "Initial commit", no remote, no
codebase). Fresh clone of
`https://github.com/nordeim/luxury-fashion-store.git` → HEAD `5bb9013`
(session-15 `b1f9808` + its user-added transcript `docs/session_15.md`), tree
clean. Cold rebuild: `npm install`; `.env` re-pinned
`DATABASE_URL="file:../db/custom.db"` (+ dev `AUTH_SECRET`); `npm run db:setup`
verified live via seed output (4 categories / 12 products / 2 users / 4
orders); `npx playwright install chromium` (v1248 bundle — same fresh-sandbox
quirk as sessions 6–15). The sandbox still leaks a parent-workspace
`DATABASE_URL` — all DB/build commands run `env -u DATABASE_URL` (§9 #12).
`.env.example` verified tracked; its contract matches `.env` (schema-relative
URL, AUTH_SECRET, NEXT_PUBLIC_SITE_URL, TRUST_PROXY).

**Baseline gates on the committed tree (all reproduce the session-15 ledger;**
**fourth consecutive session with a fully green cold-clone baseline):**

| Gate | Result |
|---|---|
| typecheck | ✓ |
| lint | ✓ |
| unit | ✓ 122/122 (15 files) |
| build + assemble | ✓ |
| E2E | ✓ 132 passed + 2 skipped (66 unique × 2 − 2 viewport skips + 2 setup) |

`npm audit`: 11 findings (1 moderate, 8 high, 2 critical) — re-verified
unchanged; every finding lives in the dev toolchain (`vitest` chain,
`eslint-config-next` glob chain, `prisma` CLI's `@prisma/config`); zero runtime
exposure; every fix is a breaking major. Accepted with rationale — carried.

## 2. Audit of `b1f9808` (first-hand full-diff verification)

The commit's own claims, verified against the diff and the final tree:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | Zero production code | `git show b1f9808 -- src/ prisma/ next.config.ts package.json` is EMPTY; footprint = tool + lib + tests + docs + screenshots + worklog | TRUE |
| 2 | `sweep-lib.cjs` extraction, behavior-identical | `scripts/sweep-lib.cjs:24-27` — `WAIT_HEALTH_DEFAULTS = Object.freeze({ inactivityMs: 2000, attemptDeadlineMs: 4000, retryDelayMs: 500 })`; settle-guard on all three exit paths (`:77` 200-resolve, `:79` non-200 end→retry, `:86` error→retry); F3 `req.setTimeout(inactivityMs)` retained `:84` | TRUE |
| 3 | Tool requires the lib (single change) | `scripts/parity-sweep-session11.cjs:13` — `const { assertPortFree, waitHealth } = require("./sweep-lib.cjs")`; the deleted inline bodies are byte-equivalent to the lib | TRUE |
| 4 | 9 permanent contract tests against real fixtures | `tests/unit/sweep-lib.test.ts` — fast-200, 404→200 recovery, F3 never-responding (raw `net` server), G-2 slow-drip (404 + 40ms drip), fast-404-forever budget bound, I-1 200-at-headers, defaults pin, assertPortFree occupied/free | TRUE |
| 5 | Docs counts 113→122 / 14→15 | CLAUDE.md gate line; PAD test table (15 \| 122); README badge + 2 tables; SKILL §2 + §11; vitest.config.ts header — all updated in the commit; re-verified against the live suites this session | TRUE |
| 6 | Round-10 zero-drift census | `docs/remediation-plan-session15.md` §3 matches the ledger set (ref 11079/11257, clone 11085/11264, deals 3174/3171, footer 444/1189, drawer char-identical, gaps [20,20,20,20], fonts 100% Cormorant h1–h3 / Montserrat h4 ×3, chips identical) — and round-11a of THIS session reproduced every number byte-for-byte | TRUE |
| 7 | Final gates on the final tree | reproduced on this cold clone: typecheck ✓ lint ✓ 122/122 unit ✓ build + assemble ✓ E2E 132 + 2 skipped | TRUE |
| 8 | RED→GREEN→teeth for H-71 | commit message + plan-session15 §5 (RED = module-not-found ×9; teeth = attempt-deadline dropped → exactly the slow-drip test RED); the shipped test file's structure matches the described suite | TRUE |

**Findings (new, this audit):**

| ID | Sev | Finding | Remediation (this session) |
|---|---|---|---|
| K-1 | 🟠 MEDIUM (product) | **The carried `axe-core` residual (#7, open since session 11) is a real gap: the codebase has NO automated a11y regression gate, and the tree carries fixable WCAG violations.** Measured first-hand (scratch probe, deleted after the session's decision): `aria-prohibited-attr` (serious) ×126 node-instances across home/shop/PDP — every product-card color swatch is `<span title aria-label>` (aria-label is PROHIBITED on the generic role); `label-content-name-mismatch` (serious) ×1 per surface — the header logotype link's `aria-label="AURELIA home"` does not contain its visible text (WCAG 2.5.3 Label-in-Name). Meanwhile `axe-core@4.10` sits imported nowhere (the "axe" grep hits are `max-w-md`). | **Fixed by ADOPTION (see §4 #5–#8).** New permanent gate `tests/e2e/accessibility-axe.spec.ts`: axe-core injected into the page on home/shop/PDP/cart/login at BOTH device projects, logged-out (empty storageState — zero rate-budget consumption), asserting ZERO WCAG 2.0/2.1 A+AA violations; `color-contrast` is the single excluded rule with a loud parity-law rationale (the warm-paper/gold/muted palette IS the reference's measured identity §4/§19 — the reference fails the same rule on the same nodes). RED first (8/10 fail), then two production fixes (below) → GREEN. |
| K-2 | ⚪ NIT | The sweep tool requires `fs` twice (`const fs = require("fs")` inside the IIFE and a literal `require("fs").writeFileSync` at exit) — harmless duplication, pre-existing, no behavior impact. | No change (recorded). |
| K-3 | ⚪ INFO | `waitHealth`'s I-2 class (post-resolve late errors drive self-terminating retries until the budget) is documented in the lib header but unpinned; the 200-with-never-ending-body test (I-1) covers the same socket family, and reject-after-resolve is a no-op — benign by construction. | No change (recorded). |

**Accepted (documented, carried):** G-3 POSIX-only sweep paths; dev-toolchain
npm-audit findings; real PSP behind the checkout seam; nonce CSP; H-56/H-59
disclosed E2E gaps; E2E admin rate budget exactly consumed (10/10); superset
heading counts (clone 13 h2 / 42 h3 vs ref 11 / 36); A-2 auth asymmetry;
skip-link focus reflow; color-contrast findings (parity-law exclusion, above).

## 3. Live reference sweep — round 11 (measured 2026-10-16): ZERO drift

Pre-change census (11a, committed tool):

| Surface (ledger) | Reference (11a) | Clone (11a) | Verdict |
|---|---|---|---|
| Desktop page | **11079** | 11085 (+6) | known line-box rounding |
| Desktop sections | 810/70/835/706/835/835/3549/835/835/746/470 | 810/70/836/706/836/836/3551/836/836/746 | ≤ +2px each — byte-parity holds |
| Desktop footer | 444 | 444 | equal |
| Mobile page | **11257** | 11264 (+7) | known rounding |
| Mobile sections | 591/70/800/742/800/840/**3171**/800/800/774/569 | 591/70/801/742/801/841/**3174**/801/801/774 | deals **3174** — session-9 pinned residue; ≤ +1px each |
| Mobile footer | 1189 | 1189 | equal |
| Font census h1/h2/h3 | 100% Cormorant (1/11/36) | 100% Cormorant (1/13/42 — superset counts) | families hold |
| Font census h4 | Montserrat ×3 | Montserrat ×3 | holds |
| Mobile drawer panel | `fixed left-0 top-0 h-full w-80 bg-background z-50 p-8 flex flex-col gap-6` | **char-identical** | holds |
| Mobile drawer nav | `flex flex-col gap-5 mt-4`, 5 items x=32/w=256/h=20, gaps [20,20,20,20] | **identical** | v4 pin intact |
| Size chips (resting) | 10px / 10px pad / 4px py / r0 / transparent / rgb(229,224,220) | identical | P-11 holds |
| Card-name h3 | Cormorant (72px desktop) | identical | P-15 holds |
| Marquee | present | present | P-3 holds |
| Console | 2 ref-side 401s (reference's own backend) | clean | — |

**The reference has now held still across EIGHT consecutive same-day sweeps
(sessions 9→10→11→12→13→14→15→16).** Post-change round 11b (after the K-1
production fixes + rebuild) re-measured **byte-identical to 11a and to every
ledger on every field (pageH/secs/footerH/ranks/pinned + drawer panelCls/navCls/
items/gaps)** — the fixes are rest-invariant BY MEASUREMENT (both are
attribute-level semantics: `role` and the removal of an `aria-label`; zero
visual or layout surface).

## 4. ToDo ledger (execution order)

| # | Item | Status |
|---|---|---|
| 1 | Cold env rebuild (clone → install → `.env` → `db:setup` → chromium) + baseline gates | ✅ |
| 2 | Baseline fully green on every gate (fourth consecutive session) | ✅ |
| 3 | First-hand audit of `b1f9808` (8 claims + new-issue scan) | ✅ |
| 4 | Parity sweep round 11a (both viewports, zero drift) | ✅ |
| 5 | K-1 RED: `tests/e2e/accessibility-axe.spec.ts` (axe probe first measured the violation landscape: 3 serious classes, 2 fixable) → 8/10 RED on the pre-fix tree | ✅ |
| 6 | K-1 GREEN #1: `role="img"` on the product-card color swatches (aria-label becomes permitted; SRs announce the color; title retained) → aria-prohibited-attr ×126 GONE | ✅ |
| 7 | K-1 GREEN #2: header logotype — measured axe's own text walk (`visibleVirtual` concatenates text nodes RAW → token `velourparis`; rule matches contiguous token subsequences), so NO aria-label can satisfy Label-in-Name across the h1+tagline block pair → the aria-label is REMOVED (name computed from content, holds by construction; home.spec pin re-scoped to `header` role query) → mismatch GONE, 10/10 GREEN | ✅ |
| 8 | Round 11b post-change census with the fixed tree: byte-identical to 11a and all ledgers | ✅ |
| 9 | Screenshots refreshed (`--shots`, 9 surfaces) on the remediated standalone; mobile drawer capture visually verified (five-item panel pixel-identical) | ✅ |
| 10 | Docs alignment: SKILL v1.9.0 (project_state, §2 E2E row, §8 axe-gate bullet, §9 trap #30, §11 verify line, Appendix B row); README badge/tables; CLAUDE gate line + testing bullet; PAD test table (11 files \| 71 cases) + verify line + coverage map | ✅ |
| 11 | Full gates on the final tree (typecheck/lint/122 unit/build + E2E 142+2) | ✅ |
| 12 | worklog session-16 entry; commit to main; SSH-wrapper push (dry-run first); verify remote ref | ✅ |

## 5. Verification ledger (post-remediation, evidence-backed)

- **K-1 RED (observed):** `npx playwright test tests/e2e/accessibility-axe.spec.ts`
  on the pre-fix tree → **8 failed / 4 passed** — every product-surface test
  failed on both projects (aria-prohibited-attr + label-content-name-mismatch);
  login passed clean on both. The gate demonstrably precedes the fixes.
- **K-1 GREEN (observed):** after `role="img"` (product-card.tsx) + the
  logotype fix (header.tsx) + rebuild → **12 passed** (10 axe tests + 2 setup),
  twice. Zero violations of the enabled WCAG 2.0/2.1 A+AA ruleset on all five
  surfaces × both viewports.
- **K-1 root-cause record (observed via axe.setup + text.visibleVirtual):**
  the rule's comparison is token-based — `curateTokens` NFKD-normalizes,
  strips punctuation (incl. `·`), and `isLabelContainedInName` demands a
  CONTIGUOUS token subsequence; axe's visible-text walk returns
  `"velourparis · milan · new york"` (text nodes concatenated RAW — the JSX
  whitespace between the `h1` and the tagline `p` belongs to neither node).
  Every candidate aria-label was measured failing: `"AURELIA home"`,
  `"VELOUR — AURELIA home"`, even the verbatim-looking
  `"VELOUR PARIS · MILAN · NEW YORK — AURELIA home"` (tokens
  `[velour,paris,…]` can never contain the contiguous needle
  `[velourparis,…]`). Removing the label makes accText == visibleText by
  construction. Recorded as SKILL trap #30.
- **Round 11b (observed):** post-fix tree → census byte-identical to 11a and
  to the session-9..15 ledgers (all four pageH/secs/footerH sets, font ranks,
  pinned chips/nameH3/marquee, drawer panelCls char-identical, nav gaps
  [20,20,20,20], console clean) — the K-1 fixes are measurement-rest-invariant
  BY MEASUREMENT.
- **Final gates on the final tree (observed):** typecheck ✓ lint ✓ **122/122
  unit (15 files)** ✓ build + assemble ✓ E2E **142 passed + 2 skipped**
  (71 unique × 2 − 2 viewport skips + 2 setup; arithmetic exact) — the two
  desktop-only geometry pins still skip on mobile, nothing else.
- Screenshots re-captured on the remediated standalone (9 surfaces); the 5
  byte-diff PNGs are the documented choreography class (hero auto-advance
  slide state, mount-relative countdown ticks); the mobile drawer capture
  verified visually: five-item panel, VELOUR logotype, 20px gaps —
  pixel-identical between clone and reference.

## 6. Residual risks / next steps

1. `color-contrast` remains excluded from the axe gate BY DOCUMENTED DECISION
   (parity law §1/§4/§19). If the brand ever re-tunes the palette, re-enable
   the rule and fix forward; the gate's exclusion is a single loud line in the
   spec header.
2. G-3 POSIX-only sweep paths — fix before using the tool on Windows (carried).
3. Dev-toolchain npm-audit findings — revisit when vitest 5 / prisma 7 land
   non-breaking paths (carried; composition re-verified this session).
4. Real PSP behind the checkout seam (carried).
5. Nonce-based CSP to retire `'unsafe-inline'` (carried).
6. H-56/H-59 disclosed E2E gaps (DB-mocking harness) — unchanged, carried.
7. E2E admin rate budget remains EXACTLY consumed (10/10) — SQL-fixture
   pattern only (unchanged; the axe gate is logged-out and consumes none).
8. K-3: `waitHealth`'s I-2 post-resolve retry class remains documented-but-
   unpinned; the I-1 test covers the same socket family. Pin only if the lib's
   retry loop is ever restructured.
9. Keep running the FULL two-census ritual every session — eight same-day
   zero-drift sweeps is a streak, not a guarantee (session-10 §6 #5).
10. If the reference re-adds the drawer ACCOUNT/WISHLIST tail, restore the
    clone's tail and re-pin 7 items (session-8 §6 #7 — unchanged).
