# Remediation Plan — Session 44 (F-OO: the API deliberate-failure shapes + the search limiter floor — a throwaway broken-DB server)

The session-43 continuation round. Per the standing precedent: audit the pulled
HEAD (`068b0d4` — the parallel thread's session-log commit), re-verify the
baseline, run the fresh audit pass, then close the strongest finding with a
TDD gate.

## 1. Starting state

- FRESH CLONE this round (the sandbox workspace had been reset — `git clone`
  per the task brief). The known recovery set, all closed BEFORE any gate:
  `npm install` ✓ (486 packages); the canonical 3-line `.env` with
  `DATABASE_URL="file:../db/custom.db"` ✓; `db:setup` materializing
  `db/custom.db` at the canonical 4/12/2/4 (the seed's own completion print)
  ✓; Playwright chromium-1248 reinstalled ✓ (the cache shipped only 1200 —
  the 3rd consecutive reset with this quirk).
- HEAD `068b0d4` = remote `main` (the parallel thread's session_56.md — the
  raw transcript of the SAME session-43 round, +72 docs-only).
- The committed tree's contract: 173 unit (19 files) · 138 unique E2E × 2
  device projects − 2 desktop-only skips = **274 passed + 2 skipped** ·
  typecheck ✓ lint ✓ build ✓.

## 2. Audit of `068b0d4` (the pulled HEAD) — first-hand

`git show --stat 068b0d4` → 1 file, +72: `docs/session_56.md` only — the
parallel thread's raw narration transcript of the same session-43 round; its
ledger matches `b60c39c`'s actual work (test-only, zero `src/`, the F-NN
describe + 13 screenshots + five-docs alignment + SKILL v1.36.0). Docs-only,
RETAINED (never overwrite another thread's log). This round's narration ships
as `docs/session_57.md` (session_56.md taken by the pulled commit).

## 3. Baseline re-verification (fresh clone, recovery closed)

- typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build + assemble ✓
- E2E **274 passed + 2 skipped** (138 unique × 2; 6.2m) — the 42nd
  consecutive session fully green at baseline, exactly matching session-43's
  final gates.

## 4. Fresh audit pass — the round's finding

The session-43 plan §11 directive: the app's read/write seams are exhausted;
the strongest residual candidates are the deliberate-failure shapes and the
search-429 limiter (both carried since their respective rounds). The
standing Tailwind v4 / mobile-nav pins re-verified first-hand (the drawer's
`flex flex-col gap-5 mt-4` at mobile-nav.tsx:76, the `w-80` panel; every
`@theme` token a full `hsl()` literal in globals.css; zero `space-y` on
parity surfaces — the non-parity auth-form uses are cosmetic-only).

**F-OO — the API's deliberate-failure shapes + the search 429 limiter floor.**
The F-Y gate (session-29) pinned every HEALTHY shape of the three REST route
handlers, and its own spec header documents the deliberate rejection: *"ok
stays true even when the DB read fails, db:false carrying the diagnosis —
that failure shape is fault-injection territory, rejected per the F-I
precedent; the success shape is the wire pin."* The residual ledger has
carried the search-503 / health-db:false shapes as source-read-only and the
search-429 as unpinned-by-design (pollution) ever since (§11 items 3–4 of
the session-43 plan).

**The design insight this round: the fault injection never has to touch the
shared suite server.** Boot a THROWAWAY standalone — the very same
`.next/standalone/server.js` the suite boots — on :3211 with `DATABASE_URL`
pointing at a nonexistent directory. The isolated process gets:

1. **its own in-memory rate-limiter buckets** (`rate-limit.ts`: `const
   buckets = new Map()` at module scope — per-process state) — the 60/min
   search floor trips with ZERO pollution of the main server's
   `search:local` bucket (the exact pollution that kept the 429 carried);
2. **its own SQLite connection that fails on open** (`db-path.ts` passes
   absolute `file:` URLs through untouched — the resolver's own pinned
   contract; SQLite cannot create a file inside a nonexistent directory) —
   every DB read throws, so the three routes' catch paths fire ON THE WIRE;
3. **a server that still boots and listens** (`instrumentation.ts`:
   `void runSweep().catch(…)` — the boot sweep's failure is caught and
   logged, never fatal; the AUTH_SECRET guard is satisfied by the shared
   `E2E_AUTH_SECRET`).

The F-I-precedent objection (fault injection into the shared server, which
would break every later spec) does not apply to an isolated throwaway
process on its own port with its own broken URL — the exact harness shape
every plan-probe already uses, promoted into a permanent gate.

The four ungated halves, each wire-blind today (every existing F-Y case
asserts against the HEALTHY suite server):

| Half | Dropped/inverted shape | Today's blind spot |
|---|---|---|
| health `db:false` (`health/route.ts` catch) | the catch returns `{ok:true, db:true}` — the LYING liveness probe | the F-Y case asserts `{"ok":true,"db":true}` on the healthy server — a lying catch keeps it green while the monitoring dashboard shows green with the DB down (the silent-monitoring-blind class) |
| search 503 (`search/route.ts` catch, F-12) | the catch 500s — the raw crash | the F-12 comment documents this bug as having SHIPPED BEFORE ("a DB blip or corrupt row used to 500 the API"); no gate has ever served the 503 |
| newsletter 503 (`newsletter/route.ts` catch, H-20) | the catch 500s | H-20: "a DB blip must not be a raw 500 on a whitelisted public endpoint" — same shipped-before class, never wire-served |
| search 429 (`search/route.ts` limiter) | the `if (!limiter.allowed)` block dropped | a burst rides straight through to the DB path; no gate has ever tripped the floor (61 requests/min + shared-bucket pollution — §11 item 3) |

HIGH-value coverage class (public-endpoint availability contracts + the
limiter's abuse floor), zero product defect today (all four sources are
correct; nothing asserts them).

## 5. Plan-probe discipline (run BEFORE the spec)

`scripts/plan-probe-session44.cjs` — a throwaway standalone on :3209 with a
broken `DATABASE_URL` (a nonexistent tmpdir path), wire-verifying every
F-OO assumption:

1. the server BOOTS and LISTENS (poll `/api/health` on :3209 until it
   answers — the load-bearing feasibility check: the boot-sweep failure is
   caught, never fatal);
2. `/api/health` → 200 + `{"ok":true,"db":false}` (the honest liveness
   probe: the process is ALIVE, the DB is DOWN);
3. `/api/search?q=silk` → 503 + `{ok:false, results:[]}` (the F-12
   degradation);
4. `POST /api/newsletter` with a VALID email → 503 +
   `{ok:false, error:string}` (the H-20 degradation — a valid email must
   reach the upsert for the catch to fire);
5. the 61-request burst on `/api/search` → requests 1–60 answer 503 (the
   DB failure — the limiter still allows), request 61+ → 429 +
   `{ok:false, results:[]}` (the limiter floor — on the THROWAWAY process's
   own fresh bucket);
6. the CONTROL server: the same spawn shape with a HEALTHY throwaway copy
   of `db/custom.db` serves `{"ok":true,"db":true}` — proving the db:false
   is the DB, not a broken spawn (the F-NN control-mint discipline);
7. kill → exit confirmed; the broken path's directory never materialized
   (no file writes anywhere).

## 6. Remediation design (TDD)

NEW describe **"api deliberate-failure shapes (F-OO, session-44)"** at the
END of `tests/e2e/api-contract.spec.ts` (the OWNING spec — the API routes'
own; the file's uniques 9 → 10).

- **ONE case**, request-level (no browser surface): spawn the throwaway
  standalone (`node .next/standalone/server.js`, `PORT=3211`,
  `NODE_ENV=production`, `AUTH_SECRET=E2E_AUTH_SECRET`, `DATABASE_URL` =
  a nonexistent tmpdir path) inside a try/finally; poll `/api/health` on
  :3211 until it answers; then the four LOAD-BEARING assertion groups
  (health db:false; search 503; newsletter 503; the 61-burst → 429); the
  finally SIGTERMs the child and waits for exit.
- **ZERO logins, ZERO registers, ZERO limiter consumption on the MAIN
  server** (the case never touches :3100's buckets; the newsletter 503
  assertion fires on the throwaway's OWN fresh newsletter bucket — count
  1 < 10; the 61-burst trips only the throwaway's search bucket).
- **Zero DB writes anywhere**: the broken URL's directory never exists
  (SQLite cannot create a file in a nonexistent directory — the failure
  mode under test); the main e2e.db is untouched; no SQL fixtures, no
  afterAll cleanup (nothing to clean — H-24's cleanest shape).
- **Count ledger**: 138 → 139 unique cases; 274 → 276 passed + 2 skipped.
  The F-OO case-runs green on BOTH device projects (a request-level seam —
  no viewport dependence). Port 3211 (distinct from the suite's :3100 and
  the probe's :3209; workers:1 serial topology).

## 7. Mutation demos (the regression shapes, proven RED — all four halves)

1. **The health LYING shape**: the catch's body swapped to
   `{ok: true, db: true}` → REBUILD → the existing F-Y health case STAYS
   GREEN (it asserts `{"ok":true,"db":true}` on the healthy server — the
   wire-blindness proof) while exactly the 2 F-OO case-runs fail at the
   db:false assertion.
2. **The search raw-500 shape**: the catch's response swapped to
   `status: 500` (the F-12 documented bug class) → REBUILD → the existing
   search cases STAY GREEN while exactly the 2 F-OO case-runs fail at 503.
3. **The newsletter raw-500 shape**: the catch's response swapped to
   `status: 500` (the H-20 class) → REBUILD → the existing newsletter
   cases STAY GREEN while the 2 F-OO case-runs fail at 503.
4. **The limiter-drop**: the `if (!limiter.allowed) { … }` block deleted
   → REBUILD → the 61-burst rides through to the DB path (503 on the
   broken server) — the existing cases STAY GREEN (≤9 search requests on
   the healthy server « 60) while the 2 F-OO case-runs fail at the 429
   assertion.

All restored via inverse edit (`git diff --stat src/` empty) → rebuild →
green.

## 8. Validation of this plan against the codebase (pre-execution)

- `health/route.ts` read first-hand: the try/catch, the two envelopes
  (`{ok:true,db:true}` / `{ok:true,db:false}`), the 200 on both halves.
- `search/route.ts` read first-hand: the **limiter-first ordering** (the
  429 fires BEFORE the DB read — the burst composes with the broken DB:
  requests 1–60 → the DB failure 503, request 61+ → the limiter 429), the
  F-12 catch → 503.
- `newsletter/route.ts` read first-hand: the limiter → json parse → Zod →
  upsert catch → 503 ordering (a VALID email must reach the upsert for
  the 503 to fire).
- `rate-limit.ts` read first-hand: the module-scope
  `const buckets = new Map()` — per-process state; the throwaway server's
  buckets are disjoint from the main server's (the pollution objection
  dissolves); `clientIpFrom` returns `"local"` without `TRUST_PROXY` (the
  throwaway's key: `search:local`).
- `instrumentation.ts` read first-hand: `void runSweep().catch(…)` — the
  boot-sweep failure is logged, never fatal; the AUTH_SECRET guard
  (production, ≥8 chars) is satisfied by the shared `E2E_AUTH_SECRET`.
- `db-path.ts` read first-hand: absolute `file:` URLs pass through
  untouched — the broken URL stays broken inside the standalone.
- `playwright.config.ts` read first-hand: the webServer env shape
  (`node .next/standalone/server.js` + `PORT` + `NODE_ENV` +
  `DATABASE_URL` + `AUTH_SECRET`) — the throwaway spawn mirrors it
  exactly; `workers: 1, fullyParallel: false` (the serial topology).
- `api-contract.spec.ts` read first-hand: 9 uniques counted; the F-Y
  header's own rejection note (the deliberate-failure shapes explicitly
  left ungated); the `E2E_AUTH_SECRET` import path
  (`./e2e-secrets`) established by playwright.config.ts itself.
- The standalone exists post-`npm run build` (the E2E suite's own
  prerequisite — the throwaway spawns the same artifact).
- Trap #13 honored: `process.cwd()`-based paths in the spec (the
  Playwright loader compiles TS as CJS; `import.meta` unavailable).

## 9. Round-39 parity census (the standing ritual)

Two censuses on the final tree (39a with `--shots`, 39b re-run after the
post-dev rebuild), both viewports, against the LIVE reference (logged in
with the task credentials via agent-browser) — the 53rd/54th consecutive
sweep. Fields: desktop/mobile pageH, mainKids, footers, the mobile
drawer's panel/nav class strings + gap array (the v4 `flex gap-5` pin),
console residue. Plus the reference's functional posture (nav buttons
inert — the clone stays the functional superset) and the clone's
mobile-menu behavior verified end-to-end on the dev server. `rm -rf .next`
before `npm run dev` (the session-39 lesson); **rebuild before re-running
the sweep** (the session-40 lesson); `env -u DATABASE_URL` boots.

## 10. Final gates + docs

- typecheck ✓ lint ✓ 173/173 unit ✓ build ✓ E2E **276 passed + 2 skipped**
  (139 unique × 2) — the 43rd consecutive fully-green session.
- Screenshots refreshed (the sweep's 9 + the dev-server login set).
- Docs aligned: SKILL (§2 E2E row + F-OO; §11 139; Appendix B NEW
  session-44 row), README, CLAUDE.md, PAD, AGENTS.md, this plan's
  execution record, worklog, `docs/session_57.md`; `.env.example`
  unchanged and matching the codebase; stale-count sweep zero.
- One main-branch commit pushed via the SSH wrapper v3
  (`--remote git@github.com:nordeim/luxury-fashion-store.git`).

## Execution record

| # | Task | Result |
|---|---|---|
| 1 | Plan probe | ✅ `scripts/plan-probe-session44.cjs` — **8/8 checks passed** on the throwaway broken-DB standalone on :3209: the server BOOTS and LISTENS (the boot-sweep failure caught + logged, never fatal); `/api/health` → 200 + `{"ok":true,"db":false}` (the honest liveness probe); `/api/search?q=silk` → 503 + `{ok:false,results:[]}` (F-12); `POST /api/newsletter` (valid email) → 503 + the H-20 envelope; the 61-request burst → first=503, last=429, exactly 59× 503 + 1× 429 (the deterministic limiter floor on the throwaway's own fresh bucket); the 429 envelope; **the CONTROL server** (same spawn shape, healthy throwaway copy of db/custom.db) serves `{"ok":true,"db":true}` — the denial is the DB, not a broken spawn; the broken path's directory never materialized. Zero dev-DB writes, zero e2e.db writes |
| 2 | api-contract.spec.ts describe | ✅ NEW describe "api deliberate-failure shapes (F-OO, session-44)" at the END of `tests/e2e/api-contract.spec.ts` (the file's uniques 9 → 10), ONE request-level case spawning the throwaway standalone on :3211 (PORT/NODE_ENV/AUTH_SECRET/DATABASE_URL mirroring the webServer env shape; the broken URL a nonexistent tmpdir path; try/finally SIGTERM→SIGKILL kill; poll /api/health until it answers): **LOAD-BEARING 1** (health 200 + `{"ok":true,"db":false}`), **LOAD-BEARING 2** (search 503 + the F-12 envelope), **LOAD-BEARING 3** (newsletter 503 + the H-20 envelope, a VALID email reaching the upsert), **LOAD-BEARING 4** (the 60-burst: first=503, last=429, exactly 59× 503 + 1× 429 — the bucket pre-seeded by LB2; plus the 62nd request still denied + the 429 envelope), and the zero-writes proof (the broken directory never exists). ZERO logins, ZERO registers, ZERO main-server limiter consumption, zero DB writes, no cleanup fixtures. typecheck ✓ eslint ✓ (one nullable-stderr TS fix during authoring); GREEN **22 passed** (10 uniques × 2 + 2 setups; 12.2s; F-OO green on BOTH projects, ~830ms each) |
| 3 | Mutation demo 1 (health lying) | ✅ the catch's body swapped to `{ok:true, db:true}` (the LYING liveness shape — a monitor shows green with the DB down) → REBUILD → **all 20 existing case-runs GREEN** (incl. the F-Y health case asserting `{"ok":true,"db":true}` on the healthy server — the wire-blindness proof) while **exactly the 2 F-OO case-runs failed** at LOAD-BEARING 1 → restored via inverse edit |
| 4 | Mutation demo 2 (search raw-500) | ✅ the catch's status swapped to 500 (the F-12 documented shipped-before bug class) → REBUILD → **the 20 existing runs GREEN** (every search case rides the healthy server) while **exactly the 2 F-OO case-runs failed** at LOAD-BEARING 2 → restored via inverse edit |
| 5 | Mutation demo 3 (newsletter raw-500) | ✅ the catch's status swapped to 500 (the H-20 class) → REBUILD → **the 20 existing runs GREEN** while **exactly the 2 F-OO case-runs failed** at LOAD-BEARING 3 → restored via inverse edit |
| 6 | Mutation demo 4 (limiter-drop) | ✅ the `if (!limiter.allowed) { … 429 }` block deleted (the burst rides through to the DB path) → REBUILD → **the 20 existing runs GREEN** (≤9 search requests on the healthy server « 60) while **exactly the 2 F-OO case-runs failed** at LOAD-BEARING 4 → restored via inverse edit → `git diff --stat src/` empty (byte-identical) → rebuild → **22/22 green**. The API's four failure floors each own a gate half: health db:false, search 503, newsletter 503, the 429 limiter floor |
| 7 | Round-39 census + screenshots | ✅ **CLONE-side ZERO DRIFT ×2 (39a + 39b post-rebuild) — byte-identical to the round-38 clone-side ledger in ALL census fields**: desktop pageH 11085, mobile pageH 11264, mainKids 11 both viewports, footers 444 (desktop) / 1189 (mobile), the drawer char-identical (panelCls `fixed left-0 top-0 h-full w-80 bg-background z-50 p-8 flex flex-col gap-6` + navCls `flex flex-col gap-5 mt-4`, 5 items, gaps [20,20,20,20]) — **the v4 mobile-nav pin holds** (the standing task re-check); clone console clean both censuses. **ENVIRONMENT: the LIVE reference (Base44) served HTTP 503 throughout the census window** (10+ minutes of probes on `/` and `/login` — a platform outage; the two-sided sweep crashed at the ref's null `<main>`), so the reference-side fields CARRY BY DOCUMENTATION from the round-38 live measurement (desktop 11079, mobile 11257, the documented 2× 401 console residue) and the reference-posture re-check (the WOMEN-inert confirmation) + the 2 ref screenshots are DEFERRED pending the platform's recovery — the clone stays the functional superset by the standing 51-sweep record. The clone's mobile-menu behavior verified end-to-end on the dev server through real Playwright (`scripts/dev-hydration-probe-session38.cjs`, `rm -rf .next` first per the session-39 lesson; `env -u DATABASE_URL` boot): burger visible → drawer opens (dialog:1) → body overflow hidden → Women → `/shop?category=women` → menu closed → overflow restored → zero console errors (the first run raced Turbopack's cold compile of `/shop` — the warm re-run measured the navigation exactly, the documented session-40/41/43 measurement note reproduced). Screenshots: 11 refreshed (the sweep's 7 clone shots via `scripts/clone-census-session44.cjs` + the dev-server login set via `scripts/dev-shots-session39.cjs`: clone-login, clone-cart, clone-account, clone-admin-dashboard — zero console errors; the dev cart's rows cleaned after the shot, canonical 4/12/2/4 re-verified by direct Prisma count with the absolute-URL pattern) |
| 8 | Final gates on the final tree | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **276 passed + 2 skipped** (139 unique × 2 − 2 desktop-only skips; the +2 setup projects pass outside the case-run summary; 6.2m) — the FORTY-THIRD consecutive fully-green session, exactly the §6 count ledger (138→139 unique, 274→276 passed); the F-OO case-runs green on BOTH device projects (~830ms each) |
| 9 | Docs alignment + stale-count sweep | ✅ SKILL v1.37.0 (frontmatter 276/139 + the F-OO gate; §2 E2E row + F-OO; §11 139; Appendix B NEW session-44 row with the reference-outage note); README (badge 173+276, the Testing row's F-OO pin + the status row's F-OO entry, testing/architecture/status rows 139); CLAUDE.md (gate line 139 + the F-NN→F-OO chain + the NEW F-OO segment, commands 139); PAD (test table 18\|139\|276, §7.3 command 139, the coverage-map session-44 extension); AGENTS.md (the security line gains the F-OO gate; the E2E command row 139); docs/remediation-plan-session44.md (this record); docs/session_57.md (the round's narration log — session_56.md taken by the pulled commit); scripts/plan-probe-session44.cjs + scripts/clone-census-session44.cjs (the round's artifacts). `.env.example` unchanged and matching the codebase. Stale-count sweep over the five living docs: zero stale counts |

## 11. Residual risks / next steps (post-F-OO)

1. The merge's H-29 transaction-atomicity half stays source-read-only
   (wire fault-injection into a SQLite tx is not Playwright-reachable;
   carried).
2. The success gate's foreign-owner row stays covered-by-shape (carried).
3. The login/register limiter 429 floors stay unpinned (the auth buckets
   are 10/15min and the setup sessions consume them lawfully — a throwaway
   burst would close them the same way F-OO closes search's; candidate for
   a future round, now that the harness shape exists).
4. The register bucket stays 8 < 10 — keep preferring no-register shapes.
5. The PDP og:image annotation / og:type union / `style-src
   'unsafe-inline'` exceptions (carried, sessions 26–43).
6. Real PSP behind the checkout seam (carried).
7. Dev-toolchain npm-audit findings (11, all dev-only) — carried.
8. The checkout limiter budget stays 8 < 10 — ONE more per-project
   checkout-placement case fits; document before adding.
9. The cart/wishlist sweeper-anchor touch writes (cart.ts:39/41) stay
   source-read-only (carried).
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
15. The F-OO throwaway-server harness spawns a child process per case-run
    (2 per full suite run, ~2s boot each) — if a future round adds more
    throwaway-server cases, consider a describe-scoped beforeAll spawn to
    amortize (NEW carried note).
16. The reference platform's 503 outage (Base44, this round's census window —
    10+ minutes of probes) deferred the two-sided census's reference half,
    the WOMEN-inert posture re-check, and the 2 ref screenshots; the NEXT
    round should re-run the FULL two-sided sweep + the agent-browser
    posture check FIRST THING if the platform has recovered (NEW carried
    entry, documented this round).
