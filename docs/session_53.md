# Session 53 — the session-42 round (F-MM: the checkout transaction's server-truth write set)

Resuming with the **Session 42 task book** (the user's latest directive). Per the
standing precedent, my round = the session-41 continuation auditing `0d1d50f`
(the parallel thread's session-log commit — docs-only) plus a full re-verification
of the committed tree. The workspace had been RESET this time — **fresh clone**
per the task brief, with the known recovery set closed before any gate:
`npm install`; the canonical 3-line `.env` with
`DATABASE_URL="file:../db/custom.db"`; `db:setup` materializing `db/custom.db`
at the canonical 4/12/2/4 by direct Prisma count (`env -u DATABASE_URL` — the
documented sandbox quirk: the parent-workspace `DATABASE_URL` override starves
the boot sweeper); Playwright **chromium-1248 reinstalled** (the cache shipped
only 1200).

**Step 1: Workspace refresh + audit of the pulled HEAD**

`git show --stat 0d1d50f` → 1 file, +81: `docs/session_52.md` only — the
parallel thread's raw narration transcript of the SAME session-41 round; its
ledger matches `5873db3`'s actual work (test-only, zero `src/`, the F-LL
describe + 13 screenshots + five-docs alignment + SKILL v1.34.0). Docs-only,
RETAINED. This round's narration ships as `docs/session_53.md`.

**Step 2: Baseline gates — re-proven from scratch on the fresh clone**

typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build + assemble ✓ E2E
**270 passed + 2 skipped** (136 unique × 2; 6.1m) — the 38th consecutive
session fully green at baseline, exactly matching session-41's final gates.

**Step 3: Fresh audit pass — the round's finding**

The session-41 plan §11 directive: the read-side hunt is nearly exhausted;
the remaining named candidates were the tooling-harness class
(the search-429 limiter — carried-by-design for its pollution cost). This
round's survey pivoted to the WRITE-side transaction siblings of gated reads:
every `db.*` write inside a transaction, checked against its gate.

**F-MM — the money path's own transaction.** `placeOnce`
(`src/lib/actions/checkout.ts:125-204`) writes FIVE things in ONE tx; the
existing gates pinned only ONE of them (the Order + OrderItem rows, via the
COD/card confirmations + F-CC's capability matrix). The other three halves
were wire-blind on every existing assertion:

1. **the per-item stock decrement (:142-154)** — no spec ever read a product's
   stock after a checkout (H-7/H-15 pin the ADMIN edit seam; H-39 the ADJUST
   seam); a dropped decrement keeps selling stock that is already sold — the
   README's own "stock decrement + oversell guard in one transaction"
   contract, half-pinned;
2. **the initial 'placed' OrderEvent mint (:198)** — F-DD pins the SEED's
   events on the account timeline; F-HH pins the ADMIN mutation's mints;
   neither reads a NEWLY placed order's timeline — a dropped mint leaves both
   the customer's and the admin's timelines for every new order empty;
3. **the post-placement cart purge (:202)** — every "Your bag is empty"
   assertion flows through `removeCartItemAction` or the client-side
   `EMPTY_CART` store; the COD/card cases never re-render the cart after
   placement; the mid-file guest-merge's `emptyTheBag` absorbs exactly the
   lingering rows a dropped purge would leave — the bag re-fills on the next
   server render (the StoreProvider re-syncs from server props), the
   double-purchase exposure.

Wire-blindness traced case-by-case first-hand: the H-23 double-remove tests
run BEFORE the checkout tests in file order; the steppers/H-39 assertions are
RELATIVE; F-CC rides a logged-out context (a different cart); F-FF reads
canonical seed orders only. LOW gate-coverage, zero product defect,
money-path-bearing.

**Step 4: Plan-probe discipline (BEFORE the spec)**

`scripts/plan-probe-session42.cjs` — a throwaway copy of `db/custom.db` + the
standalone on :3209: **11/11 checks passed**, wire-verifying: the
offline-minted JAMES row (INSERT…SELECT, james resolved by the DB), the mint's
WIRE VALIDITY (/account signed-in), the capture-before stock read, the REAL
COD wizard flow placing an order end-to-end, the order number parsing from
the success URL, **the three LOAD-BEARING server-truth halves (stock 12→11,
EXACTLY 1 `placed` event, james's cart lines 0)**, the purge's wire-real half
(a fresh /cart render), the confirmation render, zero console errors. ONE
probe-harness correction first-hand: the first run expected `actor: null` and
failed at `actor: "system"` — the schema's `@default("system")` (F-16's
customer-visible class); the probe and the spec's assertion corrected BEFORE
the spec was written. Zero dev-DB writes, zero e2e.db writes.

**Step 5: The TDD spec**

NEW describe **"checkout transaction write set (F-MM, session-42)"** at the END
of `tests/e2e/cart-checkout.spec.ts` (the OWNING spec — the money path's own;
the file's uniques 13 → 14). **ZERO logins, ZERO registers** (the F-FF
pattern — the default james storageState); the checkout limiter budget
documented in the describe header (6 → 8 < 10 per run on the shared
`checkout:local` bucket). The case: the deterministic start (`emptyTheBag` +
a server-side sanity dbRead), the capture-before stock (never hardcoded —
COD/card/F-CC each decrement before this case runs), the REAL COD wizard
flow, the order number parsed from the success URL, then the three
LOAD-BEARING dbRead halves (stock = S−1; EXACTLY 1 event, type 'placed',
actor 'system'; james's CartItem count 0) + SUPPORTING: a FRESH /cart render
showing "Your bag is empty" — the RSC re-read, NOT the client store's
`EMPTY_CART`. **Cleanup — the cleanest fixture in the suite**: the placed
order dies in global-setup's wholesale wipe; the stock resets via the seed's
`product.upsert`; the cart ends empty (the purge under test IS the cleanup) —
no afterAll, no SQL fixture, no minted rows. GREEN **30 passed** (14 uniques
× 2 + 2 setups; F-MM green on BOTH projects, 2.0s).

**Step 6: The mutation demo**

The purge dropped (the `tx.cartItem.deleteMany` line deleted — the
"bag re-fills after checkout" shape; the full dropped-write shape compiles
clean, the TS6133 lesson honored) → REBUILD → **the existing COD/card/F-CC
cases STAYED GREEN** (the toast-blind gap's proof: 28 passed) while exactly
the 2 F-MM case-runs failed at the LOAD-BEARING purge assertion — Expected 0 /
Received 1, the dbRead server-truth witness → restored via inverse edit
(`git diff --stat src/` empty; the deleteMany rg-verified at :202) → rebuild →
30/30 green.

**Step 7: Round-37 census + the reference posture**

Round-37a (`--shots`) + 37b (post-dev rebuild re-run): **ZERO DRIFT —
byte-identical to the round-34/35/36 ledger in ALL census fields (49th/50th
consecutive sweep)**: desktop pageH 11079/11085, mobile 11257/11264, mainKids
11 both sides both viewports, footers 444/444 + 1189/1189, the drawer
char-identical `w-80` + `flex flex-col gap-5 mt-4` + gaps [20,20,20,20] —
**the v4 mobile-nav pin holds** (the standing task re-check); ref console =
the documented 2× 401 residue; clone console clean. The reference's WOMEN
nav button confirmed INERT through agent-browser after a real login with the
task credentials — the clone stays the functional superset. The clone's
mobile-menu behavior verified end-to-end on the dev server (`rm -rf .next`
first, the session-39 lesson; `env -u DATABASE_URL` boot): burger → drawer →
scroll lock → Women → `/shop?category=women` → menu closed → overflow
restored → zero console errors (the first run raced Turbopack's cold compile
of `/shop`; the warm re-run measured the navigation exactly — the documented
session-40/41 measurement note reproduced). 13 screenshots refreshed (the
sweep's 9 + the dev-server login set; the dev cart's rows cleaned after the
shot, canonical 4/12/2/4 re-verified).

**Step 8: Final gates + docs**

typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **272
passed + 2 skipped** (137 unique × 2; 6.3m) — the 39th consecutive
fully-green session, exactly the plan's count ledger (136→137 unique,
270→272 passed); the F-MM case-runs green on BOTH device projects. Docs
aligned: SKILL v1.35.0 (§2 E2E row + F-MM; §11 137; Appendix B NEW session-42
row with the checkout-limiter budget note), README (badge 173+272 + the
Checkout row's write-set pin + testing/architecture/status rows 137),
CLAUDE.md (gate line 137 + the F-LL→F-MM chain + the NEW F-MM testing
bullet), PAD (test table 18|137|272 + §7.3 command 137 + the coverage-map
session-42 extension), AGENTS.md (the security line + the E2E command row),
`docs/remediation-plan-session42.md` (the plan + this execution record),
worklog, this log; `.env.example` unchanged and matching the codebase;
stale-count sweep zero.

**Step 9: Commit + push (main only)**

One main-branch commit (test-only round — zero `src/` changes; the artifacts:
the F-MM describe + the plan + the probe script + the refreshed screenshots +
the five-docs alignment + the worklog + this log) pushed via the SSH wrapper
v3 with `--remote git@github.com:nordeim/luxury-fashion-store.git`, verified
on the remote, key shredded.
