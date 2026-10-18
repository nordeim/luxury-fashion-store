# Remediation Plan — Session 43 (F-NN: the expired-session denial — the TTL revoke half of the session denylist)

The session-42 continuation round. Per the standing precedent: audit the pulled
HEAD (`0875d10` — the parallel thread's session-log commit), re-verify the
baseline, run the fresh audit pass, then close the strongest finding with a
TDD gate.

## 1. Starting state

- FRESH CLONE this round (the sandbox workspace had been reset — `git clone`
  per the task brief). The known recovery set, all closed BEFORE any gate:
  `npm install` ✓ (486 packages); the canonical 3-line `.env` with
  `DATABASE_URL="file:../db/custom.db"` ✓; `db:setup` materializing
  `db/custom.db` at the canonical 4/12/2/4 by direct Prisma count
  (`env -u DATABASE_URL` — the documented sandbox quirk) ✓; Playwright
  chromium-1248 reinstalled ✓ (the cache shipped only 1200).
- HEAD `0875d10` = remote `main` (the parallel thread's session_54.md — the
  raw transcript of the SAME session-42 round, +85 docs-only).
- The committed tree's contract: 173 unit (19 files) · 137 unique E2E × 2
  device projects − 2 desktop-only skips = **272 passed + 2 skipped** ·
  typecheck ✓ lint ✓ build ✓.

## 2. Audit of `0875d10` (the pulled HEAD) — first-hand

`git show --stat 0875d10` → 1 file, +85: `docs/session_54.md` only — the
parallel thread's raw narration transcript of the same session-42 round; its
ledger matches `e019a48`'s actual work (test-only, zero `src/`, the F-MM
describe + 13 screenshots + five-docs alignment + SKILL v1.35.0). Docs-only,
RETAINED (never overwrite another thread's log). This round's narration ships
as `docs/session_55.md` (session_54.md taken by the pulled commit).

## 3. Baseline re-verification (fresh clone, recovery closed)

- typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build + assemble ✓
- E2E **272 passed + 2 skipped** (137 unique × 2; 6.2m) — the 40th
  consecutive session fully green at baseline, exactly matching session-42's
  final gates.

## 4. Fresh audit pass — the round's finding

The session-42 plan §11 directive: the read/write-side seams are nearly
exhausted. This round's survey: **every non-transactional `db.*` write in
`src/` checked against its gate** (session-42 audited the writes inside
transactions; the single-write actions were surveyed as a class), plus the
read-time enforcement seams of the auth layer.

The write census (first-hand, this session):

| Write | Gate | Verdict |
|---|---|---|
| `account.ts:24` user.update (name) | F-JJ (session-39) | gated |
| `account.ts:54/59` password rotation + revoke-others | F-II (session-38) | gated |
| `account.ts:92-127` address CRUD + default | H-4/H-8 (account-addresses.spec) | gated |
| `admin.ts:117` product.update | H-7/H-15 | gated |
| `auth.ts:87` session.create (login mint) | behavioral (every signed-in assertion) | gated |
| `auth.ts:105` session.deleteMany (logout) | F-KK (session-40) | gated |
| `auth.ts:133` session.delete (expired prune) | **NOTHING** | **UNGATED — F-NN** |
| `auth.ts:132` the expiry CHECK itself | **NOTHING** | **UNGATED — F-NN** |
| `cart.ts:39/41` cart/wishlist touch (sweeper anchor) | not wire-reachable in-run (30d window; boot-only sweeper) | carried, source-read-only |
| `cart.ts:92-227` cart/wishlist get-or-create + merges | H-8 cart merge, F-EE/F-GG wishlist merges | gated |
| `cart.ts:96/98/189/198/207/241` cartItem writes | H-27/H-39/H-23 | gated |
| `auth.ts:105` (actions) user.create (register) | behavioral | gated |
| `newsletter/route.ts:32` upsert | API-contract gate | gated |
| `checkout.ts` placeOnce's five writes | F-MM (session-42) | gated |

**F-NN — the expired-session denial seam (`src/lib/auth.ts:132-135`,
`getCurrentUser`).** The session table IS the denylist (ADR-006); its three
revoke halves: logout (F-KK gated), rotation (F-II gated) — and **TTL expiry,
gated by NOTHING**. `getCurrentUser` is the read-time enforcement:

1. **the expiry check (:132)** — if dropped, an expired-but-present session
   row authenticates its bearer until the hourly sweeper deletes the row:
   up to a **1h zombie-auth window on a long-running server** (the sweeper
   runs at boot + hourly — a row re-presented after every sweep... wait, no:
   once swept the row is gone; the window is mint-to-next-sweep, at most
   60 minutes, and every read within it authenticates). The stolen-cookie
   threat model F-KK documents at the logout seam: an attacker's copy of a
   cookie whose row has EXPIRED keeps working through that window.
2. **the inline prune (:133)** — if dropped, the denial still happens (the
   wire stays green) but the dead row lingers until the hourly sweeper —
   the F-KK shape's sibling: server-truth lingers while every wire-level
   assertion stays green. The sweeper's own comment documents the contract:
   "the auth layer also deletes lazily on presentation — this catches rows
   never presented again."

Wire-blindness verified first-hand: **all five offline-mint sites in the
suite mint FUTURE expiry** (`datetime('now', '+1 day')` — F-II's hijack
:212, F-II's resurrect :258, F-KK :529, F-HH admin.spec:346, the a11y M-1
axe gate :195); every login-minted session is +30d
(`SESSION_TTL_DAYS`); no spec asserts an expired session is anonymous; the
sweeper unit test pins the PLAN shape only (`sessionWhere`), not the
runtime seam. A dropped check leaves **every existing gate green** (all
sessions the suite ever presents are future-expiry) while the zombie-auth
window opens. HIGH severity class (authn), zero product defect today (the
source is correct; nothing asserts it).

## 5. Plan-probe discipline (run BEFORE the spec)

`scripts/plan-probe-session43.cjs` — a throwaway copy of `db/custom.db` + the
standalone on :3209 (the session-38…42 harness shape), wire-verifying every
F-NN assumption:

1. the offline-minted EXPIRED james row exists (INSERT…SELECT,
   `expiresAt = datetime('now', '-1 day')` — PAST, james resolved by the DB);
2. the mint's WIRE DENIAL: the cookie + expired row bounce `/account` to
   `/login` (the TTL revoke — NOT signed-in);
3. the bounce URL shape (`/login?redirect=/account`);
4. **the CONTROL mint** (a second, FUTURE-expiry row + cookie on a fresh
   context) renders `/account` signed-in — proving check 2's denial is the
   EXPIRY, not a broken mint (the false-positive guard);
5. LOAD-BEARING: the expired row is PRUNED after the read (server-truth
   dbRead → null — the :133 inline delete);
6. the control row is NOT pruned (the prune targets only expired rows);
7. zero unexpected console errors.

Zero dev-DB writes, zero e2e.db writes (the throwaway copy dies with the
probe).

## 6. Remediation design (TDD)

NEW describe **"expired session denial (F-NN, session-43)"** at the END of
`tests/e2e/auth.spec.ts` (the OWNING spec — the auth seam's own; the file's
uniques 8 → 9).

- **ZERO logins, ZERO registers, ZERO limiter consumption** (the F-KK
  pattern): the describe's `test.use({ storageState })` carries ONLY the
  minted cookie — a random 256-bit token, the cookie signed
  `token.hmac` with the shared `E2E_AUTH_SECRET`, the row inserted via
  `prisma db execute` with james's id resolved by the DB itself. The
  browser-cookie expiry is FUTURE (+1d — the browser must carry the cookie;
  the ROW's expiry is the seam under test: PAST, −1d).
- **SUPPORTING precondition**: the minted expired row exists (dbRead —
  belt; beforeAll inserted it).
- **LOAD-BEARING 1 (the wire denial — the TTL revoke)**: `page.goto("/account")`
  bounces to `/login` (the expired session is anonymous — getCurrentUser
  returned null through the expiry branch).
- **LOAD-BEARING 2 (server truth — the inline prune)**: dbRead — the
  expired row is GONE after the read (the `:133` delete the wire cannot
  see; the sweeper runs hourly — not in play inside a 6-minute suite run,
  and the row was inserted after the boot sweep).
- **Cleanup discipline (H-24)**: the afterAll belt-and-braces DELETE is a
  no-op on a healthy prune and runs even on mid-case failure; global-setup
  wipes the Session table wholesale at every run start anyway (H-22/H-25).
- **Count ledger**: 137 → 138 unique cases; 272 → 274 passed + 2 skipped.
  The F-NN case-runs green on BOTH device projects (no desktop-only
  geometry — a DB/auth-level seam).

## 7. Mutation demos (the regression shapes, proven RED — BOTH halves)

1. **The check-drop** (the security-bearing half): delete the
   `if (session.expiresAt.getTime() < Date.now()) { … }` block — every
   present session row authenticates → REBUILD → the existing gates STAY
   GREEN (all future-expiry — the wire-blindness proof) while exactly the
   2 F-NN case-runs FAIL at the wire denial (URL stays on `/account`).
2. **The prune-drop** (the silent-lingering half): keep the check, drop the
   `await db.session.delete(…).catch(…)` line (the bounce still happens —
   compiles clean, no stranded variables) → REBUILD → the wire denial stays
   GREEN while exactly the 2 F-NN case-runs FAIL at the LOAD-BEARING prune
   dbRead (Expected null / Received row).

Both restored via inverse edit (`git diff --stat src/` empty) → rebuild →
green. The ADR-006 denylist's three revoke halves each own a gate after
this round: F-KK (logout), F-II (rotation), F-NN (TTL expiry).

## 8. Validation of this plan against the codebase (pre-execution)

- `getCurrentUser` read first-hand (auth.ts:120-137): the cookie parse, the
  `findUnique`, the expiry branch with its inline delete, the
  `toSafeUser` return. The check and the prune are separable halves, each
  with its own assertion (wire / dbRead).
- `/account` redirects anonymous → `/login?redirect=/account`
  (account/page.tsx:12, read first-hand) — the wire denial assertion.
- The F-KK describe (auth.spec.ts:460-580, read first-hand) establishes the
  exact offline-mint harness to reuse: the `test.use({ storageState })`
  minted-cookie shape, the `dbRead`/`sqlRun` helpers (spawnSync + the
  `<<JSON>>` marker + `prisma db execute`), the beforeAll
  INSERT…SELECT-with-DB-resolved-james, the afterAll belt-and-braces DELETE.
- All five existing offline-mint sites verified FUTURE-expiry this session
  (F-II ×2, F-KK, F-HH, a11y M-1) — the wire-blindness claim is a
  first-hand census, not an assumption.
- The sweeper (instrumentation.ts + sweeper.ts, read first-hand): boot pass
  + hourly interval — never inside a suite run (6.2m « 60m), and the F-NN
  row is inserted after boot — the prune assertion can only fire via
  `getCurrentUser`'s inline delete.
- `playwright.config.ts`: `fullyParallel: false, workers: 1` — the serial
  topology; the F-NN describe rides its own storageState (never the
  project's setup session — the H-24 trap F-KK documents).
- auth.spec.ts currently holds 8 uniques (counted first-hand) — 9 after.

## 9. Round-38 parity census (the standing ritual)

Two censuses on the final tree (38a with `--shots`, 38b re-run after a
rebuild), both viewports, against the LIVE reference (logged in with the
task credentials via agent-browser) — the 51st/52nd consecutive sweep.
Fields: desktop/mobile pageH, mainKids, footers, the mobile drawer's
panel/nav class strings + gap array (the v4 `flex gap-5` pin), console
residue. Plus the reference's functional posture (nav buttons inert — the
clone stays the functional superset) and the clone's mobile-menu behavior
verified end-to-end on the dev server. `rm -rf .next` before `npm run dev`
(the session-39 lesson); **rebuild before re-running the sweep** (the
session-40 lesson); `env -u DATABASE_URL` boots.

## 10. Final gates + docs

- typecheck ✓ lint ✓ 173/173 unit ✓ build ✓ E2E **274 passed + 2 skipped**
  (138 unique × 2) — the 41st consecutive fully-green session.
- Screenshots refreshed (the sweep's 9 + the dev-server login set).
- Docs aligned: SKILL (§2 E2E row + F-NN; §11 138; Appendix B NEW
  session-43 row), README, CLAUDE.md, PAD, AGENTS.md, this plan's
  execution record, worklog, `docs/session_55.md`; `.env.example`
  unchanged and matching the codebase; stale-count sweep zero.
- One main-branch commit pushed via the SSH wrapper v3
  (`--remote git@github.com:nordeim/luxury-fashion-store.git`).

## Execution record

| # | Task | Result |
|---|---|---|
| 1 | Plan probe | ✅ `scripts/plan-probe-session43.cjs` — **7/7 checks passed** on the throwaway DB copy + the standalone on :3209: the offline-minted EXPIRED james row (INSERT…SELECT, `datetime('now', '-1 day')` — PAST, james resolved by the DB), the mint's WIRE DENIAL (the cookie + expired row bounce /account → `/login?redirect=/account`), the bounce URL shape, **the CONTROL mint** (a FUTURE-expiry row + cookie on a fresh context renders /account signed-in — the denial is the EXPIRY, not a broken mint), **the LOAD-BEARING prune** (the expired row is GONE after the read — auth.ts:133's inline delete), the control row NOT pruned, zero console errors. Zero dev-DB writes, zero e2e.db writes |
| 2 | auth.spec.ts describe | ✅ NEW describe "expired session denial (F-NN, session-43)" at the END of `tests/e2e/auth.spec.ts` (the file's uniques 8 → 9), ONE case riding its own minted storageState (ZERO logins, ZERO registers, ZERO limiter consumption): the precondition dbRead (the row exists + its expiry is PAST), **LOAD-BEARING 1** (the wire denial: /account bounces to /login?redirect=/account), **LOAD-BEARING 2** (the prune: the row is GONE after the read, server-truth dbRead); typecheck ✓ eslint ✓; GREEN **20 passed** (9 uniques × 2 + 2 setups; 49.7s; F-NN green on BOTH projects, 755ms) |
| 3 | Mutation demo 1 (the check-drop) | ✅ the entire expiry block deleted from `src/lib/auth.ts:132-135` (the zombie-auth shape: every present session row authenticates — up to a 1h window on a long-running server; the full dropped-check shape compiles clean) → REBUILD → **the existing gates STAYED GREEN** (18 passed — incl. F-II, F-JJ, F-KK, every login/logout case; all their sessions are future-expiry — the wire-blindness proof) while **exactly the 2 F-NN case-runs failed** at LOAD-BEARING 1 (`toHaveURL` — the page stayed SIGNED-IN on /account) → restored via inverse edit |
| 4 | Mutation demo 2 (the prune-drop) | ✅ the `await db.session.delete(…)` line dropped, the check + `return null` kept (the silent-lingering shape: the bounce still happens — compiles clean, no stranded variables) → REBUILD → **the wire denial stayed GREEN** (the bounce fired) while **exactly the 2 F-NN case-runs failed** at LOAD-BEARING 2 (Expected null / Received `{"id": "fnn-james-…"}` — the row lingers until the hourly sweeper) → restored via inverse edit → `git diff --stat src/` empty (byte-identical) → rebuild → **20/20 green**. The ADR-006 denylist's three revoke halves each own a gate: F-KK (logout), F-II (rotation), F-NN (TTL expiry) |
| 5 | Round-38 census + screenshots | ✅ **ZERO DRIFT — byte-identical to the round-34/35/36/37 ledger in ALL census fields (51st/52nd consecutive sweep)**: 38a (with `--shots` on the post-restore build) + 38b (re-run after the post-dev rebuild — the session-40 lesson honored): desktop pageH 11079 (ref) / 11085 (clone), mobile 11257 / 11264, mainKids 11 BOTH sides both viewports, footers 444/444 (desktop) / 1189/1189 (mobile), the drawer char-identical (panelCls `fixed left-0 top-0 h-full w-80 bg-background z-50 p-8 flex flex-col gap-6` + navCls `flex flex-col gap-5 mt-4`, 5 items, gaps [20,20,20,20]) — **the v4 mobile-nav pin holds** (the standing task re-check); ref console = the documented 2× 401 residue; clone console clean. The reference's functional posture re-confirmed first-hand through agent-browser (logged in with the task credentials): the WOMEN nav button INERT (click → URL unchanged at `/`) — the clone stays the functional superset. The clone's mobile-menu behavior verified end-to-end on the dev server through real Playwright (`scripts/dev-hydration-probe-session38.cjs`, `rm -rf .next` first per the session-39 lesson; the dev server needed the documented `env -u DATABASE_URL` boot): burger visible → drawer opens (dialog:1) → body overflow hidden → Women → `/shop?category=women` → menu closed → overflow restored → zero console errors (the first run raced Turbopack's cold compile of `/shop` — the warm re-run measured the navigation exactly, the session-40/41 measurement note reproduced). Screenshots: 13 refreshed (the sweep's 9 via `--shots` + the dev-server login set via `scripts/dev-shots-session39.cjs`: clone-login, clone-cart, clone-account, clone-admin-dashboard — zero console errors; the dev cart's item rows cleaned after the shot — canonical 4/12/2/4 re-verified by direct Prisma count) |
| 6 | Final gates on the final tree | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **274 passed + 2 skipped** (138 unique × 2 − 2 desktop-only skips; the +2 setup projects pass outside the case-run summary; 6.3m) — the FORTY-FIRST consecutive fully-green session, exactly the §6 count ledger (137→138 unique, 272→274 passed); the F-NN case-runs green on BOTH device projects |
| 7 | Docs alignment + stale-count sweep | ✅ SKILL v1.36.0 (frontmatter 138+274+2 + the F-NN gate; §2 E2E row + F-NN; §11 138; Appendix B NEW session-43 row with the zombie-auth-window note); README (badge 173+274, the Auth row's F-NN pin + the testing row's expired-session gate + status rows 138); CLAUDE.md (gate line 138 + the F-MM→F-NN chain, NEW F-NN testing bullet, commands 138); PAD (test table 18\|138\|274, §7.3 command 138, the coverage-map session-43 extension); AGENTS.md (the security line gains the F-NN gate; the E2E command row 138); docs/remediation-plan-session43.md (this record); worklog; docs/session_55.md (the round's narration log — session_54.md taken by the pulled commit); scripts/plan-probe-session43.cjs (the probe artifact). `.env.example` unchanged and matching the codebase. Stale-count sweep over the five living docs: zero stale counts |

## 11. Residual risks / next steps (post-F-NN)

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
   exceptions (carried, sessions 26–42).
7. Real PSP behind the checkout seam (carried).
8. Dev-toolchain npm-audit findings (11, all dev-only) — carried.
9. The checkout limiter budget stays 8 < 10 — ONE more per-project
   checkout-placement case fits; document before adding.
10. The cart/wishlist sweeper-anchor touch writes (cart.ts:39/41) stay
    source-read-only (the 30d idle window is not wire-reachable inside a
    suite run; the boot-only sweeper never fires mid-run) — NEW carried
    entry, documented this round.
11. The zero-drift streak is a streak, not a guarantee — the census ritual
    stays mandatory.
12. security.txt `Expires` (2027-11-01) renewal cadence (carried).
13. `NewsletterSubscriber` stays outside global-setup's wipe list
    (carried).
14. The sandbox kills detached process groups — long gates in the
    foreground (carried, honored again this round).
15. `rm -rf .next` before `npm run dev` after build-heavy rounds, then
    rebuild before re-running the sweep (the session-39/40 lessons,
    honored again this round).
