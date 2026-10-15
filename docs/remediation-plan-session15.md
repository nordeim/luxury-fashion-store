# Remediation Plan — Session 15 (AURELIA / VELOUR clone)

> **Status:** EXECUTED. **Mode:** Verify-first (Mode C) → cold-clone re-validation
> → audit → TDD hardening. **Scope:** (1) fresh-clone re-validation of the pulled
> remote `7a9433b` (session-14 work `ce66888` + the user-added session-14
> transcript) — the workspace had been RESET again (lone "Initial commit", no
> remote), so the environment was rebuilt cold (`npm install`, `.env` re-pinned
> to `file:../db/custom.db`, `db:setup` → canonical 4/12/2/4, Playwright chromium
> v1248); (2) an audit of the session-14 commit `ce66888` (skills:
> `code-review-checklist`, `security-and-hardening`, `code-quality-standards`,
> `tdd`, per `skills/skills-catalog.md`) — all commit-message claims verified
> TRUE first-hand with file:line evidence (G-2 absolute attempt deadline with
> settle-guard + clearTimeout on resolve/end/error, G-1 three non-drifting
> SKILL pointers, round-9 zero-drift census numbers matching the ledger,
> footprint = tool + SKILL + plan + 4 screenshots + worklog — zero production
> code); (3) a **live reference parity sweep round 10** (desktop 1440×900 +
> mobile 390×844, FULL two-census ritual) — **ZERO drift**, the seventh
> consecutive same-day zero-drift sweep (sessions 9→10→11→12→13→14→15); (4) TDD
> remediation of the audit finding **H-71**: the sweep tool's hardened
> `waitHealth` contract (F3 inactivity deadline, G-2 absolute attempt deadline)
> was evidenced only by scratch demos deleted after each session — extracted
> into `scripts/sweep-lib.cjs` and pinned permanently by
> `tests/unit/sweep-lib.test.ts` (6 contract tests, teeth demonstrated by
> mutation).

---

## 1. Starting state

Workspace RESET again (fresh sandbox: lone "Initial commit", no remote, no
codebase). Fresh clone of
`https://github.com/nordeim/luxury-fashion-store.git` → HEAD `7a9433b`
(session-14 `ce66888` + its user-added transcript `docs/session_14.md`), tree
clean. Cold rebuild: `npm install`; `.env` re-pinned
`DATABASE_URL="file:../db/custom.db"` (+ dev `AUTH_SECRET`); `npm run db:setup`
verified live via seed output (4 categories / 12 products / 2 users / 4
orders); `npx playwright install chromium` (v1248 bundle — same fresh-sandbox
quirk as sessions 6–14). The sandbox still leaks a parent-workspace
`DATABASE_URL` — all DB/build commands run `env -u DATABASE_URL` (§9 #12).
`.env.example` verified tracked; its contract matches `.env` (schema-relative
URL, AUTH_SECRET, NEXT_PUBLIC_SITE_URL, TRUST_PROXY).

**Baseline gates on the committed tree (all reproduce the session-14 ledger;**
**third consecutive session with a fully green cold-clone baseline):**

| Gate | Result |
|---|---|
| typecheck | ✓ |
| lint | ✓ |
| unit | ✓ 113/113 (14 files) |
| build + assemble | ✓ |
| E2E | ✓ 132 passed + 2 skipped (66 unique × 2 − 2 viewport skips + 2 setup) |

`npm audit`: 11 findings (1 moderate, 8 high, 2 critical) — composition
re-verified this session: every finding lives in the dev toolchain
(`vitest`/`@vitest/mocker`/`tinypool`, the `eslint-config-next` glob chain,
`prisma` CLI's `@prisma/config`); zero runtime exposure (the production bundle
ships none of these); every fix is a breaking major (`vitest@5`,
`eslint-config-next@14`, `prisma@7`). Accepted with rationale — carried since
session 2, unchanged.

## 2. Audit of `ce66888` (first-hand full-diff verification)

The commit's own claims, verified against the diff and the final tree:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | G-2: absolute 4s per-attempt deadline in `waitHealth` | `scripts/parity-sweep-session11.cjs:52-57` — `settled` flag, `attemptTimer = setTimeout(…, 4000)` destroying the request, `settle()` clears the timer | TRUE |
| 2 | G-2: settle-guard on ALL exit paths (resolve / end / error) | `:60` (200 → `settle()` + resolve), `:61` (non-200 `end` → `settle()` + retry), `:66` (`error` → `settle()` + retry); `clearTimeout` prevents double-fire | TRUE |
| 3 | G-2: 4s > 2s keeps every normal failure path unchanged | `:49-50` comment records the ordering rationale; `:65` retains F3's `req.setTimeout(2000)` inactivity deadline | TRUE |
| 4 | G-2: RED/GREEN numbers recorded in the code | `:43-51` comment: RED = hang killed externally at 12s (exit 124); GREEN = `REJECTED at ~8.5s` | TRUE |
| 5 | G-1: all three per-session SKILL pointers replaced with non-drifting ones | SKILL.md header line 17 ("per-session remediation ledgers `docs/remediation-plan-session<N>.md` (the highest N is latest)"), Appendix B rows 823–824 (same pattern); version 1.7.1 → 1.7.2 | TRUE |
| 6 | Round-9 zero-drift census numbers | `docs/remediation-plan-session14.md` §3 table matches the ledger set (ref 11079/11257, clone 11085/11264, deals 3174/3171, footer 444/1189, gaps [20,20,20,20], fonts 100% Cormorant h1–h3 / Montserrat h4 ×3, chips identical) — and round-10a of THIS session reproduced every number byte-for-byte | TRUE |
| 7 | Final gates on the final tree | reproduced on this cold clone: typecheck ✓ lint ✓ 113/113 unit ✓ build + assemble ✓ E2E 132 + 2 skipped | TRUE |
| 8 | Footprint: plan + 4 screenshots + SKILL + tool + worklog; zero production code | `git show --stat ce66888` — exactly 8 files, none under `src/`; worklog appended append-only | TRUE |

**Findings (new, this audit):**

| ID | Sev | Finding | Remediation (this session) |
|---|---|---|---|
| H-71 | 🟢 LOW | **The sweep tool's hardened `waitHealth` contract is pinned by no permanent test.** The F3 inactivity deadline (session-13) and the G-2 absolute attempt deadline (session-14) were each evidenced by a scratch dribbler harness DELETED after the session — three consecutive sessions rebuilt the same throwaway demo. A future edit to `waitHealth` can silently regress it; the sweep tool GUARDS the parity gates, so its own failure mode (hang past its timeout, or vacuous success) is exactly the trap-#28 "measure the wrong thing confidently" class one level up: the tool-of-tools has no teeth of its own. | **Fixed (see §4 #1–#7).** `waitHealth` + `assertPortFree` extracted into `scripts/sweep-lib.cjs` (side-effect-free, deadlines parameterized with the exact production defaults 2000/4000/500); the tool requires it (single behavior-identical change); `tests/unit/sweep-lib.test.ts` pins the contract with 9 permanent tests (healthy-200 fast resolve, non-200→recovery retry, never-responding socket → inactivity deadline → budget reject (F3), slow-drip responder → absolute attempt deadline → budget reject (G-2), fast-404-forever → budget bounds the loop, 200-with-never-ending-body → resolves at headers (I-1), production-defaults pin, assertPortFree occupied-port diagnostic, assertPortFree free-port resolve). Teeth demonstrated by mutation: attempt-deadline dropped → the slow-drip test RED → restored → GREEN. |
| I-1 | ⚪ INFO | `waitHealth`'s 200-path resolves at HEADERS (`:60`); a 200 responder whose body never ends leaves the socket in flight until child exit. Harmless by design — the health contract is headers-based and the sweep child is killed at exit — now DOCUMENTED as a test (#6) instead of implicit. | Documented + pinned by test. |
| I-2 | ⚪ INFO | A late `'error'` after a 200-resolve drives `retry()` → extra probes until the budget bounds the loop; `reject` after `resolve` is a no-op, so behavior is benign and self-terminating. | No change; recorded here for completeness. |

**Accepted (documented, carried):** G-3 POSIX-only sweep paths; dev-toolchain
npm-audit findings (composition re-verified above); real PSP behind the
checkout seam; nonce CSP; H-56/H-59 disclosed E2E gaps; E2E admin rate budget
exactly consumed (10/10); superset heading counts (clone 13 h2 / 42 h3 vs ref
11 / 36); `axe-core` unused devDependency; A-2 auth asymmetry; skip-link focus
reflow.

## 3. Live reference sweep — round 10 (measured 2026-10-16): ZERO drift

Pre-change census (10a, committed G-2-hardened tool):

| Surface (ledger) | Reference (10a) | Clone (10a) | Verdict |
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

**The reference has now held still across SEVEN consecutive same-day sweeps
(sessions 9→10→11→12→13→14→15).** Post-change round 10b (after the H-71
extraction) re-measured **byte-identical to 10a and to every ledger** — the
extraction is measurement-rest-invariant BY MEASUREMENT, and the extracted
`waitHealth`'s success path (health 200 → settle → resolve) is exercised by
every sweep by construction.

## 4. ToDo ledger (execution order)

| # | Item | Status |
|---|---|---|
| 1 | Cold env rebuild (clone → install → `.env` → `db:setup` → chromium) + baseline gates | ✅ |
| 2 | Baseline fully green on every gate (third consecutive session) | ✅ |
| 3 | First-hand audit of `ce66888` (8 claims + new-issue scan) | ✅ |
| 4 | Parity sweep round 10a (both viewports, zero drift) | ✅ |
| 5 | H-71 RED: `tests/unit/sweep-lib.test.ts` written FIRST against the not-yet-existing `scripts/sweep-lib.cjs` → module-not-found RED | ✅ |
| 6 | H-71 GREEN: `scripts/sweep-lib.cjs` extracted (waitHealth + assertPortFree, parameterized deadlines, side-effect-free); tool requires it; 9/9 contract tests green | ✅ |
| 7 | H-71 teeth demo: attempt deadline dropped in the lib → slow-drip test RED → restored → GREEN | ✅ |
| 8 | Round 10b post-change census with the refactored tool: byte-identical to 10a and all ledgers | ✅ |
| 9 | Docs alignment: README badge/tables, CLAUDE gate line, SKILL v1.8.0 (§2 counts + Appendix B sweep-lib row), PAD test table — unit count 113→122, files 14→15 | ✅ |
| 10 | Screenshots refreshed (`--shots`, 9 surfaces) on the remediated standalone | ✅ |
| 11 | Full gates on the final tree (typecheck/lint/122 unit/build + E2E 132+2) | ✅ |
| 12 | worklog session-15 entry; commit to main; SSH-wrapper push (dry-run first); verify remote ref | ✅ |

## 5. Verification ledger (post-remediation, evidence-backed)

- **H-71 RED (observed):** `npx vitest run tests/unit/sweep-lib.test.ts`
  against a tree without `scripts/sweep-lib.cjs` → all 6 tests fail with
  `Failed to resolve import "../../scripts/sweep-lib.cjs"` — the test layer
  demonstrably precedes the implementation.
- **H-71 GREEN (observed):** after the extraction (lib + tool refactored to
  `require("./sweep-lib.cjs")`), the same command → **6 passed**. The suite
  covers, against REAL fixture servers (node:http / node:net): fast-200
  resolve; 404→200 recovery through the retry path; never-responding socket
  (F3: inactivity deadline fires, budget rejects `server timeout`); slow-drip
  404 that never idles and never ends (G-2: the ABSOLUTE attempt deadline
  destroys each attempt, budget rejects — the old code hangs here forever);
  fast-404-forever (budget bounds and terminates the loop); 200-with-never-
  ending-body (headers-based health contract, I-1); the production-defaults
  pin (WAIT_HEALTH_DEFAULTS = 2000/4000/500); assertPortFree's occupied-port
  diagnostic (M1) and free-port resolve. Parameterized deadlines
  keep the suite fast (<4s) while the production defaults (2000/4000/500) are
  byte-identical to the pre-refactor constants.
- **H-71 teeth (observed):** mutating the lib to drop the absolute attempt
  deadline (`attemptDeadlineMs` ignored) → the slow-drip test turns RED
  (hangs into the elapsed bound) while the fast-404 test stays GREEN (the
  inactivity deadline alone still covers it) — exactly the regression class
  G-2 closed, now caught by the permanent suite. Restored → GREEN again.
- **Round 10b (observed):** refactored tool, free port → census byte-identical
  to 10a and to the session-9..14 ledgers (ref 11079/11257; clone 11085/11264;
  deals 3174; footer 444/1189; drawer panel class char-identical; nav gaps
  [20,20,20,20]; fonts 100% Cormorant h1–h3 / Montserrat h4; chips identical;
  console clean) — the H-71 refactor is measurement-rest-invariant BY
  MEASUREMENT.
- **Final gates on the final tree (observed):** typecheck ✓ lint ✓ **122/122
  unit (15 files)** ✓ build + assemble ✓ E2E 132 passed + 2 skipped
  (arithmetic exact). NO production code changed this session — the tree
  deltas are the sweep tool's extraction + its new test file + docs counts +
  screenshots + the worklog.
- Screenshots re-captured on the standalone (9 surfaces); byte-diffs are the
  documented choreography class (hero auto-advance slide state behind the
  drawer overlay, mount-relative countdown ticks); both mobile drawer captures
  verified visually: five-item panel, logotype, 20px gaps — pixel-identical
  between clone and reference.

## 6. Residual risks / next steps

1. H-71's parameterization adds an options surface to `waitHealth` — the tool
   calls it with defaults only; the defaults are pinned byte-identical by the
   test asserting the production constants via the lib's export. (Kept a
   single caller; no API sprawl.)
2. G-3 POSIX-only sweep paths — fix before using the tool on Windows (carried).
3. Dev-toolchain npm-audit findings — revisit when vitest 5 / prisma 7 land
   non-breaking paths (carried; composition re-verified this session).
4. Real PSP behind the checkout seam (carried).
5. Nonce-based CSP to retire `'unsafe-inline'` (carried).
6. H-56/H-59 disclosed E2E gaps (DB-mocking harness) — unchanged, carried.
7. E2E admin rate budget remains EXACTLY consumed (10/10) — SQL-fixture
   pattern only (unchanged).
8. `axe-core` unused devDependency (I3) — adopt for automated a11y audits or
   remove in a dependency-hygiene pass.
9. Keep running the FULL two-census ritual every session — seven same-day
   zero-drift sweeps is a streak, not a guarantee (session-10 §6 #5).
10. If the reference re-adds the drawer ACCOUNT/WISHLIST tail, restore the
    clone's tail and re-pin 7 items (session-8 §6 #7 — unchanged).
