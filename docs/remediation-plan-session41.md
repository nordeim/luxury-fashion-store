# Remediation Plan — Session 41 (F-LL: the admin dashboard's low-stock KPI read)

The session-40 continuation round. Per the standing precedent: audit the pulled
HEAD (`ec4600e` — the parallel thread's session-log commit), re-verify the
baseline, run the fresh audit pass over the session-40 plan §11 directive
("the remaining READ-side surfaces with no first-party owner spec"), then
close the strongest one with a TDD gate.

## 1. Starting state

- Warm workspace this round (no reset): `git pull` fast-forwarded
  `e775db1 → ec4600e`. Environment verified before any gate: the canonical
  3-line `.env` with `DATABASE_URL="file:../db/custom.db"` ✓, `db/custom.db`
  at the canonical 4/12/2/4 by direct Prisma count (`env -u DATABASE_URL`,
  the documented sandbox quirk) ✓, node_modules ✓, Playwright chromium-1248 ✓.
- HEAD `ec4600e` = remote `main` (session-50 log: the parallel thread's raw
  transcript of the SAME session-40 round, +72 docs-only).
- The committed tree's contract: 173 unit (19 files) · 135 unique E2E × 2
  device projects − 2 desktop-only skips = **268 passed + 2 skipped** ·
  typecheck ✓ lint ✓ build ✓.

## 2. Audit of `ec4600e` (the pulled HEAD) — first-hand

`git show --stat ec4600e` → 1 file, +72: `docs/session_50.md` only — the
parallel thread's narration transcript of the same session-40 round; its
ledger matches `e775db1`'s actual work (test-only, zero `src/`, the F-KK
describe + 13 screenshots + five-docs alignment). Docs-only, RETAINED (never
overwrite another thread's log). This round's narration ships as
`docs/session_51.md`.

## 3. Baseline re-verification (warm workspace)

- typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build + assemble ✓
- E2E **268 passed + 2 skipped** (135 unique × 2; 5.9m) — the 36th
  consecutive session fully green at baseline, exactly matching the
  session-40 final gates.

## 4. Fresh audit pass — the round's finding

The session-40 plan §11 directive: auth.ts and account.ts are now fully
gated; hunt the READ-side surfaces with no first-party owner spec.
Systematic survey of every RSC read seam against its gate coverage:

| Read surface | Gate | Verdict |
|---|---|---|
| home product read (isActive, take 60) | home.spec (cards, sale-grid count) | gated |
| /shop PLP read + filters | shop.spec (full catalog, chips, search, sale) | gated |
| PDP read | product.spec | gated |
| cart/wishlist DTO reads | cart-checkout/wishlist specs | gated |
| account orders + events reads | F-DD (privacy filter, IDOR) | gated |
| admin orders list | H-2 (take-cap injection, orders-total) | gated |
| admin products page | admin.spec mutations + a11y render | gated |
| dashboard Revenue/Orders/Products KPIs | admin.spec (floor/12 + H-28/H-47 deltas) | gated |
| **dashboard Low Stock KPI + alert panel** | **NOTHING — `rg -i "low.?stock|3 or fewer" tests/` finds only a comment** | **UNGATED — the empty-state-locked read** |

**F-LL — the admin dashboard's low-stock read surface
(`src/app/(storefront)/admin/page.tsx:26,61,70-77`).** The KPI reads the
G-3 (session-4) dedicated COUNT — `db.product.count({ where: { isActive:
true, stock: { lte: 3 } } })` — whose own comment documents the F-21
under-count class ("lowStock.length would silently under-count"), and the
alert panel renders the low-stock names with the "3 or fewer remaining."
copy. The canonical seed ships **all 12 products at stock=12** — the
surface renders its EMPTY state (KPI "0", panel hidden) on every run, and
**no assertion anywhere reads either**:

- the dashboard test asserts Products=12, Revenue floor, Orders floor —
  never Low Stock;
- the a11y spec renders the dashboard for axe violations only;
- the sibling seam DID get its gate: H-2's take-cap injection test
  (session-5, the same F-21 class on the orders table) — G-3 never did.

Mutation shapes that leave every existing gate green (the wire-blind
class, read-side): the count swapped for the take-capped list length
(`lowStock.length`, reads 20 once 21 products sit at the threshold — the
comment's own documented regression); the `isActive` filter dropped (the
inactive sentinel counts); the threshold drifted (`lt: 3` → 0, `lte: 4` →
over-count); the whole count dropped and hardcoded (0). LOW gate-coverage,
zero product defect (the source is correct today; nothing asserts it).
Not security-bearing — an admin KPI that under-reports low stock is
operational misdirection (missed restock), not a leak.

## 5. Plan-probe discipline (run BEFORE the spec)

`scripts/plan-probe-session41.cjs` — a throwaway copy of `db/custom.db` +
the standalone on :3209 (the session-38/39/40 harness shape), wire-verifying
every F-LL assumption:

1. the offline-minted ADMIN Session row exists (INSERT…SELECT, the admin's
   id resolved by the DB itself);
2. the mint's WIRE VALIDITY: the cookie + row render `/admin` (the role
   gate passes — no /login, no /account redirect);
3. the canonical copy's low-stock baseline is ZERO (the empty-state lock
   that makes the surface gate-blind);
4. the fixture injection lands: 21 active pins (stock=3, run-unique slugs)
   + 1 inactive sentinel (stock=3) + 1 threshold sentinel (stock=4,
   active) — dbRead count by slug prefix = 23;
5. **the KPI card (the exact getByText locator the spec will use) reads
   EXACTLY "21" — the true COUNT (LOAD-BEARING: active && stock ≤ 3, not
   the take-capped list length, not the unfiltered count)**;
6. the alert panel renders: "Low stock alert" + "3 or fewer remaining" +
   the first pin's name;
7. the Products KPI reads 35 mid-fixture (12 + 23 — the fixture's
   footprint is measured, proving the injection is real and the
   declaration-order isolation matters: the dashboard test runs BEFORE
   this describe in file order, workers:1);
8. the afterAll DELETE removes exactly the fixture rows (the count returns
   to 12 — belt-and-braces, the ONLY cleanup path: global-setup does NOT
   wipe Product);
9. zero unexpected console errors.

Zero dev-DB writes, zero e2e.db writes (the throwaway copy dies with the
probe).

## 6. Remediation design (TDD)

NEW describe **"low-stock KPI read (F-LL, session-41)"** at the END of
`tests/e2e/admin.spec.ts` (the OWNING spec — the dashboard KPI's own; the
file's count goes 7 → 8 uniques).

- **ZERO logins** (the admin bucket stays exactly consumed 10/10, SKILL
  §9 #23): the admin session is minted OFFLINE — the F-HH/a11y M-1
  pattern (a random 256-bit token, the cookie `token.hmac` signed with
  the shared `E2E_AUTH_SECRET`, a Session row via `prisma db execute`
  INSERT…SELECT with the admin's id resolved by the DB). The describe
  rides a describe-scoped `test.use` storageState carrying ONLY the
  minted cookie.
- **The fixture** (SQL, beforeAll): 21 active pins at stock=3 (the
  boundary value on the counted side), slugs `f-ll-pin-01..21`, names
  "F-LL Pin 01..21", sortOrder 1001+; + `f-ll-inactive-sentinel`
  (stock=3, **isActive=false** — the filter sentinel); +
  `f-ll-threshold-sentinel` (stock=4, active — the boundary+1 sentinel).
  The categoryId resolves by scalar subquery (`WHERE slug='accessories'`).
- The case drives the REAL surface: `page.goto("/admin")` on the minted
  session (the mint's wire validity — SUPPORTING), then asserts:
  - **LOAD-BEARING — the Low Stock KPI card reads EXACTLY 21**: the true
    COUNT of active products at stock ≤ 3. Catches every §4 mutation
    shape: count→length swap (20), dropped isActive (22), threshold
    drift (0 / 22), dropped read (0);
  - SUPPORTING — the alert panel is visible with the "3 or fewer
    remaining." copy and the first pin's name (the read-through render
    half);
  - SUPPORTING — the dbRead fixture sanity (the pins + sentinels all
    present, 23 rows by prefix).
- **Cleanup discipline (H-24)**: `afterAll` DELETEs the fixture by slug
  prefix + the minted Session row. Product is NOT in global-setup's wipe
  list — the afterAll is the ONLY cleanup path, and Playwright runs
  afterAll even on mid-case failure. The `finally` shape of F-HH is a
  test-body restore; here the fixture is describe-scoped (beforeAll/
  afterAll — the F-KK shape).
- **Count ledger**: 135 → 136 unique cases; 268 → 270 passed + 2 skipped.
  The F-LL case-runs green on BOTH device projects.

## 7. Mutation demo (the regression shape, proven RED)

Surgical mutation: swap the KPI's value source
`String(lowStockCount)` → `String(lowStock.length)` in
`src/app/(storefront)/admin/page.tsx:61` (the exact G-3-documented
under-count shape: the take-capped list reads 20 while 21 products sit at
the threshold — the panel still renders, the Products/Revenue/Orders KPIs
don't move) → `npm run build` → the existing dashboard test STAYS GREEN
(its assertions never read Low Stock — the wire-blind gap's proof) while
exactly the 2 F-LL case-runs fail at the KPI assertion (Expected 21 /
Received 20) → restore via inverse edit (`git diff` on `src/` empty; the
count rg-verified at :26) → rebuild → 8/8 file uniques green.

## 8. Validation of this plan against the codebase (pre-execution)

- The COUNT at `src/app/(storefront)/admin/page.tsx:26`, the KPI render
  at :61, the panel at :70-77 — read first-hand this session.
- The take: 20 on the panel's list (:30) — the 21-pin fixture forces the
  count-vs-length divergence the G-3 comment documents.
- The canonical seed: all 12 products at stock=12 (direct Prisma count,
  this session) — the empty-state baseline.
- `playwright.config.ts`: `fullyParallel: false, workers: 1` — the serial
  topology that makes the injection window safe (the H-47/H-2 precedent,
  bit-identical KPIs mid-run).
- global-setup's wipe list (read first-hand): Order/OrderItem/OrderEvent/
  Cart/CartItem/Wishlist/WishlistItem/Session + scoped Address/User —
  NOT Product: the afterAll DELETE is the fixture's only cleanup path.
- The F-HH describe (admin.spec.ts:275-443) establishes the exact
  offline-mint/dbRead/sqlRun helper shapes the new describe reuses;
  the F-KK describe establishes the describe-scoped storageState shape.
- The existing dashboard test (admin.spec.ts:28-62) runs BEFORE the new
  describe in declaration order — its Products=12 assertion never sees
  the fixture.

## 9. Round-36 parity census (the standing ritual)

Two censuses on the final tree (36a with `--shots`, 36b re-run), both
viewports, against the LIVE reference (logged in with the task credentials
via agent-browser) — the 47th/48th consecutive sweep. Fields: desktop/
mobile pageH, mainKids, footers, the mobile drawer's panel/nav class
strings + gap array (the v4 `flex gap-5` pin), console residue. Plus the
reference's functional posture (nav buttons inert — the clone stays the
functional superset) and the clone's mobile-menu behavior verified
end-to-end on the dev server (burger → drawer → Women →
`/shop?category=women` → menu closed → overflow restored → zero console
errors). `rm -rf .next` before `npm run dev` (the session-39 Fast-Refresh
lesson) — and **rebuild before re-running the sweep** (the session-40
lesson: `rm -rf .next` deletes the standalone too).

## 10. Final gates + docs

- typecheck ✓ lint ✓ 173/173 unit ✓ build ✓ E2E **270 passed + 2 skipped**
  (136 unique × 2) — the 37th consecutive fully-green session.
- Screenshots refreshed (the sweep's 9 + the dev-server login set).
- Docs aligned: SKILL (§2 E2E row + F-LL; §11 136; Appendix B NEW
  session-41 row), README, CLAUDE.md, PAD, AGENTS.md, this plan's
  execution record, worklog, `docs/session_51.md`; `.env.example`
  unchanged and matching the codebase; stale-count sweep zero.
- One main-branch commit pushed via the SSH wrapper v3
  (`--remote git@github.com:nordeim/luxury-fashion-store.git`).

## Execution record

| # | Task | Result |
|---|---|---|
| 1 | Plan probe | ✅ `scripts/plan-probe-session41.cjs` — **9/9 checks passed** on the throwaway DB copy + the standalone on :3209: the offline-minted ADMIN row (INSERT…SELECT, admin resolved by the DB), the mint's WIRE VALIDITY (the cookie + row render `/admin` — the role gate passes), the canonical low-stock baseline ZERO (the empty-state lock), the fixture lands (23 rows by prefix), **the KPI card reads EXACTLY 21 (LOAD-BEARING — the true COUNT)**, the alert panel renders ("3 or fewer remaining" + "F-LL Pin 01"), the Products KPI reads 35 mid-fixture (the measured footprint), the afterAll DELETE restores 12/0/session-gone, zero console errors. Zero dev-DB writes, zero e2e.db writes |
| 2 | admin.spec.ts describe | ✅ NEW describe "low-stock KPI read (F-LL, session-41)" at the END of `tests/e2e/admin.spec.ts` (after the F-HH describe), ONE case on the describe-scoped offline-minted admin cookie (`test.use` — the F-HH pattern, ZERO logins, the 10/10 admin bucket untouched): the fixture sanity dbRead (23 rows — SUPPORTING), `/admin` renders on the minted session (SUPPORTING), **the KPI card reads EXACTLY 21 (LOAD-BEARING)**, the alert panel's "3 or fewer remaining" + "F-LL Pin 01" (SUPPORTING); beforeAll mint + fixture / afterAll slug-prefix DELETE + session delete; typecheck ✓ eslint ✓; GREEN **18 passed** (7 existing uniques + 1 F-LL unique) × 2 + 2 setups (53.1s; F-LL green on BOTH projects, 584ms) |
| 3 | Mutation demo | ✅ the dedicated COUNT dropped + the KPI rendered `lowStock.length` (the G-3-documented under-count shape; the full dropped-read shape — the first render-only swap hit TS6133 'declared but never read' and the build died at typecheck, leaving no standalone; the full shape keeps the build green) → REBUILD → **the existing dashboard test STAYED GREEN** (its KPI pins never read Low Stock — the wire-blind gap's proof) while **exactly the 2 F-LL case-runs failed** at the KPI assertion (Expected: 21 / Received: 20, admin.spec.ts:604) → restored via inverse edit (git checkout; `git diff --stat src/` empty; the count rg-verified at :26, `String(lowStockCount)` at :61) → rebuild → 18/18 green |
| 4 | Round-36 census + screenshots | ✅ **ZERO DRIFT — byte-identical to the round-34/35 ledger in ALL census fields (47th/48th consecutive sweep)**: desktop pageH 11079 (ref) / 11085 (clone), mobile 11257 / 11264, mainKids 11 BOTH sides both viewports, footers 444/1189, the drawer char-identical (panelCls `fixed left-0 top-0 h-full w-80 bg-background z-50 p-8 flex flex-col gap-6` + navCls `flex flex-col gap-5 mt-4`, 5 items, gaps [20,20,20,20]) — **the v4 mobile-nav pin holds** (the standing task re-check); ref console = the documented 2× 401 residue; clone console clean. The reference's functional posture re-confirmed first-hand through agent-browser (logged in with the task credentials): the WOMEN nav button is INERT (click → URL unchanged at `/`) — the clone stays the functional superset. The clone's mobile-menu behavior verified end-to-end on the dev server through real Playwright (`scripts/dev-hydration-probe-session38.cjs`, `rm -rf .next` first per the session-39 lesson; the dev server needed the documented `env -u DATABASE_URL` restart — the parent-workspace DATABASE_URL override made the boot sweeper miss the DB file): burger visible → drawer opens (dialog:1) → body overflow hidden → Women click → `/shop?category=women` → menu closed → overflow restored → zero console errors (the first run raced Turbopack's cold compile of `/shop` — the warm re-run measured the navigation exactly, the session-40 measurement note reproduced). Screenshots: 13 refreshed (the sweep's 9 via `--shots` + the dev-server login set via `scripts/dev-shots-session39.cjs`: clone-login, clone-cart, clone-account, clone-admin-dashboard — zero console errors; the dev cart's rows cleaned after the shot — canonical 4/12/2/4 re-verified by direct Prisma count) |
| 5 | Final gates on the final tree | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **270 passed + 2 skipped** (136 unique × 2 − 2 desktop-only skips; the +2 setup projects pass outside the case-run summary; 6.1m) — the THIRTY-SEVENTH consecutive fully-green session, exactly the §6 count ledger (135→136 unique, 268→270 passed); the F-LL case-runs green on BOTH device projects |
| 6 | Docs alignment + stale-count sweep | ✅ README (badge 173+270, the Admin row + the low-stock pin, testing/architecture/status rows 136); CLAUDE.md (gate line 136 + the F-LL gate in the chain, NEW F-LL testing bullet, commands 136); PAD (test table 18\|136\|270, §7.3 command 136, the admin coverage section's low-stock pin + the coverage-map session-41 extension); SKILL v1.34.0 (frontmatter 136+270+2, §2 E2E row + F-LL, §11 136, Appendix B NEW session-41 row with the TS6133 mutation-demo harness lesson); AGENTS.md (the security line gains the F-LL gate; the E2E command row 136); docs/remediation-plan-session41.md (this record); worklog; docs/session_51.md (the round's narration log — session_50.md taken by the pulled commit); scripts/plan-probe-session41.cjs (the probe artifact). Stale-count sweep: zero stale counts (the §11 directive honored: the next hunt is the remaining read-side surfaces or the tooling-harness candidates)

## 11. Residual risks / next steps (post-F-LL)

1. The merge's H-29 transaction-atomicity half stays source-read-only
   (wire fault-injection into a SQLite tx is not Playwright-reachable;
   carried).
2. The success gate's foreign-owner row stays covered-by-shape (carried).
3. `/api/search`'s 429 path unpinned by design (carried — tripping it
   needs 61 requests/min and pollutes the shared limiter state).
4. The search 503 / health `db:false` deliberate-failure shapes stay
   source-read-only (carried).
5. The register bucket stays 8 < 10 — keep preferring no-register shapes.
6. The PDP og:image annotation / og:type union / `style-src 'unsafe-inline'`
   exceptions (carried, sessions 26–41).
7. Real PSP behind the checkout seam (carried).
8. Dev-toolchain npm-audit findings (11, all dev-only) — carried.
9. The alert panel's take: 20 list cap is deliberately NOT pinned (the
   KPI's true COUNT is the contract; the cap is an incidental bound).
10. The zero-drift streak is a streak, not a guarantee — the census ritual
    stays mandatory.
11. security.txt `Expires` (2027-11-01) renewal cadence (carried).
12. `NewsletterSubscriber` stays outside global-setup's wipe list
    (carried).
13. The sandbox kills detached process groups — long gates in the
    foreground (carried, honored again this round).
14. `rm -rf .next` before `npm run dev` after build-heavy rounds, then
    rebuild before re-running the sweep (the session-39/40 lessons,
    honored again this round).
