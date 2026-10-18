# Remediation Plan — Session 42 (F-MM: the checkout transaction's server-truth write set)

The session-41 continuation round. Per the standing precedent: audit the pulled
HEAD (`0d1d50f` — the parallel thread's session-log commit), re-verify the
baseline, run the fresh audit pass over the session-41 plan §11 directive
("the remaining READ-side surfaces with no first-party owner spec, or the
tooling-harness candidates"), then close the strongest finding with a TDD gate.

## 1. Starting state

- FRESH CLONE this round (the sandbox workspace had been reset — `git clone`
  per the task brief). The known recovery set, all closed BEFORE any gate:
  `npm install` ✓; the canonical 3-line `.env` with
  `DATABASE_URL="file:../db/custom.db"` ✓; `db:setup` materializing
  `db/custom.db` at the canonical 4/12/2/4 by direct Prisma count
  (`env -u DATABASE_URL` — the documented sandbox quirk: the parent-workspace
  `DATABASE_URL` override starves the boot sweeper) ✓; Playwright
  chromium-1248 reinstalled ✓ (the cache shipped only 1200).
- HEAD `0d1d50f` = remote `main` (the parallel thread's session_52.md — the
  raw transcript of the SAME session-41 round, +81 docs-only).
- The committed tree's contract: 173 unit (19 files) · 136 unique E2E × 2
  device projects − 2 desktop-only skips = **270 passed + 2 skipped** ·
  typecheck ✓ lint ✓ build ✓.

## 2. Audit of `0d1d50f` (the pulled HEAD) — first-hand

`git show --stat 0d1d50f` → 1 file, +81: `docs/session_52.md` only — the
parallel thread's raw narration transcript of the same session-41 round; its
ledger matches `5873db3`'s actual work (test-only, zero `src/`, the F-LL
describe + 13 screenshots + five-docs alignment + SKILL v1.34.0). Docs-only,
RETAINED (never overwrite another thread's log). This round's narration ships
as `docs/session_53.md`.

## 3. Baseline re-verification (fresh clone, recovery closed)

- typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build + assemble ✓
- E2E **270 passed + 2 skipped** (136 unique × 2; 6.1m) — the 38th
  consecutive session fully green at baseline, exactly matching session-41's
  final gates.

## 4. Fresh audit pass — the round's finding

The session-41 plan §11 directive: the read-side hunt is nearly exhausted
(home/shop/PDP/cart/account/admin/wishlist reads + every dashboard KPI now
gated); the remaining candidates were the tooling-harness class
(the search-429 limiter) — carried-by-design for its pollution cost. This
round's survey pivoted to the WRITE-side transaction siblings of gated reads:
every `db.*` write inside a transaction, checked against its gate.

**The money path's own transaction — `placeOnce`
(`src/lib/actions/checkout.ts:125-204`) — writes FIVE things in ONE tx; the
existing gates pin only ONE of them:**

| Write (line) | Gate | Verdict |
|---|---|---|
| Order + OrderItem create (:165-199) | COD/card e2e confirmations + F-CC's capability matrix (order number, PII, card last-4) | gated |
| **Per-item stock decrement (:142-154)** | NOTHING — no spec ever reads a product's stock after a checkout; H-7/H-15 pin the ADMIN edit seam; H-39 pins the ADJUST seam; the seed's own `stock: 12` renders on no assertion | **UNGATED — the oversell guard's own decrement half** |
| **Initial `placed` OrderEvent mint (:198)** | NOTHING — F-DD pins the SEED's events on the account timeline; F-HH pins the ADMIN mutation's mints; neither reads a NEWLY placed order's timeline | **UNGATED — both timelines' seed row** |
| **Post-placement cart purge (:202)** | NOTHING — every "Your bag is empty" assertion flows through `removeCartItemAction` or the client-side `EMPTY_CART` store; the COD/card tests never re-render the cart after placement; the mid-file guest-merge's `emptyTheBag` absorbs the residue | **UNGATED — the double-purchase exposure** |
| Money re-derivation (:132-135) | confirmation rendering (read-through) | gated |

**F-MM — the checkout transaction's server-truth write set.** The confirmation
page is the "toast": a dropped decrement, a dropped `events` mint, or a
dropped `deleteMany` each leave every existing gate green while

- the storefront keeps selling stock that is already sold (the oversell
  guard's decrement half — the README's own "stock decrement + oversell guard
  in one transaction" contract, half-pinned),
- the customer's and the admin's timelines for every NEW order start empty
  (the F-HH gate pins the admin's LATER events on seed orders — never the
  checkout's initial row on a fresh one), and
- the bag re-fills after checkout on the next server render (the
  client store says `EMPTY_CART`, the confirmation is green, but the
  StoreProvider re-syncs from server props on the next navigation — the
  already-purchased rows come back, and nothing stops a second order).

Wire-blindness traced case-by-case (this session, first-hand): the H-23
double-remove tests run BEFORE the checkout tests in file order (never see
post-placement residue); the steppers/H-39 assertions are RELATIVE
(`before + 1`, `toHaveText("1")` on a freshly-cleaned bag — the H-39
describe's `emptyTheBag` in the guest-merge describe runs between the
checkout cases and H-39, absorbing exactly the lingering rows a dropped purge
would leave); F-CC rides a logged-out context (a different cart); F-FF reads
canonical seed orders only. LOW gate-coverage, zero product defect (the
source is correct today; nothing asserts it). Money-path-bearing — the
strongest remaining ungated seam in the codebase.

## 5. Plan-probe discipline (run BEFORE the spec)

`scripts/plan-probe-session42.cjs` — a throwaway copy of `db/custom.db` + the
standalone on :3209 (the session-38/39/40/41 harness shape), wire-verifying
every F-MM assumption:

1. the offline-minted james Session row exists (INSERT…SELECT, james's id
   resolved by the DB itself; the probe server's AUTH_SECRET set to the
   probe's own secret so the minted cookie HMAC-verifies);
2. the mint's WIRE VALIDITY: the cookie + row render `/account` signed-in;
3. the capture-before read: the victim product's stock S (never hardcoded —
   the probe DB copy carries whatever the canonical seed pinned);
4. the REAL COD wizard flow places an order end-to-end (PDP add → /checkout
   → Shipping → Payment(COD) → Review → Place) and lands the success URL;
5. the order number parses from the success URL (the F-CC shape);
6. **the three server-truth halves (the exact dbRead expressions the spec
   will use): stock === S − 1 (the decrement), EXACTLY 1 `placed` OrderEvent
   row on the new order with `actor === "system"` (the timeline seed — the
   schema's F-16 default, corrected by the probe's first run), james's
   CartItem count === 0 (the purge)**;
7. the purge's wire-real half: a FRESH `/cart` render shows "Your bag is
   empty" (server-rendered — not the client store's `EMPTY_CART`);
8. the confirmation renders the parsed order number;
9. zero unexpected console errors.

Zero dev-DB writes, zero e2e.db writes (the throwaway copy dies with the
probe).

## 6. Remediation design (TDD)

NEW describe **"checkout transaction write set (F-MM, session-42)"** at the
END of `tests/e2e/cart-checkout.spec.ts` (the OWNING spec — the money path's
own; the file's uniques 18 → 19).

- **ZERO logins, ZERO registers** (the F-FF pattern): the describe rides the
  per-project storageState (james's setup session — the default, no
  `test.use`). The checkout limiter budget: the suite spends 2/project
  (COD + card) + 1/project (F-CC) = 6 < 10 per run on the shared
  `checkout:local` bucket; this case adds 1/project → **8 < 10** — the
  budget documented in the spec header (the F-CC convention).
- **Deterministic start**: `emptyTheBag(page)` (the helper — the H-27
  detach-wait shape) + a SUPPORTING dbRead sanity (james's cart lines === 0),
  then ONE victim product added via the PDP (`silk-draped-evening-gown` —
  the `openDrawerWithItem` shape; H-39 manipulates only
  `wide-brim-felt-hat`).
- **Capture-before** (dbRead, never hardcode): the victim's stock S.
- **The real flow**: the proven COD wizard (Shipping → Payment(COD) → Review
  → Place) → the success URL → the order number parsed (the F-CC shape).
- **The three LOAD-BEARING dbRead halves (server truth — the toast cannot
  see them)**:
  1. the victim's stock === S − 1 (the decrement — the oversell guard's
     own write);
  2. the new order's events: EXACTLY 1 row, `type === "placed"`, `actor`
     null (the timeline seed both sides render);
  3. james's CartItem count === 0 (the purge).
- **SUPPORTING (wire-real)**: the confirmation renders the parsed order
  number; a FRESH `/cart` render shows "Your bag is empty" — the purge's
  server-rendered half (the RSC read, not the client store's `EMPTY_CART`).
- **Cleanup discipline (H-24) — the cleanest fixture yet**: the placed order
  + items + events die in global-setup's wholesale Order/OrderItem/OrderEvent
  wipe at every run start (H-22/H-25); the stock decrement resets via the
  seed's `product.upsert` (`stock: 12`) re-pinned at every global-setup;
  james's cart ends empty (the purge under test IS the cleanup). NOTHING to
  clean — no afterAll, no SQL fixture, no minted rows.
- **Within-run isolation**: the describe sorts LAST in the file (after
  F-FF); the only order-count specs (admin.spec's H-2 total + dashboard KPIs
  + F-LL) run BEFORE `cart-checkout.spec.ts` alphabetically (workers:1,
  fullyParallel:false — the serial topology); later files
  (error-surfaces/home/mobile-navigation/product/security-csp/seo/shop/
  wishlist) assert no order or stock counts.
- **Count ledger**: 136 → 137 unique cases; 270 → 272 passed + 2 skipped.
  The F-MM case-runs green on BOTH device projects.

## 7. Mutation demo (the regression shape, proven RED)

Surgical mutation: drop the purge — delete the
`await tx.cartItem.deleteMany({ where: { cartId } });` line
(`src/lib/actions/checkout.ts:202`, the "bag re-fills after checkout" shape:
the confirmation still renders, the client store still says `EMPTY_CART`)
→ `npm run build` (the TS6133 lesson honored: the dropped line strands NO
variable — the full dropped-write shape compiles) → **the existing
COD/card/F-CC cases STAY GREEN** (the toast-blind gap's proof: their
assertions read only the confirmation surface) while **exactly the 2 F-MM
case-runs fail** — first at the wire-real SUPPORTING half (the fresh
`/cart` render shows the ghost line, not "Your bag is empty") or the
LOAD-BEARING dbRead (james's CartItem count: Expected 0 / Received 1)
→ restored via inverse edit (`git diff --stat src/` empty; the deleteMany
rg-verified at :202) → rebuild → 19/19 file uniques green.

## 8. Validation of this plan against the codebase (pre-execution)

- The five writes of `placeOnce` read first-hand this session
  (checkout.ts:125-204): the items read (:126), the totals re-derivation
  (:132-135), the stock re-read + decrement (:142-154), the order +
  items + events create (:165-199), the purge (:202).
- The checkout limiter: `rateLimit("checkout:" + ip, 10, 10 * 60 * 1000)`
  (checkout.ts:67) — per-IP only (the shared "local" bucket; login is the
  per-IP+email one); the existing consumers counted first-hand (COD's valid
  submit, card's final valid submit — the invalid submit fails BEFORE the
  limiter at the Luhn gate, F-CC's placement): 3/project, 6/run.
- global-setup's wipe list (read first-hand, this session): OrderItem/
  OrderEvent/Order/Cart/CartItem/Wishlist/WishlistItem/Session + scoped
  Address/User — the placed order self-cleans; the seed re-runs AFTER the
  wipe (H-45) — the `product.upsert` re-pins `stock: 12` every run, so the
  decrement never drifts across runs.
- The seed's `placed` events (read first-hand): `{ type: "placed", note: null }`
  with no actor — the checkout mint's exact shape (`events: { create:
  [{ type: "placed" }] }`).
- `playwright.config.ts`: `fullyParallel: false, workers: 1` — the serial
  topology; file order = declaration order; alphabetical file order puts
  admin.spec BEFORE cart-checkout.spec.
- The F-HH describe (admin.spec.ts:275-354) establishes the dbRead helper
  shape the new describe reuses (spawnSync + node -e + the <<JSON>> marker);
  the F-CC describe establishes the success-URL order-number parse; the
  F-FF describe establishes the storageState-riding, canonical-row-reading
  no-cleanup shape.
- The H-39 restore discipline (setStock(12) in finally) covers
  `wide-brim-felt-hat` only; the F-MM victim is `silk-draped-evening-gown`
  (the `openDrawerWithItem` product) — no fixture collision.
- rg over `tests/` for the three halves (this session): "placed" never
  asserted on a NEW order's timeline; no spec reads a product's stock after
  a checkout; no spec re-renders the cart after a placement.

## 9. Round-37 parity census (the standing ritual)

Two censuses on the final tree (37a with `--shots`, 37b re-run after a
rebuild), both viewports, against the LIVE reference (logged in with the
task credentials via agent-browser) — the 49th/50th consecutive sweep.
Fields: desktop/mobile pageH, mainKids, footers, the mobile drawer's
panel/nav class strings + gap array (the v4 `flex gap-5` pin), console
residue. Plus the reference's functional posture (nav buttons inert — the
clone stays the functional superset) and the clone's mobile-menu behavior
verified end-to-end on the dev server (burger → drawer → Women →
`/shop?category=women` → menu closed → overflow restored → zero console
errors). `rm -rf .next` before `npm run dev` (the session-39 Fast-Refresh
lesson) — and **rebuild before re-running the sweep** (the session-40
lesson: `rm -rf .next` deletes the standalone too); the dev server needs
the documented `env -u DATABASE_URL` restart (the parent-workspace
override starves the boot sweeper).

## 10. Final gates + docs

- typecheck ✓ lint ✓ 173/173 unit ✓ build ✓ E2E **272 passed + 2 skipped**
  (137 unique × 2) — the 39th consecutive fully-green session.
- Screenshots refreshed (the sweep's 9 + the dev-server login set).
- Docs aligned: SKILL (§2 E2E row + F-MM; §11 137; Appendix B NEW
  session-42 row), README, CLAUDE.md, PAD, AGENTS.md, this plan's
  execution record, worklog, `docs/session_53.md`; `.env.example`
  unchanged and matching the codebase; stale-count sweep zero.
- One main-branch commit pushed via the SSH wrapper v3
  (`--remote git@github.com:nordeim/luxury-fashion-store.git`).

## Execution record

| # | Task | Result |
|---|---|---|
| 1 | Plan probe | ✅ `scripts/plan-probe-session42.cjs` — **11/11 checks passed** on the throwaway DB copy + the standalone on :3209: the offline-minted JAMES row (INSERT…SELECT, james resolved by the DB), the mint's WIRE VALIDITY (the cookie + row render /account signed-in), the capture-before read (the victim's stock S=12 on the copy), the REAL COD wizard flow placing an order end-to-end (ORD-2026-005), the order number parsing from the success URL, **the three LOAD-BEARING server-truth halves (stock 12→11, EXACTLY 1 `placed` event with actor 'system', james's cart lines 0)**, the purge's wire-real half (a fresh /cart render showing "Your bag is empty"), the confirmation rendering the parsed order number, zero console errors. ONE probe-harness correction first-hand: the first run's check 7 expected actor null and FAILED at `actor: "system"` — the schema's `@default("system")` (F-16's customer-visible class); the probe and the spec's assertion corrected to `actor === "system"` before the spec was written. Zero dev-DB writes, zero e2e.db writes |
| 2 | cart-checkout.spec.ts describe | ✅ NEW describe "checkout transaction write set (F-MM, session-42)" at the END of `tests/e2e/cart-checkout.spec.ts` (after the F-FF describe; the file's uniques 13 → 14), ONE case riding the default james storageState (ZERO logins, ZERO registers; the checkout limiter budget 6 → 8 < 10 documented in the describe header): the deterministic start (emptyTheBag + the server-side sanity dbRead — james's lines 0), the capture-before stock (never hardcoded), the REAL COD wizard flow, the order number parsed from the success URL, the three LOAD-BEARING dbRead halves (stock = S−1; EXACTLY 1 event, type 'placed', actor 'system', note null; james's CartItem count 0), the SUPPORTING wire-real half (a FRESH /cart render showing "Your bag is empty" — the RSC re-read), the confirmation's order-number render; typecheck ✓ eslint ✓; GREEN **30 passed** (14 uniques × 2 + 2 setups; 58.3s; F-MM green on BOTH projects, 2.0s) |
| 3 | Mutation demo | ✅ the purge dropped (the `tx.cartItem.deleteMany` line deleted from checkout.ts:202 — the "bag re-fills after checkout" shape: the confirmation still renders, the client store still says EMPTY_CART; the full dropped-write shape compiles clean — no stranded variables, the TS6133 lesson honored) → REBUILD → **the existing COD/card/F-CC cases STAYED GREEN** (the toast-blind gap's proof: 28 passed) while **exactly the 2 F-MM case-runs failed** at the LOAD-BEARING purge assertion — `the cart rows are purged after placement (server truth)` Expected: 0 / Received: 1, the dbRead server-truth witness (cart-checkout.spec.ts:556) → restored via inverse edit (`git diff --stat src/` empty; the deleteMany rg-verified at :202) → rebuild → **30/30 green** |
| 4 | Round-37 census + screenshots | ✅ **ZERO DRIFT — byte-identical to the round-34/35/36 ledger in ALL census fields (49th/50th consecutive sweep)**: 37a (with `--shots` on the post-restore build) + 37b (re-run after the post-dev rebuild — the session-40 lesson honored): desktop pageH 11079 (ref) / 11085 (clone), mobile 11257 / 11264, mainKids 11 BOTH sides both viewports, footers 444/444 (desktop) / 1189/1189 (mobile), the drawer char-identical (panelCls `fixed left-0 top-0 h-full w-80 bg-background z-50 p-8 flex flex-col gap-6` + navCls `flex flex-col gap-5 mt-4`, 5 items, gaps [20,20,20,20]) — **the v4 mobile-nav pin holds** (the standing task re-check); ref console = the documented 2× 401 residue; clone console clean. The reference's functional posture re-confirmed first-hand through agent-browser (logged in with the task credentials): the WOMEN nav button INERT (click → URL unchanged at `/`) — the clone stays the functional superset. The clone's mobile-menu behavior verified end-to-end on the dev server through real Playwright (`scripts/dev-hydration-probe-session38.cjs`, `rm -rf .next` first per the session-39 lesson; the dev server needed the documented `env -u DATABASE_URL` boot): burger visible → drawer opens (dialog:1) → body overflow hidden → Women → `/shop?category=women` → menu closed → overflow restored → zero console errors (the first run raced Turbopack's cold compile of `/shop` — the warm re-run measured the navigation exactly, the session-40/41 measurement note reproduced). Screenshots: 13 refreshed (the sweep's 9 via `--shots` + the dev-server login set via `scripts/dev-shots-session39.cjs`: clone-login, clone-cart, clone-account, clone-admin-dashboard — zero console errors; the dev cart's item rows cleaned after the shot — canonical 4/12/2/4 re-verified by direct Prisma count) |
| 5 | Final gates on the final tree | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **272 passed + 2 skipped** (137 unique × 2 − 2 desktop-only skips; the +2 setup projects pass outside the case-run summary; 6.3m) — the THIRTY-NINTH consecutive fully-green session, exactly the §6 count ledger (136→137 unique, 270→272 passed); the F-MM case-runs green on BOTH device projects (2.6s/2.0s) |
| 6 | Docs alignment + stale-count sweep | ✅ SKILL v1.35.0 (frontmatter 137+272+2 + the F-MM gate; §2 E2E row + F-MM; §11 137; Appendix B NEW session-42 row with the checkout-limiter budget note); README (badge 173+272, the Checkout row's F-MM pin + the testing row's write-set gate + status rows 137); CLAUDE.md (gate line 137 + the F-MM gate in the chain, NEW F-MM testing bullet, commands 137); PAD (test table 18\|137\|272, §7.3 command 137, the coverage-map session-42 extension); AGENTS.md (the security line gains the F-MM gate; the E2E command row 137); docs/remediation-plan-session42.md (this record); worklog; docs/session_53.md (the round's narration log — session_52.md taken by the pulled commit); scripts/plan-probe-session42.cjs (the probe artifact). `.env.example` unchanged and matching the codebase. Stale-count sweep over the five living docs: zero stale counts |

## 11. Residual risks / next steps (post-F-MM)

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
9. The checkout limiter budget rises to 8 < 10 with F-MM — ONE more
   per-project checkout-placement case fits; document before adding.
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
