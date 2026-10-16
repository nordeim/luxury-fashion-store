# Remediation Plan — Session 18 (AURELIA / VELOUR clone)

> **Status:** EXECUTED. **Mode:** Verify-first (Mode C) → warm-workspace
> re-validation → audit → sweep → TDD remediation. **Scope:** (1) reconciliation
> of the pulled remote `9bfc484` (session-17 work `ae4e26e` + the user-added
> session-17 transcript; the workspace carried a container auto-commit that
> added unrelated `skills/*` folders and was dropped — tooling preserved
> untracked, tree reset to `origin/main`); (2) an audit of the never-audited
> session-17 commit `ae4e26e` (skills: `code-review-checklist`,
> `security-and-hardening`, `tdd`, per `skills/skills-catalog.md`) — all claims
> verified first-hand (footprint, the header accessible-name compositions, the
> ten-surface axe spec contract, axe-core load-bearing, §11 pins, npm-audit
> composition); (3) a **live reference parity sweep round 13** (desktop
> 1440×900 + mobile 390×844, FULL two-census ritual) — **ZERO drift**, the
> TENTH consecutive same-day zero-drift sweep; (4) the L-3 seam OPENED and
> TDD-remediated: the axe gate now audits the ADMIN surfaces via a
> **SQL-minted admin storageState** (a session-row fixture + an offline HMAC —
> ZERO logins), which immediately measured a real serious-class violation on
> `/admin/products` (**M-1**), driving one more zero-visual-change production
> fix (trap #32).

---

## 1. Starting state

The workspace was warm but carried a container auto-commit (`3c0f65f`, UUID
message) that added unrelated container `skills/*` folders, `upload/`,
`download/` — no project work; remote had advanced by one user commit
(`9bfc484`, the session-17 transcript). Reconciliation: the tree reset to
`origin/main` (`9bfc484`), the container paths preserved untracked and
locally excluded via `.git/info/exclude` (never the committed `.gitignore`),
and the remote-added `docs/session_17.md` restored. `.env` verified:
`DATABASE_URL="file:../db/custom.db"` (+ dev `AUTH_SECRET`,
`NEXT_PUBLIC_SITE_URL`); `.env.example` tracked with the identical contract.
Seed verified canonical 4/12/2/4 via a scratch script (deleted after use).
The sandbox `DATABASE_URL` leak persists — all DB/build commands run
`env -u DATABASE_URL` (§9 #12).

**Baseline gates on the committed tree (all reproduce the session-17 ledger;
SIXTH consecutive session fully green):**

| Gate | Result |
|---|---|
| typecheck | ✓ |
| lint | ✓ |
| unit | ✓ 122/122 (15 files) |
| build + assemble | ✓ |
| E2E | ✓ 152 passed + 2 skipped (76 unique × 2 − 2 viewport skips + 2 setup) |

`npm audit`: 11 findings (1 moderate, 8 high, 2 critical) — re-verified
unchanged; all dev-toolchain; accepted with rationale — carried.

## 2. Audit of `ae4e26e` (first-hand full-diff verification)

The commit's own claims, verified against the diff and the final tree:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | Production changes = exactly two accessible-name compositions | `git show ae4e26e -- src/` touches ONLY `header.tsx` (wishlist heart + bag button fold the badge count in when it renders, at-rest labels byte-identical, trap-#31 rationale comments present) | TRUE |
| 2 | The L-1 gate spec contract | `tests/e2e/accessibility-axe.spec.ts`: 10 surfaces × both projects — 7 logged-out with the empty storageState, 3 logged-in reusing the per-project storageState; A+AA tag set; `color-contrast` the single excluded rule with the loud parity-law rationale; self-cleaning fixtures (H-27 detach-wait loop; heart toggled back off) | TRUE |
| 3 | axe-core load-bearing | `package.json` devDependency `axe-core@^4.10.0`; `rg -l axe-core tests/ src/ scripts/` → the gate spec alone | TRUE |
| 4 | RED→GREEN evidence | plan-session17 §5 records RED 5/17 with the one-root-cause-class analysis; the GREEN state re-observed live this session (the 10-surface gate passes inside the full suite) | TRUE |
| 5 | Round-12 zero-drift census | plan-session17 §3 matches the ledger set — and round-13a of THIS session reproduced every field byte-for-byte | TRUE |
| 6 | Docs aligned (142→152, 71→76, trap #31) | SKILL v1.10.0 (project_state, §2, §8, §9 #31, §11, Appendix B), README badge + counts, CLAUDE gate line, PAD test table + coverage map — all re-read this session | TRUE |
| 7 | Final gates on the final tree | reproduced on this tree: typecheck ✓ lint ✓ 122/122 unit ✓ build + assemble ✓ E2E 152 + 2 skipped (arithmetic exact) | TRUE |
| 8 | `.env.example` tracked, screenshots refreshed | `git ls-files .env.example` non-empty; five refreshed screenshots in the commit footprint; the drawer capture re-verified visually this session | TRUE |

`9bfc484` (user commit): adds `docs/session_17.md` (69 lines, the session-17
transcript) — docs only, no code. No action needed.

**Findings (new, this audit):** none at the audit layer — the audit came back
8/8 TRUE with zero production regressions. The new findings arrived from the
L-3 probe (§4).

## 3. Live reference sweep — round 13 (measured 2026-10-16): ZERO drift

Round-13a census (pre-change, committed tree) byte-equal to the session-9..17
ledger on EVERY field:

| Surface (ledger) | Reference (13a) | Clone (13a) | Verdict |
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
| Card-name h3 | Cormorant (72px desktop / 48px mobile) | identical | P-15 holds |
| Marquee | present | present | P-3 holds |

**The reference has now held still across TEN consecutive same-day sweeps
(sessions 9→…→18).** Round-13b (post-M-1-fix tree) re-measured **byte-equal
to 13a on every field** — the fix is rest-invariant BY MEASUREMENT (an
`aria-label` change is invisible to the resting census; the visible state
word "Visible"/"Hidden" is untouched).

## 4. The L-3 seam — opened, measured, remediated (TDD)

Session-17 carried L-3: the axe gate cannot reach the ADMIN surfaces while
the admin login bucket is exactly consumed (10/10, §9 #23). This session
opened the seam with a **SQL-minted admin session** — zero login calls:

1. **Mechanism (measurement first):** a scratch probe (deleted after the
   decision) minted a session offline — a random 256-bit token, HMAC'd with
   the webServer's own `AUTH_SECRET` (`playwright-e2e-session-secret`,
   playwright.config.ts), backed by a `Session` row inserted via
   `INSERT … SELECT` through `prisma db execute` against `db/e2e.db` (the
   proven H-2 pattern; the admin's id resolved by the DB itself). The
   probe drove `/admin`, `/admin/products`, `/admin/orders`, an order
   detail page at BOTH viewports and ran axe.
2. **Finding M-1 (real, serious class):** `/admin/products` fails
   `label-content-name-mismatch` (serious) × **12** (one per product row) on
   BOTH viewports — the visibility toggle carries
   `aria-label="Hide <name>"` / `"Show <name>"` while its visible text is
   **"Visible"** / **"Hidden"** (the state word is not contained in the
   accessible name; WCAG 2.5.3). Same root-cause CLASS as L-1/trap #31 (a
   badge digit), a NEW instance the logged-in gate could never see — the
   admin wall hid its own a11y debt, exactly as L-3 predicted. The other
   three admin surfaces probed CLEAN. Verified against the installed
   axe-core 4.10 matcher (`Yy`/`Wy`: punctuation-stripped whitespace tokens,
   contiguous-subsequence containment) — BOTH "Visible, hide X" and
   "Visible — hide X" pass; "Hide X" fails.
3. **TDD RED:** the gate extended to **14 surfaces × both projects** (7
   logged-out + 3 logged-in + 4 admin: dashboard / products / orders /
   order-detail-via-first-link, the L-2 lesson respected). Run on the
   pre-fix tree → **2 failed / 28 passed** — the two `admin products` tests
   on both projects, `label-content-name-mismatch(serious)×12`, everything
   else green. The gate demonstrably precedes the fix.
4. **GREEN:** `admin-products-table.tsx` composes the accessible name from
   the same state the visible word renders (`Visible, hide <name>` /
   `Hidden, show <name>`; comma format mirrors the proven trap-#31 pattern)
   → after rebuild (trap #16) the gate runs **30/30** (28 gate tests + 2
   setup). Playwright's role-name matching is case-insensitive SUBSTRING by
   default, so the H-7 pin (`getByRole("button", { name: "Hide Wide-Brim
   Felt Hat" })`) survives unchanged — verified, zero test churn.
5. **Supporting change:** `E2E_AUTH_SECRET` moved to
   `tests/e2e/e2e-secrets.ts`, imported by BOTH playwright.config.ts (the
   value is byte-identical to the previously inlined string) and the gate
   spec — the drift between the HMAC and the server secret is now
   impossible by construction.
6. **Hygiene:** the minted session row is deleted in `afterAll`
   (self-cleaning); global-setup wipes sessions anyway; ZERO rate-budget
   consumption — the admin bucket stays exactly 10/10.

## 5. ToDo ledger (execution order)

| # | Item | Status |
|---|---|---|
| 1 | Workspace reconciliation (junk auto-commit dropped, tooling preserved untracked, tree reset to `9bfc484`, session-17 transcript restored) + warm-env verification (`.env`, seed 4/12/2/4, chromium) | ✅ |
| 2 | Baseline fully green on every gate (sixth consecutive session) | ✅ |
| 3 | First-hand audit of `ae4e26e` + `9bfc484` (8 claims + npm-audit composition, driven by `code-review-checklist` / `security-and-hardening` / `tdd`) | ✅ |
| 4 | Parity sweep round 13a (both viewports, zero drift — 10th consecutive) | ✅ |
| 5 | L-3 seam opened: scratch probe minted an admin session via SQL, measured all four admin surfaces at both viewports → M-1 found (×12 serious) | ✅ |
| 6 | M-1 RED: gate extended to 14 surfaces → 2 failed / 28 passed (admin products × both projects, one root-cause class) | ✅ |
| 7 | M-1 GREEN: visibility-toggle accessible name folds the visible state word in (zero visual change) → rebuild → 30/30 gate | ✅ |
| 8 | Round 13b post-change census with the fixed tree: byte-equal to 13a on every field | ✅ |
| 9 | Full E2E on the final tree: **160 passed + 2 skipped** (80 unique × 2 − 2 viewport skips + 2 setup; arithmetic exact) | ✅ |
| 10 | Scratch probe + scratch seed-check deleted; screenshots refreshed (`--shots`, 9 surfaces; the mobile drawer capture visually verified: five-item panel pixel-identical) | ✅ |
| 11 | Docs alignment: SKILL v1.11.0 (project_state, §2 E2E row, §8 gate bullet, §9 trap #32, §11 verify line, Appendix B row); README badge/tables; CLAUDE gate line + axe bullet; PAD test table (11 files \| 80 cases) + coverage map | ✅ |
| 12 | worklog session-18 entry; commit to main; SSH-wrapper push (dry-run first); verify remote ref | ✅ |

## 6. Verification ledger (post-remediation, evidence-backed)

- **M-1 RED (observed):** `npx playwright test tests/e2e/accessibility-axe.spec.ts`
  on the pre-fix tree → **2 failed / 28 passed** — `admin products` on BOTH
  projects with `label-content-name-mismatch(serious)×12` (the failure
  message recorded verbatim); all 12 other surfaces × both projects clean.
- **M-1 GREEN (observed):** after the toggle fix + rebuild → **30 passed**
  (28 gate tests + 2 setup), then the FULL suite **160 passed + 2 skipped**
  (80 unique × 2 − 2 viewport skips + 2 setup; arithmetic exact) — zero
  `label-content-name-mismatch` anywhere in the enabled WCAG 2.0/2.1 A+AA
  ruleset across all fourteen surfaces × both viewports.
- **M-1 root-cause record:** the toggle renders the state word ("Visible" /
  "Hidden") as visible text next to an eye icon; the rule (WCAG 2.5.3)
  demands the visible text be contained in the accessible name.
  `aria-label="Hide <name>"` + visible "Visible" → mismatch. The fix
  composes the label from the same state the word renders, so name and
  visible text can never diverge again — the rule holds by construction
  (the trap-#31 doctrine, now generalized by trap #32).
- **Round 13b (observed):** post-fix tree → census byte-equal to 13a on
  every field (all four pageH/secs/footerH sets, font ranks, pinned
  chips/nameH3/marquee, drawer panelCls char-identical, nav gaps
  [20,20,20,20]) — the M-1 fix is measurement-rest-invariant BY MEASUREMENT.
- **Final gates on the final tree (observed):** typecheck ✓ lint ✓ **122/122
  unit (15 files)** ✓ build + assemble ✓ E2E **160 passed + 2 skipped** —
  the two desktop-only geometry pins still skip on mobile, nothing else.
- Screenshots re-captured on the remediated standalone (9 clone surfaces);
  the mobile drawer capture verified visually: five-item panel, VELOUR
  logotype, 20px gaps — pixel-identical between clone and reference.

## 7. Residual risks / next steps

1. `color-contrast` remains excluded from the axe gate BY DOCUMENTED DECISION
   (parity law §1/§4/§19) — unchanged.
2. The admin axe fixture mints ONE session per project group (delete →
   insert → delete). If a future spec needs PERSISTENT admin state in the
   storageState (e.g. axe on an admin surface with seeded data), extend the
   fixture rather than adding logins (the bucket stays exactly consumed).
3. G-3 POSIX-only sweep paths — fix before using the tool on Windows (carried).
4. Dev-toolchain npm-audit findings — revisit when vitest 5 / prisma 7 land
   non-breaking paths (carried; composition re-verified this session).
5. Real PSP behind the checkout seam (carried).
6. Nonce-based CSP to retire `'unsafe-inline'` (carried).
7. H-56/H-59 disclosed E2E gaps (DB-mocking harness) — unchanged, carried.
8. L-2: the axe gate's PDP surface hardcodes `silk-draped-evening-gown` —
   fine while the seed is contract-pinned (recorded, carried).
9. Keep running the FULL two-census ritual every session — ten same-day
   zero-drift sweeps is a streak, not a guarantee (session-10 §6 #5).
10. If the reference re-adds the drawer ACCOUNT/WISHLIST tail, restore the
    clone's tail and re-pin 7 items (session-8 §6 #7 — unchanged).
