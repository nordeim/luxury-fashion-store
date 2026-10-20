# Remediation Plan — Session 53 (F-XX: the transient-state sweeper's runtime seam — runSweep's three executor deleteMany calls + the instrumentation boot wiring, all wire-blind; the executor's happy path has NEVER run successfully in any test)

The session-52 continuation round. Per the standing precedent: audit the pulled
HEAD (`72796a9`), re-verify the baseline, re-probe the reference platform FIRST
THING, run the fresh audit pass, then close the strongest finding with a TDD
ladder. Like F-UU/F-VV/F-WW this is a **gate-only round**: the source contract
is CORRECT today (verified first-hand below); what is missing is the GATE —
every runtime half can drop with every existing case green (the silent-class
definition), and the sharpest fact of the audit: **in the E2E harness
`runSweep` has never successfully deleted a single row** (the boot sweep
P2021-soft-skips every run because the harness webServer boots against a
schema-less `db/e2e.db`; the hourly interval never fires inside a 7-minute
suite run). The executor's happy path is unproven on the wire ANYWHERE.

## 1. Starting state

- **The workspace WAS RESET this round** (fresh clone; no node_modules, no
  `.env`, no DBs, no Playwright browsers). The documented recovery sequence ran
  and is proven again: `npm install` → write `.env` (`DATABASE_URL=
  "file:../db/custom.db"`, AUTH_SECRET, NEXT_PUBLIC_SITE_URL, TRUST_PROXY="")
  → `env -u DATABASE_URL npm run db:setup` (4 categories, 12 products, 2
  users, 4 orders — `db/custom.db` at the repo root, the schema-relative
  contract) → `npx playwright install chromium`.
- Pulled HEAD `72796a9` = `6a451ab` (session-52's push: the two F-WW describes
  + the probe + docs — **zero `src/` delta**, verified first-hand via
  `git show --stat`) + `docs/session_74.md` (the prior round's raw narration;
  docs-only, RETAINED). This round's narration ships as `docs/session_75.md`.
- Baseline re-proven on the recovered workspace: typecheck ✓ lint ✓ 173/173
  unit (19 files) ✓ build ✓ E2E **298 passed + 2 skipped** (150 unique × 2,
  7.6m) — the 58th consecutive fully-green baseline, exactly session-52's
  final gates.
- Standing pins re-verified first-hand: the F-WW specs present (4 references
  in each owning file), the isActive wall at cart.ts:58, the cart-line walls
  at cart.ts:142/:234, the STOCK_SHORT guard at checkout.ts:105/:148,
  mobile-nav `w-80` + `flex flex-col gap-5 mt-4` + `flex flex-col gap-6`,
  26 `hsl()` literals in globals.css, `.env` written to the contract +
  `.env.example` matching, `db/` at the root, both test configs intact.

## 2. Reference platform re-probe (the FIRST-THING directive)

The live reference (Base44) answered **HTTP 503 on both `/` and `/login`** at
the round's start — the sessions-44..52 outage, now the TENTH consecutive
round. Handled per the honest-outage precedent: the census runs CLONE-side ×2;
the reference-side fields carry by documentation from the round-38 live
measurement; the WOMEN-inert posture re-check + the 2 ref screenshots stay
DEFERRED; one final re-probe before the final gates. If the platform recovers
mid-round, the full two-sided sweep runs then.

## 3. Fresh audit pass — the round's finding (F-XX)

With the mutation seams' authz walls closed (F-SS/F-TT/F-UU) and both
guest→user merge seams (F-VV) plus the bag's stock/visibility chain (F-WW)
gated end-to-end, the fresh audit swept the remaining ungated mutation
seams — and found the one seam that is NOT a server action: the
**transient-state sweeper** (`src/lib/sweeper.ts` + `src/instrumentation.ts`,
K-1, session-6), the storefront's only bulk-delete mutation path:

| Contract half | Source | Gate before this round |
|---|---|---|
| **The pure sweep plan** (cutoffs + the `userId: null` ownership discriminator) | sweeper.ts:14-31 `buildSweepPlan` | **unit-pinned** (sweeper.test.ts: the three where shapes by `toEqual`, the 30-day window, the never-sweeps-user-owned test, determinism) — NOT wire-blind |
| **The P2021 boot-race classifier** | sweeper.ts:33-40 `isSchemaNotReady` | **unit-pinned** (accepts the exact P2021 shape + bare code-carriers; rejects P2002/P2025/P2022/junk) — NOT wire-blind |
| **runSweep's session deleteMany** | sweeper.ts:53 `db.session.deleteMany({ where: plan.sessionWhere })` | **ZERO** — the executor is a thin wrapper no test executes successfully |
| **runSweep's guest-cart deleteMany** | sweeper.ts:54 `db.cart.deleteMany({ where: plan.guestCartWhere })` | **ZERO** — same |
| **runSweep's guest-wishlist deleteMany** | sweeper.ts:55 `db.wishlist.deleteMany({ where: plan.guestWishlistWhere })` | **ZERO** — same |
| **The instrumentation boot call** (the wiring that ever fires the sweep) | instrumentation.ts:36-46 `void runSweep().catch(…isSchemaNotReady…)` | **ZERO** — a dropped boot call means production NEVER sweeps until an hour of uptime, and NO test observably fails |
| **The hourly interval + the F-J soft-skip wiring** | instrumentation.ts:33,48-50 | the soft-skip is implicitly wire-proven every harness run (the :3100 webServer's own boot P2021s and the server still serves — if the catch rethrew, EVERY spec would fail at setup); the interval's 60-min cadence is structurally outside any test window (documented, carried) |

The wire-blindness was first documented by F-NN (session-43, auth.spec.ts:591-
618): *"the sweeper unit test pins the PLAN shape only, never the runtime
seam… The sweeper runs at boot + hourly — never inside a 6-minute suite
run"* — and carried ever since. This round closes it.

### 3.1 Why the halves matter (the harm chain, every link source-verified)

1. **The never-executed happy path**: in the E2E harness the boot sweep
   races schema creation (the webServer boots against a schema-less
   `db/e2e.db`) and P2021-soft-skips EVERY run; the hourly interval (60 min)
   never fires inside a 7.6-minute suite run. In production the first
   successful sweep happens at the first post-migration boot. A bug in the
   executor — a dropped deleteMany, a wrong model, an inverted where — ships
   invisible today: `grep -rn "sweep" tests/e2e/` finds only comments.
2. **The session deleteMany drop**: expired session rows linger forever
   (F-NN's read-time prune only fires when the dead session is PRESENTED
   again; rows never re-presented linger up to the SQLite file's life) — the
   ADR-006 denylist's bulk half silently dead, the monotonic-growth problem
   K-1 exists to fix.
3. **The cart/wishlist deleteMany drops**: 30-day-idle guest carts and
   wishlists accumulate forever — the same unbounded growth on the two
   highest-churn tables (every anonymous visitor mints one).
4. **The `userId: null` discriminator (unit-owned, wire-asserted)**: a
   collapse to `{ updatedAt: { lt: cutoff } }` makes the hourly sweep DELETE
   USER-OWNED SAVED BAGS — a signed-in customer's bag vanishes between
   visits, the catastrophic data-loss shape. The unit gate owns the term
   (sweeper.test.ts:29-35); this round's gate ASSERTS the survivor on the
   wire (a member cart idle beyond the window SURVIVES the sweep) without
   re-demoing the unit-owned half.
5. **The boot-wiring drop**: `register()` loses the `void runSweep()` call —
   production NEVER sweeps at boot (up to an hour of zombie rows on every
   deploy + the whole K-1 contract resting on the interval alone), and no
   existing test observably fails.

### 3.2 Why this outranks the named candidates

Same precedence rule as sessions 47-52: a mutation seam with a
never-executed happy path and a catastrophic where-clause shape outranks the
documentation-class polish. The named candidates (the PDP og:image
annotation, the og:type union, `style-src 'unsafe-inline'`) were re-read
first-hand this round — all three carry DOCUMENTED deliberate decisions in
the source (product/[slug]/page.tsx:33-51 + csp.ts:8-13: the remote catalog
URL's dimensions are not statically known; Next's OpenGraphType union lacks
"product" and a type-dishonest cast was rejected; React injects inline
styles so style-src needs unsafe-inline in both modes). The sweeper is the
LAST ungated mutation reach in `src/lib` — and the throwaway-copy pattern
(F-QQ/F-WW) finally makes its runtime seam deterministically gateable: on a
healthy copy the schema EXISTS at spawn time, so the boot race dissolves and
the sweep fires its happy path on demand.

## 4. Plan-probe discipline (run BEFORE the spec)

`scripts/plan-probe-session53.cjs` — the throwaway healthy-copy standalone on
:3209 (the F-PP/F-VV/F-WW copyFile pattern; the sweep needs the copy's schema
present so the boot pass runs its happy path), wire-verifying every F-XX
assumption:

1. the fixture-minted copy BOOTS and LISTENS (`/api/health` → 200 +
   `{"ok":true,"db":true}`) — instrumentation's `register()` runs in the
   standalone (the F-J harness observation, now first-hand on demand);
2. **the boot sweep fires and completes**: the PAST-expiry session fixture
   and the 40-day-idle guest cart fixture are GONE from the copy (observed
   by polling the copy's SQLite from the probe side with a bounded
   deadline — `register()` fires `runSweep()` unawaited, so the health 200
   does NOT imply sweep completion; the poll is the deterministic join);
3. **the keep matrix holds**: the FUTURE-expiry session, the RECENT guest
   cart, the RECENT guest wishlist, and the USER-OWNED 40-day-idle cart all
   SURVIVE (the ownership discriminator on the wire);
4. **the cascade holds**: the idle cart's CartItem row is GONE with its
   parent (onDelete: Cascade — the sweep must not orphan lines);
5. **the idle guest wishlist + its item are GONE; the recent one survives**;
6. **the F-J soft-skip wiring, proven explicitly**: a SECOND throwaway spawn
   against a SCHEMA-LESS tmpdir database boots and serves health 200 (the
   boot sweep P2021s and the classifier downgrades it — the wiring every
   harness run proves implicitly, now on demand);
7. the finally SIGTERMs both children (SIGKILL escalation) and removes both
   tmpdirs; zero writes to dev/e2e DBs (each read once at copyFileSync —
   the schema-less spawn creates only its own empty file).

## 5. Remediation design (gate-only round — the F-UU/F-VV/F-WW ladder)

**The TDD ladder**: write the spec → verify GREEN against the CORRECT source
→ the mutation demos drop one half → REBUILD → exactly the new case-runs RED
→ restore byte-identical → rebuild → green. The source ships NO delta.

### 5.1 The gate — cart-checkout.spec.ts (the throwaway-standalone owner)

A NEW describe **"transient-state sweeper (F-XX, session-53)"** (uniques
18 → 19), ONE case riding NO browser surface at all (pure Node — the same
case runs identically on both device projects), on a **THROWAWAY
healthy-copy standalone on :3211** (the F-QQ/F-WW crib — `copyFileSync` of
`db/e2e.db` into a tmpdir; the standalone spawned against the copy; killed +
removed in the finally; zero `db/e2e.db` writes):

- **fixtures minted on the copy BEFORE spawn** (the F-XX-specific order: the
  boot sweep must FIND them at `register()` time — the F-QQ/F-WW pattern
  mints post-boot for per-request action reads; the sweeper reads once at
  boot). SQL (the F-LL/F-WW INSERT shapes, `spawnSync` ARGV arrays — Trap
  #34):
  - the PAST-expiry session (`expiresAt` = `datetime('now','-1 day')`,
    james's userId by scalar subquery, a run-unique token) + the FUTURE-
    expiry control (`+1 day`);
  - the IDLE guest cart (`userId` NULL, `updatedAt` =
    `datetime('now','-40 days')` — strictly beyond the 30-day window) + its
    CartItem (on the canonical leather-crossbody-bag, qty 1 — the cascade
    proof);
  - the RECENT guest cart (`updatedAt` = now) + its CartItem;
  - the USER-OWNED 40-day-idle cart (james's userId, `updatedAt` -40 days)
    — the catastrophic keep-half;
  - the IDLE guest wishlist (-40 days) + its WishlistItem; the RECENT guest
    wishlist (now);
- **pre-spawn sanity**: every fixture present on the copy (the captured-
  baselines pattern);
- **spawn** (PORT=3211, NODE_ENV=production, AUTH_SECRET=E2E_AUTH_SECRET,
  DATABASE_URL=copyUrl) + the health boot probe (25s deadline);
- **the sweep poll** (the deterministic join for the unawaited boot sweep):
  poll the copy until the idle cart row is GONE, 25s deadline, 500ms
  cadence — a never-firing sweep fails HERE with the poll's message;
- **the matrix** (all fixture-scoped, token/id-keyed — the session-52
  lesson: fixture rows are scoped, never counted against absolute zeros):
  1. the idle guest cart GONE (the poll's own condition, re-asserted);
  2. the idle cart's CartItem GONE (the cascade);
  3. the PAST-expiry session GONE; the FUTURE-expiry session PRESENT;
  4. the USER-OWNED 40-day-idle cart PRESENT (the ownership discriminator
     on the wire — the unit-owned term's wire-visible survivor);
  5. the RECENT guest cart + its item PRESENT;
  6. the idle guest wishlist + its WishlistItem GONE; the RECENT wishlist
     PRESENT;
  7. the health endpoint still 200 + `db:true` (the sweep never broke the
     server);
- **the finally**: SIGTERM + SIGKILL escalation + `rmSync` (the F-WW crib).

### 5.2 Count ledger

cart-checkout uniques 18 → 19 → **150 → 151 unique cases; 298 → 300
passed** (+2 skipped unchanged — the desktop-only geometry pin; 151 unique
× 2 = 302 total case-runs).

### 5.3 Budget ledger

- **limiter consumption: ZERO anywhere** — no action crafts at all (the
  only fetch is the unrate-limited `/api/health` boot probe).
- **login/register buckets: ZERO consumption** (no auth actions touched; no
  storageState ride — the case is pure Node).
- **`db/e2e.db`: read once at `copyFileSync`, never written** (the F-WW
  zero-writes proof shape).
- The copy carries whatever in-run state exists at cart-checkout's file
  position (the serial workers:1 topology) — every such row is RECENT or
  FUTURE-dated, so the sweep touches ONLY the fixtures; all assertions are
  fixture-scoped regardless.

### 5.4 Scoping decision (the honest ledger)

The plan's three where-clause terms and the classifier are **unit-owned**
(sweeper.test.ts pins them by `toEqual` + the dedicated never-sweeps-user-
owned test) — this round does NOT re-demo them at the E2E layer. The E2E
gate owns the four WIRE-BLIND halves: the three executor deleteMany calls
and the instrumentation boot wiring. The wire-side survivor assertions (the
user-owned cart, the recent rows, the future session) still PIN the unit-
owned terms' behavior end-to-end — belt-and-braces, per the F-UU corrected-
ledger precedent (each gate owns the half its removal observably reddens).

## 6. Mutation demos (the regression shapes, proven RED)

Each demo: drop ONE runtime half, REBUILD, run the owning spec file. The
expected RED sets (both device projects = 2 runs per case):

1. **The session deleteMany drop**: sweeper.ts:53's where →
   `{ id: { in: [] } }` (the empty-in neutering — type-safe, matches
   nothing, keeps the tuple destructuring green; the TS6133 lesson from
   F-WW's clamp demo: never orphan a used binding) → REBUILD → exactly **2
   case-runs RED** at the matrix's PAST-expiry-session assertion (the row
   lingers); the poll completes (the cart half still sweeps) — the halves
   independently observable within one case.
2. **The guest-cart deleteMany drop**: sweeper.ts:54 → the same empty-in
   neutering → REBUILD → exactly **2 case-runs RED at the poll** (the idle
   cart never disappears; the deadline message names the seam).
3. **The guest-wishlist deleteMany drop**: sweeper.ts:55 → the same →
   REBUILD → exactly **2 case-runs RED** at the matrix's idle-wishlist
   assertion.
4. **The boot-wiring drop**: instrumentation.ts's `void runSweep().catch(…)`
   block removed + the `isSchemaNotReady` import narrowed (the two-line
   surgery that keeps `noUnusedLocals` green — the interval keeps
   `runSweep` used; the boot pass never fires; the 60-min interval is
   structurally outside the test window) → REBUILD → exactly **2 case-runs
   RED at the poll** (NOTHING sweeps — the whole runtime seam rests on the
   dropped call).

All restored via inverse edit (`git diff --stat src/` empty) → rebuild →
green on the owning file.

## 7. Validation of this plan against the codebase (pre-execution)

- sweeper.ts read IN FULL first-hand (the pure plan :14-31; the classifier
  :33-40; the executor :51-62 — the three deleteMany calls destructured
  `[sessions, carts, wishlists]` in one `Promise.all`, the `void`-launched
  boot call's unawaited shape);
- instrumentation.ts read IN FULL first-hand (register() :19-50; the
  production AUTH_SECRET guard; the boot call + the F-J catch; the hourly
  `setInterval` + `timer.unref()`);
- sweeper.test.ts read IN FULL first-hand (the five plan pins + the three
  classifier pins — the E2E gate's scoping against the unit-owned halves);
- auth.spec.ts:585-640 read first-hand (F-NN's own documentation of the
  runtime seam's wire-blindness — the carried finding this round closes);
- `grep -rn "sweep" tests/e2e/` → comments only (the wire-blindness
  verified);
- prisma/schema.prisma read for the fixture shapes: Session (id, token
  UNIQUE, userId, expiresAt, createdAt), Cart (token UNIQUE, userId?
  UNIQUE, createdAt, updatedAt), Wishlist (same), CartItem (cartId CASCADE,
  productId CASCADE, size, quantity), WishlistItem (wishlistId CASCADE) —
  the fixture-FK ordering (parent rows before items) and the cascade proof
  both verified;
- the F-QQ/F-WW throwaway cribs read IN FULL first-hand (copyFileSync +
  copyRead + sqlRunCopy + spawn env + the health boot probe + the
  SIGTERM/SIGKILL/rmSync finally — the exact machinery this gate reuses);
- the port census verified: **:3211 free** (F-QQ owns :3213, F-WW :3210,
  the probe :3209 — all confirmed idle in this sandbox);
- playwright.config.ts honored: workers:1, fullyParallel:false, the serial
  topology that makes the copy's in-run state predictable; the case is pure
  Node (no viewport dependence) so both device projects run it identically;
- the F-J claim cross-checked: the harness webServer boots `node
  .next/standalone/server.js` and the boot sweep's P2021 soft-skip is
  observed every run (the SKILL trap log + sweeper.test.ts's own comments)
  — which also proves `register()` runs in the standalone (the gate's
  feasibility foundation); the probe re-verifies it first-hand on demand.

## 8. Round-48 parity census (the standing ritual)

**ENVIRONMENT: the live reference (Base44) answered HTTP 503 at the round's
start** — the TENTH consecutive round. Handled per the honest-outage
precedent: the census runs **CLONE-side ×2** (48a on the final build with
`--shots`; 48b after the post-dev-rebuild), both viewports, against the
round-38..47 clone-side ledger (desktop 11085 / mainKids 11 / footerH 444,
mobile 11264 / 1189, the drawer `flex flex-col gap-5 mt-4` + gaps
[20,20,20,20] — the v4 mobile-nav pin). The reference-side fields CARRY BY
DOCUMENTATION; the WOMEN-inert posture re-check + the 2 ref screenshots stay
DEFERRED while the platform is down. The clone's mobile-menu behavior
verified end-to-end on the dev server (`rm -rf .next` first; `env -u
DATABASE_URL` boot; boot + probe + kill in ONE foreground command; the
settle probe `scripts/dev-nav-settle-session47.cjs`). The reference gets one
final re-probe before the final gates.

## 9. Final gates + docs

- typecheck ✓ lint ✓ 173/173 unit ✓ build ✓ E2E green at the §5.2 ledger —
  the 58th→59th consecutive fully-green session.
- Screenshots refreshed (the census's clone shots + the dev-server set).
- Docs aligned: SKILL (§2 row + F-XX; §11 command 151; Appendix B NEW
  session-53 row), README, CLAUDE.md, PAD, AGENTS.md, this plan's execution
  record, worklog, `docs/session_75.md`; `.env.example` verified unchanged
  and matching; stale-count sweep zero.
- One main-branch commit pushed via the SSH wrapper v3
  (`--remote git@github.com:nordeim/luxury-fashion-store.git`).

## 10. Residual risks / next steps (post-F-XX)

1. The two-sided census's reference half stays DEFERRED while Base44 is down;
   the NEXT round re-runs the full two-sided sweep FIRST THING if the
   platform recovered (carried forward, tenth round).
2. The named documentation class returns first: the PDP og:image annotation
   / og:type union / `style-src 'unsafe-inline'` exceptions — all three
   re-read this round as DOCUMENTED deliberate decisions (the remote
   dimensions / the Next union / the React inline-style reality); any
   future change there is a source round against the documented rationale.
3. Real PSP behind the checkout seam (carried).
4. Dev-toolchain npm-audit findings (all dev-only) — carried.
5. The wishlist merge's H-29 transaction-atomicity half and the cart merge's
   G-5 tx-failure half stay source-read-only (carried).
6. The hourly interval's cadence itself (60 min) is structurally outside any
   test window — the wiring is gated at the BOOT call; the interval's own
   call site shares the same `runSweep` seam (documented).
7. `getCartDto`'s no-isActive-filter read stays the documented design
   decision (the stale-bag line must stay visible so the customer can
   remove it); the TOCTOU badge note carries as a documented observation.
8. security.txt `Expires` (2027-11-01) renewal cadence (carried).
9. Harness lessons carried: the storageState ride; the Secure-cookie jar
   drop; the raw-fetch title under-read; the fixture-FK ordering; the
   register bucket at 4/10 per run; the fixture-scoping rule; the TS6133
   mutation-surgery shape; the SELF-DIFF screenshot method.
10. The checkout limiter stays 8/10 on :3100 — future checkout-driving specs
    on the shared server must count before adding (the throwaway pattern is
    the documented escape hatch).

## Execution record

| # | Task | Result |
|---|---|---|
| 1 | Plan probe | ✅ `scripts/plan-probe-session53.cjs` — **16/16 checks**: the fixtures mint + all present pre-spawn; the healthy copy boots + health 200 + db:true; **THE BOOT SWEEP FIRES AND COMPLETES** (the idle guest cart + the PAST-expiry session GONE, observed by the 25s copy-side poll — the first test-time happy-path execution of the runtime seam anywhere); the keep matrix holds (the FUTURE-expiry session, the RECENT cart, the RECENT wishlist, and the USER-OWNED 40-day-idle cart all SURVIVE); the cascades hold (the idle cart's CartItem + the idle wishlist's item gone with their parents, the recent item survives); health still 200 + db:true post-sweep; **the F-J soft-skip proven EXPLICITLY** (the schema-less spawn boots + serves health 200 with db:false + the exact `[sweeper] boot sweep skipped: database schema not ready yet` downgrade line in the boot stderr); cleanup confirmed. **THE ROUND'S HARNESS DISCOVERY (the probe's own first run caught it)**: Prisma 6's SQLite connector stores DateTime as **INTEGER EPOCH MILLISECONDS** — raw-SQL `datetime()`/`strftime()` write TEXT, and SQLite's cross-storage-class ordering puts INTEGER < TEXT ALWAYS, so `updatedAt < <integer-param>` is FALSE for every TEXT-stored row: a datetime()-written fixture is INVISIBLE to the sweeper's where-clause (the first probe run's 3a/3b FAILs were exactly this — the fixtures survived a healthy sweep; not a source bug). Every fixture datetime now writes `strftime('%s','now',±N)*1000` — integer ms, Prisma's own format. Recorded for every future raw-SQL datetime fixture in the suite |
| 2 | The F-XX gate GREEN (cart-checkout, the sweeper runtime seam) | ✅ The F-XX describe appended to `tests/e2e/cart-checkout.spec.ts` (the throwaway-standalone owner — F-QQ :3213 / F-WW :3210's file; uniques 18 → 19): the fixtures minted on the copy BEFORE spawn (the F-XX-specific order — the boot sweep reads ONCE at register(); integer-epoch-ms datetimes per the probe's discovery) → pre-spawn sanity (9/9 fixture rows, incl. the fixture member user) → spawn on :3211 + the health boot probe → THE SWEEP POLL (the deterministic join for the unawaited boot call — 25s deadline on the idle guest cart's disappearance) → the matrix: the PAST-expiry session swept + the FUTURE control survives; the idle cart's CartItem cascaded away + the recent item survives; the recent guest cart survives; the MEMBER-OWNED 40-day-idle cart SURVIVES (the userId:null discriminator on the wire); the idle wishlist + its item swept + the recent survives; health still 200 + db:true post-sweep. **THE SPEC'S OWN FULL-RUN LESSON**: the first full-file run caught a fixture landmine the isolated -g run could never see — `Cart.userId` is @unique and james ALREADY owns a cart by this describe's file position (the earlier cart cases mint it), so a james-owned member-cart fixture P2002s on the copy (`UNIQUE constraint failed: Cart.userId`); the member-cart fixture now hangs off a run-unique FIXTURE USER (the F-VV offline-scrypt shape — never logged in, hash inert), robust to both the isolated and the full-file DB states. **Isolated -g run: 4 passed; full owning file: 40 passed** (19 uniques × 2 + 2 setup — the F-XX case × both projects identical, pure Node) |
| 3 | Mutation demo 1 (the session deleteMany drop) | ✅ sweeper.ts:53's where → `{ id: { in: [] } }` (the empty-in neutering — type-safe, matches nothing) → REBUILD → **exactly 2 case-runs RED** at the matrix's `the PAST-expiry session is swept (the ADR-006 bulk half)` assertion (the row lingers) while the POLL completed (the cart half still swept — the halves independently observable within one case); the 2 setups green. Restored byte-identical. Re-run against the FINAL spec shape after the fixture-user fix — identical result |
| 4 | Mutation demo 2 (the guest-cart deleteMany drop) | ✅ the REAL cart line (:54) → the empty-in neutering → REBUILD → **exactly 2 case-runs RED at the POLL** (the idle cart never disappears; the 27.5s runtime = boot + the full 25s deadline — the failure message names the seam: `the boot sweep deleted the 40-day-idle GUEST cart (the runtime seam fired)`). The round's own surgery lesson re-learned mid-ladder: the first attempt neutered the session LINE instead of the cart CALL (the file still held the real cart deleteMany, so it looked like demo 1 again) — the mutation must target the CONTRACT HALF, verified by reading the mutated lines before building. Restored byte-identical. Re-run against the FINAL spec shape — identical result |
| 5 | Mutation demo 3 (the guest-wishlist deleteMany drop) | ✅ the wishlist line → the empty-in neutering → REBUILD → **exactly 2 case-runs RED** at `the idle guest wishlist is swept` (fast fail — the poll passes, the cart half still sweeps; the wishlist row lingers). Restored byte-identical. Re-run against the FINAL spec shape — identical result |
| 6 | Mutation demo 4 (the boot-wiring drop) | ✅ instrumentation.ts's `void runSweep().catch(…)` block removed + the `isSchemaNotReady` import narrowed (the two-line surgery that keeps `noUnusedLocals` green — the interval keeps `runSweep` used; the 60-min interval is structurally outside the test window) → REBUILD → **exactly 2 case-runs RED at the POLL** (NOTHING sweeps — the whole runtime seam rests on the dropped boot call; 27.3s runtime). Restored byte-identical → `git diff --stat src/` EMPTY → rebuild → **the full owning file 40/40 green** |
| 7 | Round-48 census ×2 + mobile-menu ritual + screenshots | ✅ Reference (Base44) 503 across every probe — the TENTH consecutive round (the honest-outage precedent: clone-side only; re-probed at the final gates: still down). **Census 48a (final build): ZERO DRIFT** — desktop 11085/11/444, mobile 11264/1189, drawer `flex flex-col gap-5 mt-4` + gaps [20,20,20,20] (the v4 mobile-nav pin holds), console clean; dev ritual (rm -rf .next → env -u DATABASE_URL boot → settle probe → dev shots → hygiene → kill, ONE foreground command): **mobile menu verified end-to-end** — burger → drawer → Women → /shop?category=women LANDS (8 cards) → drawer closed → overflow restored → zero errors; dev shots captured (login/account/cart/admin-dashboard); dev-hygiene cleaned 1 cart row + canonical 4/12/2/4 re-verified; **Census 48b (post-dev-rebuild): ZERO DRIFT** — identical to 48a and the standing ledger; a **48c self-diff run** (the session-52 method) proved the screenshot timing classes: clone-mobile-home's mid-round diff (3281px, bbox 0,143→389,746 — the carousel's full-bleed hero slide phase, LARGER than the standing strip class) was matched EXACTLY by the consecutive same-build diff (3281px, identical bbox) and the 48c capture then landed **byte-identical to HEAD**; final ledger: **9 byte-identical + 2 timing-class** (clone-mobile-menu-open 852px entirely within the behind-drawer x[320..389] column — the drawer crop x<320 byte-identical 0/270080; clone-exclusive-deals 155px confined to the 16×17 countdown-digit strip at the deals header's right stack), pixel-diff-verified via PIL (`scripts/diff-shots-session53.py`) |
| 8 | Final gates + docs alignment + push | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build ✓ **E2E 300 passed + 2 skipped** (151 unique × 2 = 302 total runs, 7.6m) — the 59th consecutive fully-green session, exactly the plan's §5.2 ledger (150→151 unique, 298→300 passed); final reference re-probe: still 503 (tenth round); budget honored: zero logins, zero registers, zero limiter consumption anywhere; docs aligned: **SKILL v1.46.0** (frontmatter 300/151 + the F-XX segment; §2 row 151; §11 command 151; §9 **NEW Trap #42** — the Prisma-SQLite integer-epoch-ms fixture lesson; Appendix B NEW session-53 row), **README** (badge 173+300 + the Testing row 151 + command 151 + the Project Status row 151 + the F-XX gate), **CLAUDE.md** (gate line 151 + the F-WW→F-XX chain segment + command 151), **PAD** (test table 25\|150\|298 → 26\|151\|300 + §7.3 command 151 + the coverage-map session-53 extension), **AGENTS.md** (E2E row 151 + the security line's F-XX segment), this plan + execution record, worklog, `docs/session_75.md`; `.env.example` verified unchanged and matching; stale-count sweep zero; lint re-run as the last pre-commit step (Trap #28); one main-branch commit pushed via the SSH wrapper v3 |
