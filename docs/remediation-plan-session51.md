# Remediation Plan — Session 51 (F-VV: the guest-cart merge's dedupe/union/clamp contract + the register door — the F-GG sibling seam, wire-blind)

The session-50 continuation round. Per the standing precedent: audit the pulled
HEAD (`50b27be`), re-verify the baseline, re-probe the reference platform FIRST
THING (the session-50 plan §12 item 14), run the fresh audit pass, then close
the strongest finding with a TDD ladder. Like F-UU this is a **gate-only
round**: the source contract is CORRECT today (verified first-hand below); what
is missing is the GATE — every merge half can drop with every existing case
green (the silent-class definition).

## 1. Starting state

- **NO workspace reset this round** (git pull only — node_modules, `.env`, both
  DB files, the built standalone all present and verified first-hand).
- `git pull` fast-forwarded `ea78524..50b27be`: ONE change,
  `docs/session_70.md` (+87) — the parallel thread's raw narration of the SAME
  session-50 round; its ledger matches `ea78524`'s actual work (the F-UU
  describe, the storageState-ride discovery, the census, the docs alignment).
  Docs-only, RETAINED (never overwrite another thread's log). This round's
  narration ships as `docs/session_71.md`.
- The committed tree's contract (re-proven this round): typecheck ✓ lint ✓
  173/173 unit (19 files) ✓ build ✓ E2E **290 passed + 2 skipped**
  (146 unique × 2, 7.0m) — the 54th consecutive fully-green baseline.

## 2. Reference platform re-probe (the FIRST-THING directive)

The live reference (Base44) answered **HTTP 503 on both `/` and `/login`** at
the round's start — the sessions-44..50 outage, now the EIGHTH consecutive
round. Handled per the honest-outage precedent: the census runs CLONE-side ×2;
the reference-side fields carry by documentation from the round-38 live
measurement; the WOMEN-inert posture re-check + the 2 ref screenshots stay
DEFERRED; one final re-probe before the final gates. If the platform recovers
mid-round, the full two-sided sweep runs then.

## 3. Fresh audit pass — the round's finding (F-VV)

With the mutation seams' authz walls gated (F-SS admin role walls, F-TT the
isActive contract, F-UU the cart-line ownership walls), the fresh audit swept
the **guest→user merge seams** — the F-EE/F-GG lineage's remaining sibling:
the wishlist merge owns BOTH auth doors (F-EE) + its dedupe half (F-GG), but
the CART merge (`mergeGuestCartIntoUser`, cart.ts:154-192) is gated ONLY on
its survival half through the LOGIN door (H-8, session-5 — a UI flow whose
james cart is EMPTY pre-merge). The merge read-census, every half read
first-hand:

| Contract half | Source (cart.ts:154-192) | Gate before this round |
|---|---|---|
| Survival (a fresh guest line lands on the user cart) | the `create` branch (:190) | H-8 login door (UI) ✓ — and NOTHING on the register door |
| **Overlap dedupe split** | `tx.cartItem.findUnique({ where: { cartId_productId_size } })` (:180) + the update/create split (:185-192) | **none — wire-blind** (H-8's user cart holds no overlapping line — the branch never fires anywhere) |
| **Quantity-max union** | `Math.max(existing?.quantity ?? 0, item.quantity)` (:184) | **none — wire-blind** |
| **Stock clamp (F-13, session-3)** | `Math.min(..., stock)` (:184) — the documented session-3 fix ("merged quantities were never clamped against product stock") | **none — wire-blind** (no test drives a merge with quantity > stock; the UI clamps quantity, so only a stale guest bag — stock dropped behind it, the H-39 shape — can carry one) |
| **The register door** (auth.ts:123) | `await mergeGuestCartIntoUser(user.id)` inside registerAction | **none — the login door's call is H-8-gated; the register door's call is ungated entirely** |
| Guest-row deletion + cookie clear AFTER commit (G-5) | `db.cart.delete` (:193) + `store.delete(CART_COOKIE)` (:199) | H-8 pins the row survival only; the deletion/cookie halves are unasserted server-truth |

### 3.1 Why the halves matter (the harm chain, every link source-verified)

The merge runs INSIDE `loginAction` (auth.ts:44) and `registerAction`
(auth.ts:123), both reachable over the no-JS progressive-enhancement wire
(the F-PP measured `$ACTION_*` multipart shape). A dropped half rides every
existing gate green:

1. **The union drop** (`item.quantity` instead of the max): the USER's larger
   pre-existing line silently SHRINKS to the guest's quantity at login —
   cross-session data corruption of the caller's own bag state (the merge
   contract's union semantic, violated in the user-losing direction).
2. **The keep-existing drop** (`existing.quantity` instead of the max): the
   GUEST's larger line loses its growth at merge — the opposite direction of
   the same contract.
3. **The clamp drop**: a stale guest line above stock lands on the user cart —
   the exact F-13 invariant ("merged quantities clamped against product
   stock") resurrects silently (the checkout guard re-checks later, but the
   bag state itself violates the stock invariant — the class session-3
   closed).
4. **The dedupe-split drop** (always `create`): the `@@unique([cartId,
   productId, size])` constraint throws P2002 INSIDE `$transaction` → the tx
   aborts → the login/register action 500s mid-flow — the same crash class
   F-GG named for the wishlist ("the P2002 crash class that would break the
   login door").
5. **The register-door call drop**: the guest bag silently vanishes at
   register (the cookie stays, the row stays, but the new user's cart renders
   empty — the guest bag is unreachable for them: silent data loss on the
   onboarding door).

### 3.2 Why this outranks the named candidates

Same precedence rule as sessions 47-50: a data-integrity seam with a
wire-reachable surface outranks the documentation-class polish (the PDP
og:image annotation — a served-metadata item with a DOCUMENTED deliberate
design decision behind it). F-GG (session-36) closed the wishlist sibling for
exactly this class; the F-GG plan treated the cart merge only as a
fixture-allocation concern ("the cart merge uses the hat for CART state
only") — the cart halves were never explicitly gated or declined.

## 4. Plan-probe discipline (run BEFORE the spec)

`scripts/plan-probe-session51.cjs` — the throwaway healthy-copy standalone on
:3209 (the F-PP/F-UU copyFile pattern; the auth actions + the merge need
working DB reads AND writes on the copy), wire-verifying every F-VV assumption:

1. the server BOOTS and LISTENS against the healthy throwaway copy
   (`/api/health` → 200 + `{"ok":true,"db":true}`);
2. the login + register page manifests expose exactly 2 ids each (the shared
   auth-form's pair), the ids DISCRIMINATED by response envelope (the F-PP
   method: the login shape answers the anti-enumeration envelope; the
   register shape fails registerSchema's Zod gate);
3. the fixture user mints with an OFFLINE scrypt hash (`s1$salt$hex`, keylen
   64 — the F-II replication) and the hash VERIFIES offline;
4. the guest cart fixture mints (userId NULL, run-unique token) with the
   three lines: the overlap-A line (user-larger), the overlap-B line
   (guest-larger), the clamp line (qty = stock+5);
5. **the login-door merge holds the standing contract on the healthy copy**:
   the no-JS login craft (explicit `aurelia_cart` Cookie header) SUCCEEDS
   (no anti-enumeration envelope; a session row mints server-truth) AND the
   merged state reads server-truth — line A exactly 1 row at quantity 2 (the
   max union, user-larger), line B exactly 1 row at quantity 3 (the max
   union, guest-larger), the clamp line at stock (F-13), the guest cart row
   GONE, the cookie CLEARED on the wire (the Set-Cookie deletion half);
6. **the register-door merge holds**: a fresh-email no-JS register craft
   mints the user + the user cart (the merge upsert), the clamp + survival
   lines land clamped, the guest row is GONE;
7. the false-positive shape: the guest token ABSENT (no cookie) → the login
   craft still succeeds, the merge no-ops (the early return);
8. the finally SIGTERMs the child (SIGKILL escalation) and removes the
   tmpdir; zero writes to dev/e2e DBs.

## 5. Remediation design (gate-only round — the F-GG/F-UU ladder)

**The TDD ladder**: write the spec → verify GREEN against the CORRECT source
→ the mutation demos drop one half → REBUILD → exactly the new case-runs RED
→ restore byte-identical → rebuild → green. The source ships NO delta.

### 5.1 The spec — cart-checkout.spec.ts (the OWNING spec)

The cart merge's owning spec (H-8's describe lives there). A NEW describe
**"guest cart merge contract (F-VV, session-51)"** (uniques 15 → 17). TWO
request-level cases (Node fetch with EXPLICIT Cookie headers — the F-RR/F-UU
shape; the F-PP no-JS multipart wire shape for the auth actions; zero UI
logins, zero storageState pollution):

- `beforeAll` (SQL, id-scoped, run-unique suffix — the F-UU mint shape):
  - the fixture user for the login door (email `fvv-<suffix>@example.com`,
    offline scrypt hash of a schema-valid password);
  - the fixture user's cart + the pre-existing overlap lines: A on
    cashmere-overcoat size "S" quantity 2 (user-larger), B on
    merino-wool-turtleneck size "M" quantity 1 (guest will carry 3);
  - the guest cart (userId NULL, run-unique 48-hex token) with: overlap-A
    (same product+size, qty 1), overlap-B (same product+size, qty 3), the
    clamp line on structured-tote-bag "One Size" qty = stock+5, the survival
    line on merino-wool-turtleneck size "L" qty 1;
  - products resolved by slug at runtime (never hardcoded ids); stocks
    captured at runtime (the clamp expectation is dynamic — checkout flows
    decrement gown/hat stocks during the run, the fixture products are
    cart-flow-untouched);
- **Case 1 (the login door)**: read the login manifest's 2 ids, discriminate
  the loginAction id by envelope (the F-PP method); the no-JS login craft
  (email + password + `$ACTION_*` fields, explicit `aurelia_cart` cookie)
  → assert the craft SUCCEEDED (the response carries NO anti-enumeration
  envelope AND the session row minted server-truth) AND the merged state:
  exactly one overcoat-S line at quantity 2 (the union, user-larger), exactly
  one turtleneck-M line at quantity 3 (the union, guest-larger), the clamp
  line at the captured stock, the survival line present, the guest cart row
  GONE, the cart cookie CLEARED in the response's Set-Cookie;
- **Case 2 (the register door)**: the register manifest's 2 ids, the
  registerAction id by the exists-envelope/Zod discrimination; a fresh-email
  no-JS register craft (run-unique email — a fresh register bucket key is
  irrelevant: the register limiter is per-IP; see budget) carrying the SAME
  guest-cart design (fresh token) → assert the user row minted, the user's
  cart created by the merge upsert, the clamp line clamped, the survival
  line present, the guest cart row GONE. (The overlap half is INHERENTLY
  absent on this door — the user cart is created BY the merge; documented.)
- `afterAll`: id-scoped idempotent DELETEs (all fixture CartItems, both
  carts, the fixture users by email, their Session rows — the register
  craft's session + the login craft's session); global-setup's transient
  wipe is the belt-and-braces.

### 5.2 Count ledger

cart-checkout.spec uniques 15 → 17 → 146 → 148 unique cases; 290 → 294
passed. Both new case-runs are green on BOTH device projects (request-level —
no viewport dependence).

### 5.3 Budget ledger (the limiter arithmetic, first-hand from src/)

- **login** is keyed `login:${ip}:${email}` — the fixture email is
  run-unique → a FRESH bucket per run: 2 slots (both projects). ZERO
  consumption of any existing bucket (james's, the F-PP burst emails').
- **register** is keyed `register:${ip}` (per-IP, shared): current suite
  consumption = F-GG's 1 register × 2 projects = 2 slots; the F-VV craft
  adds 2 → **4/10 per run**. Safe headroom (the F-PP floors run on the
  throwaway and never touch :3100's buckets).
- The crafts mint session rows on db/e2e.db (the login/register actions
  createSession) — afterAll deletes them by userId; the canonical
  global-setup wipe is the belt-and-braces.

## 6. Mutation demos (the regression shapes, proven RED)

Each demo: drop ONE contract half, REBUILD, run the owning spec file. The
expected RED sets (both device projects = 2 runs per case):

1. **The union drop (guest-wins)**: `Math.max(existing?.quantity ?? 0,
   item.quantity)` → `item.quantity` → exactly **2 case-runs RED** (case 1
   both projects) at the overlap-A quantity assertion (2 → 1 observed);
   case 2 runs GREEN (no pre-existing user line — the door's documented
   shape). The mirror surgery (`existing?.quantity ?? 0`) redds the
   overlap-B assertion (3 → 1) — same contract half, opposite direction,
   asserted by the same case run; one demo surgery proves the harness bites,
   the mirror assertion pins the direction.
2. **The clamp drop**: the `Math.min(..., stock)` removed (mergedQty = the
   raw max) → exactly **4 case-runs RED** (BOTH cases, both projects) at
   their clamp assertions (stock+5 observed > stock).
3. **The dedupe-split drop**: the `findUnique` + split removed (always
   `create`) → exactly **2 case-runs RED** (case 1) — the P2002 aborts the
   transaction, the login craft 500s, the success + merged assertions fail;
   case 2 GREEN (no existing line on the register door).
4. **The register-door call drop**: `await mergeGuestCartIntoUser(user.id)`
   deleted from registerAction (auth.ts:123) → exactly **2 case-runs RED**
   (case 2) at the merge-state assertions (no user cart, the guest row
   survives); case 1 GREEN (the login door's call is H-8-pinned).

All restored via inverse edit (`git diff --stat src/` empty) → rebuild →
green.

## 7. Validation of this plan against the codebase (pre-execution)

- cart.ts:154-205 read first-hand IN FULL (both early returns; the upsert;
  the F-13 clamp comment; the G-5 cookie-after-commit comment; the
  update/create split; the `stockById` pre-read);
- auth.ts:25-50 (loginAction) and :100-135 (registerAction) read first-hand
  (the limiter key SHAPES + bounds; createSession → merge order; the
  server-side redirect);
- H-8's describe read first-hand (the empty-user-cart shape — the overlap
  branch never fires in it);
- F-GG's describe read first-hand (the wishlist sibling's two-direction
  design + its register-bucket arithmetic);
- F-PP's postForm + manifest-discrimination + the no-JS field order
  ($ACTION_REF_1, $ACTION_1:0 {id, bound:"$@1"}, $ACTION_1:1 "[null]",
  $ACTION_KEY) read first-hand (the exact wire shape to reuse);
- F-II's offline scrypt replication read first-hand (s1$salt$hex, keylen 64);
- F-UU's sqlRun/dbRead/explicit-Cookie helpers read first-hand (the mint
  shape to crib);
- the seed read + stocks verified first-hand (all canonical stock=12 at run
  start; checkout flows decrement gown/hat only; cashmere-overcoat /
  structured-tote-bag / merino-wool-turtleneck carry no cart-flow writes —
  fixture-safe);
- the prisma schema read: Cart.userId @unique, CartItem @@unique([cartId,
  productId, size]), Session/User shapes;
- both auth-page manifests read first-hand: exactly 2 ids, IDENTICAL across
  login + register (the shared auth-form);
- loginSchema/registerSchema bounds read first-hand (the fixture password
  "FvvGate1234!" clears both; confirmPassword matches on register);
- `grep "mergeGuestCartIntoUser" tests/` → the H-8 survival pin ONLY (the
  halves' wire-blindness verified);
- playwright.config.ts honored: workers: 1 serial; request-level cases carry
  no viewport dependence;
- the port contract: the suite server :3100; the probe :3209.

## 8. Round-46 parity census (the standing ritual)

**ENVIRONMENT: the live reference (Base44) answered HTTP 503 at the round's
start** — the EIGHTH consecutive round. Handled per the honest-outage
precedent: the census runs **CLONE-side ×2** (46a on the final build with
`--shots`; 46b after the post-dev-rebuild), both viewports, against the
round-38..45 clone-side ledger (desktop 11085 / mainKids 11 / footerH 444,
mobile 11264 / 1189, the drawer `flex flex-col gap-5 mt-4` + gaps
[20,20,20,20] — the v4 mobile-nav pin). The reference-side fields CARRY BY
DOCUMENTATION; the WOMEN-inert posture re-check + the 2 ref screenshots stay
DEFERRED while the platform is down. The clone's mobile-menu behavior
verified end-to-end on the dev server (`rm -rf .next` first;
`env -u DATABASE_URL` boot; boot + probe + kill in ONE foreground command;
the settle probe `scripts/dev-nav-settle-session47.cjs`). The reference gets
one final re-probe before the final gates.

## 9. Final gates + docs

- typecheck ✓ lint ✓ 173/173 unit ✓ build ✓ E2E green at the §5.2 ledger —
  the 54th→55th consecutive fully-green session.
- Screenshots refreshed (the census's clone shots + the dev-server set).
- Docs aligned: SKILL (§2 row + F-VV; §11 command 148; Appendix B NEW
  session-51 row), README, CLAUDE.md, PAD, AGENTS.md, this plan's execution
  record, worklog, `docs/session_71.md`; `.env.example` verified unchanged
  and matching; stale-count sweep zero.
- One main-branch commit pushed via the SSH wrapper v3
  (`--remote git@github.com:nordeim/luxury-fashion-store.git`).

## 10. Residual risks / next steps (post-F-VV)

1. The two-sided census's reference half stays DEFERRED while Base44 is down;
   the NEXT round re-runs the full two-sided sweep FIRST THING if the
   platform recovered (carried forward, eighth round).
2. The named documentation class returns first: the PDP og:image annotation
   / og:type union / `style-src 'unsafe-inline'` exceptions (carried).
3. Real PSP behind the checkout seam (carried).
4. Dev-toolchain npm-audit findings (all dev-only) — carried.
5. The wishlist merge's H-29 transaction-atomicity half stays
   source-read-only (carried); the cart merge's G-5 cookie-after-commit
   ordering is now WIRE-ASSERTED (the Set-Cookie clear) but its
   tx-failure half stays source-read-only (carried).
6. The success gate's foreign-owner row stays covered-by-shape (carried).
7. The cart/wishlist sweeper-anchor touch writes (cart.ts:39/41) stay
   source-read-only (carried).
8. The TOCTOU badge note stays a documented observation (carried).
9. security.txt `Expires` (2027-11-01) renewal cadence (carried).
10. `NewsletterSubscriber` stays outside global-setup's wipe list (carried).
11. Harness lessons carried: the storageState ride (request.newContext()
    applies use.storageState — truly cookie-less crafts use Node fetch);
    the APIRequestContext jar drops production-Secure cookies over http;
    raw-fetch title-greps under-read Next 16 streaming metadata; the
    fixture-FK ordering (a CartItem INSERT needs its parent Cart row first).
12. The register bucket now consumes 4/10 per run (F-GG 2 + F-VV 2) — future
    register-driving specs must count before adding (recorded).

## Execution record

| # | Task | Result |
|---|---|---|
| 1 | Plan probe | ✅ `scripts/plan-probe-session51.cjs` — **16/16 checks** on the throwaway healthy-copy standalone on :3209: boot + health; both manifests' exactly 2 identical ids; the login id discriminated by envelope; the fixture user minted + the offline scrypt hash verified; **the login-door merge holds the standing contract** (the craft succeeds at 303 + a session row; overlap-A exactly 1 row at the MAX 2; overlap-B exactly 1 row at the MAX 3; the clamp line at the captured stock 12; the survival line lands; the guest cart row GONE; the cookie CLEARED on the wire — `aurelia_cart=` in Set-Cookie); **the register-door merge holds** (the user + the merge-upserted cart at exactly 2 clamped/survival lines; the guest row GONE); the cookie-less login no-ops the merge (4 lines unchanged); cleanup confirmed |
| 2 | The spec (GREEN against the correct source) | ✅ The F-VV describe appended to `tests/e2e/cart-checkout.spec.ts` (the OWNING spec — H-8's file; uniques 15 → 17): the manifest canary + the F-PP envelope discrimination → **case 1 (the login door)**: the no-JS login craft riding the explicit guest-cart cookie → the sub-400 status (the P2002 canary) + no envelope + the session row server-truth → overlap-A exactly 1 row at the MAX 2 (user-larger union) → overlap-B exactly 1 row at the MAX 3 (guest-larger union) → the clamp line at the captured stock (F-13) → the survival line → the guest cart row GONE → the cookie cleared on the wire; **case 2 (the register door)**: the register craft → the user minted → the merge-upserted cart at exactly the clamped + survival lines → the guest row GONE → the cookie cleared. Budget honored: 2 fresh-bucket login slots + 2 register slots (4/10 with F-GG). **36 passed** on the owning file (17 × 2 + 2 setup), source byte-identical |
| 3 | Mutation demo 1 (the union drop, guest-wins + the keep-existing mirror) | ✅ (1a) `Math.max(existing?.quantity ?? 0, item.quantity)` → `item.quantity` → REBUILD → **exactly 2 case-runs RED** (case 1 both projects) at the overlap-A MAX-quantity assertion (2 → 1 observed); case 2 GREEN. (1b) the mirror surgery (`existing ? existing.quantity : item.quantity`) → **exactly 2 RED** at the overlap-B assertion (3 → 1 observed) — BOTH directions of the union contract independently gated |
| 4 | Mutation demo 2 (the clamp drop) | ✅ the `Math.min(..., stock)` removed → REBUILD → **exactly 4 case-runs RED** (BOTH cases, both projects) at their clamp assertions (stock+5 observed > stock); the halves independently gated |
| 5 | Mutation demo 3 (the dedupe-split drop → P2002) | ✅ the findUnique + update/create split removed (blind create) → REBUILD → **exactly 2 case-runs RED** (case 1) at the sub-400 status assertion — the WebServer log shows the raw `Unique constraint failed on the fields: (cartId, productId, size)` and the LOGIN ITSELF 500s mid-flow (the crash class F-GG named for the wishlist); case 2 GREEN |
| 6 | Mutation demo 4 (the register-door call drop) | ✅ `await mergeGuestCartIntoUser(user.id)` deleted from registerAction (auth.ts:123) → REBUILD → **exactly 2 case-runs RED** (case 2) at the merge-upsert assertion (no user cart, the guest row survives); case 1 GREEN (the login door's call is H-8-pinned) |
| 7 | Round-46 census ×2 + mobile-menu ritual + screenshots | pending |
| 8 | Final gates + docs alignment + push | pending |
