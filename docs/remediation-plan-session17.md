# Remediation Plan — Session 17 (AURELIA / VELOUR clone)

> **Status:** EXECUTED. **Mode:** Verify-first (Mode C) → warm-workspace
> re-validation → audit → TDD remediation. **Scope:** (1) re-validation of the
> pulled remote `e8663b4` (session-16 work `6b54eb8` + the user-added
> session-16 transcript) — the workspace was WARM this time (the session-16
> thread's node_modules / seeded `db/custom.db` / chromium v1248 survived the
> reset; `.env` verified still pinned `DATABASE_URL="file:../db/custom.db"`);
> (2) an audit of the never-audited session-16 commit `6b54eb8` (skills:
> `code-review-checklist`, `security-and-hardening`, `tdd`, per
> `skills/skills-catalog.md`) — all claims verified first-hand (footprint, the
> two production fixes' diffs, the axe-gate spec contract, axe-core
> load-bearing, docs counts, §11 pins, npm-audit composition); (3) a **live
> reference parity sweep round 12** (desktop 1440×900 + mobile 390×844, FULL
> two-census ritual) — **ZERO drift**, the NINTH consecutive same-day
> zero-drift sweep (sessions 9→…→17); (4) TDD remediation of the audit finding
> **L-1**: the K-1 gate covered only LOGGED-OUT surfaces — first-hand probes
> measured a real serious-class WCAG 2.5.3 violation class on the stateful
> surfaces (badge-count Label-in-Name on the header bag button + wishlist
> heart), driving two more zero-visual-change production fixes plus a
> permanent gate extension (10 surfaces incl. logged-in, self-cleaning).

---

## 1. Starting state

The workspace carried the session-16 thread's environment (node_modules,
`db/custom.db` seeded 4/12/2/4, chromium v1248, `.next` build) plus an
environment auto-commit `c28da82` that added container tooling (`bin/ssh`,
`download/`, `upload/`, extra `skills/*`) and DELETED
`docs/session_16.md`. Reconciliation: the tooling files were preserved
untracked, the tree reset to `origin/main` (`e8663b4`), and the deleted
session transcript restored. `.env` verified:
`DATABASE_URL="file:../db/custom.db"` (+ dev `AUTH_SECRET`,
`NEXT_PUBLIC_SITE_URL`); `.env.example` tracked with the identical contract.
The sandbox `DATABASE_URL` leak persists — all DB/build commands run
`env -u DATABASE_URL` (§9 #12).

**Baseline gates on the committed tree (all reproduce the session-16 ledger;
fifth consecutive session fully green):**

| Gate | Result |
|---|---|
| typecheck | ✓ |
| lint | ✓ |
| unit | ✓ 122/122 (15 files) |
| build + assemble | ✓ |
| E2E | ✓ 142 passed + 2 skipped (71 unique × 2 − 2 viewport skips + 2 setup) |

`npm audit`: 11 findings (1 moderate, 8 high, 2 critical) — re-verified
unchanged; all dev-toolchain; accepted with rationale — carried.

## 2. Audit of `6b54eb8` (first-hand full-diff verification)

The commit's own claims, verified against the diff and the final tree:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | Production changes = exactly two attribute-level fixes | `git show 6b54eb8 -- src/` touches ONLY `header.tsx` (logotype aria-label REMOVED, with the trap-#30 rationale comment) and `product-card.tsx` (`role="img"` added to the swatch spans, comment included) | TRUE |
| 2 | The K-1 gate spec contract | `tests/e2e/accessibility-axe.spec.ts`: 5 surfaces × both projects, `test.use({ storageState: { cookies: [], origins: [] } })` (logged-out, zero rate-budget), `wcag2a/2aa/21a/21aa` tag set, `color-contrast` the single excluded rule with the loud parity-law rationale in the header comment; asserts the mapped violation-summary array `toEqual([])` | TRUE |
| 3 | axe-core load-bearing | `package.json` devDependency `axe-core@^4.10.0`; the ONLY repo import is the gate spec (`rg -l axe-core tests/ src/ scripts/` → the spec alone; reads `node_modules/axe-core/axe.min.js` and injects it) | TRUE |
| 4 | home.spec pin re-scoped | the logotype pin is now `page.locator("header").getByRole("link", { name: "VELOUR" })` with the footer "About Velour" strict-mode rationale in the comment | TRUE |
| 5 | RED→GREEN evidence | RED numbers (8 failed / 4 passed) recorded in the plan §5; the GREEN state re-observed live this session (the 10 gate tests pass inside the full suite) | TRUE |
| 6 | Round-11 zero-drift census | plan-session16 §3 matches the ledger set (ref 11079/11257, clone 11085/11264, deals 3174, footer 444/1189, drawer char-identical, gaps [20,20,20,20], fonts 1/11/36 vs 1/13/42 Cormorant, h4 Montserrat ×3, chips identical, nameH3 Cormorant, marquee present) — and round-12a of THIS session reproduced every field byte-for-byte | TRUE |
| 7 | Final gates on the final tree | reproduced on this tree: typecheck ✓ lint ✓ 122/122 unit ✓ build + assemble ✓ E2E 142 + 2 skipped (arithmetic exact) | TRUE |
| 8 | Docs aligned (132→142, 66→71, trap #30, axe-gate bullet) | SKILL v1.9.0 (project_state, §2 E2E row, §8 bullet, §9 #30, §11 line, Appendix B K-1 row), README badge + counts, CLAUDE gate line + testing bullet, PAD test table (11 \| 71 \| 142+2) + coverage map — all re-read this session | TRUE |

**Findings (new, this audit):**

| ID | Sev | Finding | Remediation (this session) |
|---|---|---|---|
| L-1 | 🟠 MEDIUM (product) | **The K-1 gate audits only LOGGED-OUT surfaces — and the stateful surfaces carry a real serious-class violation class the gate could never see.** First-hand probes (scratch, deleted after the decision): every logged-in surface with a cart line fails `label-content-name-mismatch` (serious) — the header bag button's `aria-label="Shopping bag"` does not contain the badge's visible digit ("1"); the header wishlist heart has the SAME class (`aria-label="Wishlist"` vs a visible count badge) whenever the wishlist holds items. The logged-out gate passes precisely because the badges only render when count > 0. Additionally `/register` and `/wishlist` (logged-out) are public surfaces with NO gate coverage (probed clean — coverage gap, not violations). | **Fixed by EXTENSION + two production fixes (see §4 #5–#7).** The gate now runs 10 surfaces × both projects: the 7 logged-out (home/shop/PDP/cart/login + **register** + **wishlist**) with the empty storageState, and 3 LOGGED-IN (account; wishlist-with-one-heart; cart-with-one-line) reusing the per-project storageState — ZERO extra logins, zero rate-budget consumption; both stateful surfaces build their fixture via the PDP and clean up after themselves (H-27 detach-wait loop; heart toggled back off). RED observed 5 failed / 17 passed (wishlist-heart + cart-line on both projects, PLUS mobile-account — order-exposed by the chromium wishlist test's skipped cleanup leaving the badge rendered: all five share the ONE root-cause class). GREEN: the bag/wishlist accessible names fold the count in when the badge renders (`Shopping bag, 1 item` / `Wishlist, 2 items`; at rest, byte-identical labels) → 22/22 twice (gate run + full suite). Recorded as SKILL trap #31. |
| L-2 | ⚪ INFO | The gate's PDP surface hardcodes `silk-draped-evening-gown` — fine while the seed is canonical (12 products, idempotent upserts); a catalog change would need the spec updated. Recorded, no change (the seed is contract-pinned). | No change (recorded). |
| L-3 | ⚪ INFO | The axe gate cannot cover ADMIN surfaces: the admin login bucket is exactly consumed (10/10, §9 #23) and minting an admin storageState would need a new session-row SQL fixture pattern. Carried as the next coverage seam (documented residual). | No change (recorded). |

**Accepted (documented, carried):** dev-toolchain npm-audit findings; real PSP
behind the checkout seam; nonce CSP; G-3 POSIX-only sweep paths; H-56/H-59
disclosed E2E gaps; color-contrast parity-law exclusion; superset heading
counts; A-2 auth asymmetry; E2E admin rate budget exactly consumed.

## 3. Live reference sweep — round 12 (measured 2026-10-16): ZERO drift

Pre-change census (12a, committed tree):

| Surface (ledger) | Reference (12a) | Clone (12a) | Verdict |
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
| Console | 2 ref-side 401s (reference's own backend) | clean | — |

**The reference has now held still across NINE consecutive same-day sweeps
(sessions 9→10→11→12→13→14→15→16→17).** Post-change round 12b (after the L-1
production fixes + rebuild) re-measured **byte-equal to the ledger on every
field (pageH/secs/footerH/ranks/pinned + drawer panelCls/navCls/items/gaps)**
— the fixes are rest-invariant BY MEASUREMENT (accessible-name attributes
change ONLY when a badge renders; the resting census state has count = 0, so
the labels are byte-identical at rest).

## 4. ToDo ledger (execution order)

| # | Item | Status |
|---|---|---|
| 1 | Workspace reconciliation (preserve untracked tooling, reset to `e8663b4`, restore the deleted transcript) + warm-env verification (`.env`, seed DB, chromium) | ✅ |
| 2 | Baseline fully green on every gate (fifth consecutive session) | ✅ |
| 3 | First-hand audit of `6b54eb8` (8 claims + new-issue scan driven by `code-review-checklist` / `security-and-hardening` / `tdd`) | ✅ |
| 4 | Parity sweep round 12a (both viewports, zero drift — 9th consecutive) | ✅ |
| 5 | L-1 RED: gate extension to 10 surfaces (7 logged-out + 3 logged-in, self-cleaning) → 5 failed / 17 passed on the pre-fix tree, ONE root-cause class (badge Label-in-Name) | ✅ |
| 6 | L-1 GREEN: header bag + wishlist accessible names fold the badge count in when it renders (zero visual change; at-rest labels byte-identical) → 22/22 gate | ✅ |
| 7 | Round 12b post-change census with the fixed tree: byte-equal to the ledger on every field | ✅ |
| 8 | Full E2E on the final tree: **152 passed + 2 skipped** (76 unique × 2 − 2 viewport skips + 2 setup; arithmetic exact) | ✅ |
| 9 | Scratch probes deleted after the demos; screenshots refreshed (`--shots`, 9 surfaces; the mobile drawer capture visually verified: five-item panel pixel-identical) | ✅ |
| 10 | Docs alignment: SKILL v1.10.0 (project_state, §2 E2E row, §8 gate bullet, §9 trap #31, §11 verify line, Appendix B row); README badge/tables; CLAUDE gate line + axe bullet; PAD test table (11 files \| 76 cases) + coverage map | ✅ |
| 11 | worklog session-17 entry; commit to main; SSH-wrapper push (dry-run first); verify remote ref | ✅ |

## 5. Verification ledger (post-remediation, evidence-backed)

- **L-1 RED (observed):** `npx playwright test tests/e2e/accessibility-axe.spec.ts`
  on the pre-fix tree → **5 failed / 17 passed** — `wishlist with one heart`
  and `cart with one line` failed on BOTH projects (`label-content-name-mismatch`
  on `a[aria-label="Wishlist"]` and `button[aria-label="Shopping bag"]`),
  and mobile `account` failed order-exposed (the chromium wishlist test's
  cleanup is skipped when its axe assertion fails first, leaving the badge
  rendered for the mobile project's account pass — the SAME class). All five
  failures share one root cause; the gate demonstrably precedes the fixes.
- **L-1 GREEN (observed):** after the header fix + rebuild → **22 passed**
  (20 gate tests + 2 setup), then the FULL suite **152 passed + 2 skipped** —
  zero `label-content-name-mismatch` anywhere in the enabled WCAG 2.0/2.1
  A+AA ruleset across all ten surfaces × both viewports.
- **L-1 root-cause record:** the badge `<span>` renders the count as visible
  text inside the icon control; the rule (WCAG 2.5.3) demands the visible
  text be contained in the accessible name. `aria-label="Shopping bag"` +
  visible "1" → mismatch. The fix composes the label from the same state the
  badge renders (`cart.count` / `wishlist.size`), so name and visible text
  can never diverge again — the rule holds by construction, mirroring the
  trap-#30 "holds by construction" doctrine.
- **Round 12b (observed):** post-fix tree → census byte-equal to the ledger
  on every field (all four pageH/secs/footerH sets, font ranks, pinned
  chips/nameH3/marquee, drawer panelCls char-identical, nav gaps
  [20,20,20,20], console clean) — the L-1 fixes are measurement-rest-invariant
  BY MEASUREMENT.
- **Final gates on the final tree (observed):** typecheck ✓ lint ✓ **122/122
  unit (15 files)** ✓ build + assemble ✓ E2E **152 passed + 2 skipped**
  (76 unique × 2 − 2 viewport skips + 2 setup; arithmetic exact) — the two
  desktop-only geometry pins still skip on mobile, nothing else.
- Screenshots re-captured on the remediated standalone (9 surfaces); the
  mobile drawer capture verified visually: five-item panel, VELOUR logotype,
  20px gaps — pixel-identical between clone and reference.

## 6. Residual risks / next steps

1. `color-contrast` remains excluded from the axe gate BY DOCUMENTED DECISION
   (parity law §1/§4/§19) — unchanged.
2. L-3: the axe gate cannot reach the ADMIN surfaces while the admin login
   bucket is exactly consumed (10/10); a session-row SQL fixture that mints a
   storageState would unlock it — the next coverage seam (new, carried).
3. G-3 POSIX-only sweep paths — fix before using the tool on Windows (carried).
4. Dev-toolchain npm-audit findings — revisit when vitest 5 / prisma 7 land
   non-breaking paths (carried; composition re-verified this session).
5. Real PSP behind the checkout seam (carried).
6. Nonce-based CSP to retire `'unsafe-inline'` (carried).
7. H-56/H-59 disclosed E2E gaps (DB-mocking harness) — unchanged, carried.
8. E2E admin rate budget remains EXACTLY consumed (10/10) — the axe gate's
   logged-in tests consume ZERO logins (per-project storageState reuse).
9. Keep running the FULL two-census ritual every session — nine same-day
   zero-drift sweeps is a streak, not a guarantee (session-10 §6 #5).
10. If the reference re-adds the drawer ACCOUNT/WISHLIST tail, restore the
    clone's tail and re-pin 7 items (session-8 §6 #7 — unchanged).
