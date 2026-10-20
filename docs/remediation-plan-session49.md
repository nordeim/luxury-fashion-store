# Remediation Plan — Session 49 (F-TT: the inactive-product visibility contract's two wire-blind halves — the wishlist action's missing isActive wall + the PDP's inactive head)

The session-48 continuation round. Per the standing precedent: audit the pulled
HEAD (`32d97e1`), re-verify the baseline, re-probe the reference platform FIRST
THING (the session-48 plan §12 item 14), run the fresh audit pass, then close
the strongest finding with a TDD gate. This round differs from the recent
gate-only rounds in one respect: the strongest finding is a SOURCE defect (not
merely a missing gate) — the TDD ladder runs RED → fix → GREEN, and the
mutation demo re-drops the fix to re-prove the gate bites.

## 1. Starting state

- **Workspace NOT reset** since session-48 (node_modules, `.env`, both DB
  files, the built `.next/standalone` all present) — the recovery set was
  already materialized; only `git pull` was needed.
- HEAD after pull `32d97e1` = remote `main` (fast-forward `9f9438f..32d97e1`).
- The committed tree's contract: 173 unit (19 files) · 143 unique E2E × 2
  device projects − 2 desktop-only skips = **284 passed + 2 skipped** ·
  typecheck ✓ lint ✓ build ✓.
- The standing Tailwind v4 / mobile-nav pins re-verified first-hand during
  the audit (mobile-nav.tsx:59 `w-80 … flex flex-col gap-6`, :76
  `flex flex-col gap-5 mt-4`; 26 full `hsl()` literals in globals.css
  `@theme`; zero live `space-y-` on parity surfaces).

## 2. Audit of `32d97e1` (the pulled HEAD) — first-hand

`git log --name-status -1` → **one change**: `docs/session_66.md` (+79) — the
parallel thread's raw narration transcript of the SAME session-48 round (the
F-SS gate + the round-43 census + the five-docs alignment); its ledger matches
`9f9438f`'s actual work (test-only, zero `src/`). Docs-only, RETAINED (never
overwrite another thread's log). This round's narration ships as
`docs/session_67.md` (session_66.md taken by the pulled commit).

## 3. Reference platform re-probe (the FIRST-THING directive)

The live reference (Base44) answered **HTTP 503 on both `/` and `/login`** at
the round's start — the sessions-44/45/46/47/48 outage, now the SIXTH
consecutive round. Handled per the honest-outage precedent: the census runs
CLONE-side ×2; the reference-side fields carry by documentation from the
round-38 live measurement; the WOMEN-inert posture re-check + the 2 ref
screenshots stay DEFERRED; one final re-probe before the final gates. If the
platform recovers mid-round, the full two-sided sweep runs then.

## 4. Baseline re-verification

- typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build + assemble ✓
- E2E **284 passed + 2 skipped** (143 unique × 2; 6.8m) — the 50th
  consecutive session fully green at baseline, exactly matching session-48's
  final gates.

## 5. Fresh audit pass — the round's finding

With F-SS every MUTATION seam's authz wall owns a gate; the session-48 plan
§12 returned the named candidates to the documentation/infrastructure class
(the PDP og:image annotation first-named). The fresh audit pass therefore
swept a class no census had yet systematically covered: **the
inactive-product visibility contract beyond the render seam** — does
`isActive:false` (the admin's H-7 visibility toggle, the same half F-SS
guarded against customer sabotage) actually mean "hidden" at EVERY seam that
reads a product, or only where the storefront renders cards?

The isActive read-census (every product read in `src/`, read first-hand):

| Seam | isActive filtered | Gate |
|---|---|---|
| `/` home rows (`page.tsx:28`) | ✓ | home.spec |
| `/shop` PLP (`shop/page.tsx:34`) | ✓ | shop.spec |
| PDP render (`product/[slug]/page.tsx:74`) | ✓ (404s) | product.spec (active only) |
| PDP related row (`:78`) | ✓ | product.spec |
| wishlist page read (`wishlist/page.tsx:17`) | ✓ | wishlist.spec (empty state) |
| `/api/search` (`api/search/route.ts`) | ✓ | api-contract (F-12) |
| sitemap (`sitemap.ts:17`) | ✓ | seo.spec (F-H) |
| cart add (`cart.ts:57-60`) | ✓ (denies) | H-59 + F-SS controls |
| checkout item re-read (`checkout.ts:145-152`) | ✓ (rejects) | F-MM |
| **wishlist toggle (`wishlist.ts:23-25`)** | **✗ MISSING** | **none — wire-blind** |
| **PDP `generateMetadata` (`page.tsx:29-33`)** | **✗ MISSING** | **none — wire-blind** |

### 5.1 Half A — `toggleWishlistAction`'s missing `isActive` wall

`src/lib/actions/wishlist.ts:23-25`:

```ts
const product = await db.product.findUnique({ where: { id: parsed.data.productId }, select: { id: true } });
if (!product) return fail("This piece is no longer available.");
```

The action's OWN denial message ("This piece is no longer available.") guards
EXISTENCE only — the `select` never reads `isActive`. The cart's exact mirror
(`cart.ts:57-60`) reads the full row and guards `!product || !product.isActive`
with the SAME message. The asymmetry is an oversight, not a design: the
intent (reject unavailable pieces) is documented in the message itself.

The harm chain (every link source-verified this round):

1. A deactivated product (the admin's H-7 visibility toggle, or the F-SS
   catalog-sabotage class) can be wishlisted **over the wire** (the crafted
   JSON-arg POST — the H-59 measured shape) or through a **stale PDP tab**
   (the heart button on an already-open page; the UI's card grids render
   active-only, but a PDP tab opened before deactivation still carries the
   heart). The action mints the WishlistItem row for a hidden product.
2. The row persists (nothing ever reads it for display): the wishlist page
   filters `isActive: true` (`wishlist/page.tsx:17`), so the hidden piece's
   card never renders — the customer sees the EMPTY-STATE guidance
   ("Tap the heart on any piece to save it for later.").
3. But the **header badge counts the RAW set** (`header.tsx:118-127` reads
   `wishlist.size` from `getWishlistDto`'s un-filtered productIds —
   `cart.ts:58-63`): the badge renders "1" while the page renders the
   empty-state guidance — **the badge-vs-page disagreement is user-visible,
   end-to-end**.
4. The row survives the F-EE/F-GG login merge invisibly (the merge carries
   rows, not render lists) — a hidden product lingers in the account
   indefinitely.

Wire-blindness (verified against the committed suite): `grep toggleWishlist
tests/` → only the action-seam gate (H-59) probing GARBAGE ids ("still
write-free"); `grep isActive tests/e2e/*.spec.ts` → only the admin F-LL/F-SS
fixtures and the action-seam ACTIVE product reads. ZERO specs craft
toggleWishlist with an INACTIVE product.

### 5.2 Half B — the PDP's `generateMetadata` serves an inactive product's head

`src/app/(storefront)/product/[slug]/page.tsx:29-33`:

```ts
const product = await db.product.findUnique({ where: { slug } });
if (!product) return { title: "Product Not Found" };
```

`generateMetadata` never checks `isActive` — only existence. The page RENDER
404s (`if (!product || !product.isActive) notFound()` at :74), but Next.js
streams metadata in parallel with the render.

**EXECUTION UPDATE (the probe's false negative, caught by the spec):** the
plan probe (§6) measured the raw-fetch HTML's FIRST `<title>` match and
found `'AURELIA'` for both the inactive and the unknown slugs — a seeming
non-issue. The E2E browser case (page.content() — the DOM AFTER streaming
resolves) measured **"F-TT 404 Probe | AURELIA"** for the inactive PDP: the
raw HTML's static shell carries the root title while the RSC flight
payload (`18:[["$","title","0",{"children":"F-TT Leak Probe … | AURELIA"}…]`,
context-measured first-hand in scripts/plan-probe-session49b.cjs) streams
the hidden product's title, og:image and price metas — every
JS-executing client (browsers, Google's crawler) resolves the leak. The
probe's raw-fetch read was the false negative; the browser DOM is the
authoritative head measurement. **The leak is REAL — Half B lands in the
fix** (generateMetadata gets the render's exact `!product ||
!product.isActive` guard). Lesson recorded: raw-fetch title-greps
under-read Next 16's streaming metadata; pin head contracts with
browser-resolved content.

TOCTOU note (scoped): a product deactivated AFTER being lawfully wishlisted
still lingers + counts on the badge (lawful data — the customer DID save it);
the read-side page filter is the deliberate hedge for that case. This round's
fix closes the CREATING-new-rows-for-hidden-products half; the TOCTOU badge
note carries in §12.

### 5.3 Why this outranks the named og:image candidate

Same precedence rule as session-47/48: a functional/data-integrity defect
with a user-visible wire symptom outranks a documentation-class polish. The
og:image annotation remains a documented deliberate design decision (carried).

## 6. Plan-probe discipline (run BEFORE the spec)

`scripts/plan-probe-session49.cjs` — the throwaway healthy-copy standalone on
:3209 (the F-PP/F-QQ/F-RR/F-SS copyFile pattern; the wishlist action needs
working DB reads + writes on the copy), wire-verifying every F-TT assumption:

1. the server BOOTS and LISTENS against the healthy throwaway copy
   (`/api/health` → 200 + `{"ok":true,"db":true}`);
2. the PDP route manifest exposes exactly 4 ids (the H-59 build-shape canary)
   with `toggleWishlistAction` identified by exportedName;
3. an INACTIVE probe product minted on the copy (INSERT with a run-unique
   slug, `isActive=0`, the F-LL column template);
4. **Half A (the bug, measured)**: the crafted JSON-arg POST with the
   inactive id → HYPOTHESIS: `"ok":true` + `wishlisted:true` + the
   WishlistItem row minted server-truth (the missing wall, reproduced);
5. **the badge-vs-page disagreement, rendered end-to-end**: GET `/wishlist`
   with the minted wishlist cookie → the header badge renders the RAW count
   while the empty-state guidance renders (the user-visible symptom);
6. **Half A control**: the SAME wire shape with an ACTIVE product id →
   `"ok":true` + the row lands (the false-positive guard: the wire shape
   works; only the wall is missing);
7. **Half B (measured)**: GET `/product/<inactive-slug>` → the HTTP status +
   the served head's `<title>`, og:image, `product:price:amount` vs the
   same reads for an UNKNOWN slug (the pure-404 control) — the delta
   decides whether the leak is real (fix) or Next discards segment metadata
   on notFound() (document the non-issue, half B drops);
   **[executed: the raw-fetch read measured the pre-stream SHELL — a FALSE
   NEGATIVE (title 'AURELIA' for both); the browser-DOM read (the E2E
   case) measured the REAL leak ("<product name> | AURELIA"); the
   flight-payload wire shape documented first-hand in
   scripts/plan-probe-session49b.cjs — see §5.2's execution update]**;
8. the finally SIGTERMs the child (SIGKILL escalation) and removes the
   tmpdir; zero writes to dev/e2e DBs.

## 7. Remediation design (TDD — RED first, then the fix)

**The TDD ladder for a source-defect round**: write the failing spec FIRST
(REpro against the buggy source — the disciplined RED), apply the minimal
fix, GREEN, then the mutation demos (re-drop each fix half → RED → restore
byte-identical → rebuild → green).

### 7.1 The fix (minimal, the cart's exact mirror)

- `wishlist.ts:23-25`: read `isActive` + guard both halves:
  `select: { id: true, isActive: true }` +
  `if (!product || !product.isActive) return fail("This piece is no longer available.");`
- (conditional on the probe's Half-B verdict) `product/[slug]/page.tsx`
  generateMetadata: `if (!product || !product.isActive) return { title: "Product Not Found" };`

### 7.2 The spec — wishlist.spec.ts (the OWNING spec)

NEW describe **"wishlist inactive-product wall (F-TT, session-49)"** at the
END of `tests/e2e/wishlist.spec.ts` (the file's describes 4 → 5). ONE
request-level case (Node fetch / playwright request context with explicit
Cookie handling — the H-59/F-RR shape; zero logins, zero registers, zero
limiter consumption — the wishlist action carries none):

- `beforeAll`: mint the INACTIVE probe product on `db/e2e.db` (SQL fixture,
  INSERT with a run-unique slug prefix, `isActive=0`, the F-LL/F-SS column
  template — a row NO other spec reads); resolve at runtime: the inactive id,
  an ACTIVE control product id (a canonical piece no other wishlist spec
  hearts), both via dbRead;
- the manifest canary: the PDP route manifest's exactly 4 ids with
  `toggleWishlistAction` by exportedName;
- **LB1 (the wall)**: the crafted JSON-arg POST with the INACTIVE id →
  `"This piece is no longer available."` + `"ok":false` AND zero WishlistItem
  rows minted server-truth (the delta);
- **LB2 (the Zod half, self-contained)**: a garbage id →
  `"Invalid wishlist request."` (the schema gate still first);
- **LB3 (the control — the false-positive guard)**: the SAME wire shape with
  the ACTIVE id → `"ok":true` + `wishlisted:true` AND the row LANDS
  server-truth → toggle again (the toggle-off restores the pre-state) → the
  final delta zero;
- `afterAll`: the prefix-scoped DELETEs (the probe product row; idempotent;
  global-setup's transient wipe is the belt-and-braces).

### 7.3 The spec — product.spec.ts (Half B, conditional)

NEW case in the "product detail" describe: **"an inactive product's PDP
serves the 404 card — and its head stays honest (F-TT half B)"**: mint the
inactive probe product (the same SQL-fixture pattern, run-unique slug);
GET `/product/<inactive-slug>` → expect the 404 status + the platform 404
card AND the head does NOT serve the product's name in `<title>`, its
og:image, or its `product:price:amount`; the ACTIVE control PDP still serves
its full head (the not-dropped-meta guard). afterAll deletes the row.

### 7.4 Count ledger

wishlist.spec uniques +1, product.spec uniques +1 (conditional) → 143 → 144
(→ 145 if Half B lands) unique cases; 284 → 286 (→ 288) passed. The new
case-runs green on BOTH device projects (request-level — no viewport
dependence).

## 8. Mutation demos (the regression shapes, proven RED)

Each demo: drop ONE fix half, REBUILD, expect **all existing case-runs
GREEN** (the wire-blindness proof) while the new case-runs fail:

1. **wishlist.ts's `isActive` wall dropped** (revert to `select:{id:true}` +
   the existence-only guard) → exactly the 2 F-TT wishlist case-runs RED at
   the inactive-craft assertion (the row mints again) with every existing
   case green (the stale-PDP harm class rides through the UI-blind suite).
2. (conditional) **generateMetadata's `isActive` guard dropped** → the 2
   Half-B case-runs RED at the head-honesty assertion.

All restored via inverse edit (`git diff --stat src/` empty — byte-identical
except the two intended fix lines) → rebuild → green.

## 9. Validation of this plan against the codebase (pre-execution)

- `wishlist.ts` read first-hand (the existence-only guard at :23-25; the
  message "This piece is no longer available." already present; the Zod gate
  H-53 first at :21; the H-42 touch + F-3 transaction below — the wall slots
  exactly where the existence check lives, before getOrCreateWishlist);
- `cart.ts:48-70` read first-hand (the mirror: full-row read, the two-branch
  guard with the same message + the stock branch below);
- `wishlist/page.tsx:17` + `header.tsx:110-127` + `cart.ts:58-63`
  (getWishlistDto) read first-hand — the badge-vs-page disagreement chain
  (raw set vs filtered render);
- `product/[slug]/page.tsx` read first-hand (generateMetadata :29-33
  existence-only; the render's `!product || !product.isActive` at :74);
- the H-59 wire shape read first-hand (`postAction`: POST the PDP path +
  `Next-Action` + `text/plain;charset=UTF-8` + JSON array body; the manifest
  at the standalone path with exactly 4 ids);
- the F-LL/F-SS SQL column template read first-hand (admin.spec.ts:545-548);
- `grep toggleWishlist tests/` + `grep isActive tests/e2e/` — wire-blindness
  verified (zero inactive-product crafts);
- the seed read: ALL products ship `isActive: true` (seed.ts:66) — the
  fixture MUST mint the inactive row (never mutate a canonical product);
- `playwright.config.ts` honored: workers: 1 serial (the fixture window is
  quiescent); request-level cases carry no viewport dependence;
- the port contract: the suite server :3100; the probe :3209 (never :3100/
  :3211/:3212/:3213);
- Trap #13: `process.cwd()`-based paths in the specs.

## 10. Round-44 parity census (the standing ritual)

**ENVIRONMENT: the live reference (Base44) answered HTTP 503 at the round's
start** — the SIXTH consecutive round. Handled per the honest-outage
precedent: the census runs **CLONE-side ×2** (44a on the final build with
`--shots`; 44b after the post-dev-rebuild), both viewports, against the
round-38..43 clone-side ledger (desktop 11085 / mainKids 11 / footerH 444,
mobile 11264 / 1189, the drawer `flex flex-col gap-5 mt-4` + gaps
[20,20,20,20] — the v4 mobile-nav pin). The reference-side fields CARRY BY
DOCUMENTATION; the WOMEN-inert posture re-check + the 2 ref screenshots stay
DEFERRED while the platform is down. The clone's mobile-menu behavior
verified end-to-end on the dev server (`rm -rf .next` first;
`env -u DATABASE_URL` boot; boot + probe + kill in ONE foreground command;
the settle probe `scripts/dev-nav-settle-session47.cjs`). The reference gets
one final re-probe before the final gates.

## 11. Final gates + docs

- typecheck ✓ lint ✓ 173/173 unit ✓ build ✓ E2E green at the §7.4 ledger —
  the 51st consecutive fully-green session.
- Screenshots refreshed (the census's clone shots + the dev-server set).
- Docs aligned: SKILL (§2 + F-TT; Appendix B NEW session-49 row), README,
  CLAUDE.md, PAD, AGENTS.md, this plan's execution record, worklog,
  `docs/session_67.md`; `.env.example` unchanged and matching; stale-count
  sweep zero.
- One main-branch commit pushed via the SSH wrapper v3
  (`--remote git@github.com:nordeim/luxury-fashion-store.git`).

## 12. Residual risks / next steps (post-F-TT)

1. The TOCTOU badge note: a product deactivated AFTER being lawfully
   wishlisted still counts on the header badge while its card hides —
   lawful data; the read-side page filter is the deliberate hedge. Carried
   as a documented observation (design question, not a defect).
2. The named documentation class returns first: the PDP og:image annotation
   / og:type union / `style-src 'unsafe-inline'` exceptions (carried).
3. Real PSP behind the checkout seam (carried).
4. Dev-toolchain npm-audit findings (all dev-only) — carried.
5. The merge's H-29 transaction-atomicity half stays source-read-only
   (carried).
6. The success gate's foreign-owner row stays covered-by-shape (carried).
7. The cart/wishlist sweeper-anchor touch writes (cart.ts:39/41) stay
   source-read-only (carried).
8. The zero-drift streak is a streak, not a guarantee — the census ritual
   stays mandatory.
9. security.txt `Expires` (2027-11-01) renewal cadence (carried).
10. `NewsletterSubscriber` stays outside global-setup's wipe list (carried).
11. The sandbox kills detached process groups — long gates in the
    foreground (carried, honored again this round).
12. `rm -rf .next` before `npm run dev` after build-heavy rounds, then
    rebuild before re-running the sweep (carried).
13. The throwaway-server harnesses' per-case child spawns — amortization
    candidate (carried).
14. The reference platform's 503 outage (Base44 — down through sessions
    44/45/46/47/48/49 census windows) keeps the two-sided census's reference
    half DEFERRED; the NEXT round re-runs the full two-sided sweep FIRST
    THING if the platform recovered (carried forward).
15. Harness lessons from this round (recorded for the next thread): raw-
    fetch title-greps under-read Next 16 streaming metadata (browser DOM
    content is the authoritative head measurement); Playwright's
    APIRequestContext jar drops the production-`Secure` cookie over http —
    request-level control pairs ride PRE-MINTED rows + EXPLICIT Cookie
    headers (the F-RR shape), never the jar.

## Execution record

| # | Task | Result |
|---|---|---|
| 1 | Plan probe | ✅ `scripts/plan-probe-session49.cjs` — 9/9 checks on the throwaway healthy-copy standalone on :3209: boot + health; the PDP manifest's exactly 4 ids with toggleWishlistAction; the inactive probe product + active control resolving; **Half A reproduced** (the inactive id toggles ok:true, the row MINTS, the cookie mints); the badge-vs-page disagreement rendered END-TO-END ("Wishlist, 1 item" + the empty-state guidance + card absent); the active control's write; Half B initially read as a non-issue (the raw-fetch shell title — the §5.2 false negative); cleanup confirmed (tmpdir gone, zero dev/e2e-DB writes). `scripts/plan-probe-session49b.cjs` — the follow-up documenting the REAL Half-B wire shape: the raw HTML's static `<title>` = 'AURELIA' (the shell) while the RSC flight payload carries `["$","title","0",{"children":"F-TT Leak Probe … | AURELIA"}]` — the streamed segment metadata every JS-executing client resolves |
| 2 | The TDD RED (specs against the buggy source) | ✅ The F-TT wishlist describe (RED on both projects at the wall assertion) + the Half-B error-surfaces case (RED on both at the title assertion — **the spec caught the probe's false negative**: the DOM title leaks the hidden product's name). 4 failed / 14 passed on the pre-fix tree — exactly the two case-runs × 2 projects |
| 3 | The fix | ✅ Both halves applied: `wishlist.ts` the availability wall (`select: { id: true, isActive: true }` + the two-branch guard — the cart's exact mirror) + `product/[slug]/page.tsx` generateMetadata's `!product \|\| !product.isActive` guard (the render's exact mirror). typecheck ✓ lint ✓ build ✓ → **GREEN 18 passed** (both spec files, both projects). Harness lesson applied mid-case: the APIRequestContext jar cannot carry the production-`Secure` cookie over http — the control's toggle pair redesigned to ride a PRE-MINTED guest wishlist row through an EXPLICIT Cookie header (the F-RR wire fact) |
| 4 | Mutation demo 1 (the wishlist wall dropped) | ✅ Reverted to the existence-only guard → REBUILD → **exactly the 2 F-TT wishlist case-runs RED** (the inactive craft minted the row again) with all 16 other case-runs GREEN incl. the Half-B pair (the wire-blindness proof) → restored |
| 5 | Mutation demo 2 (the metadata guard dropped) | ✅ generateMetadata reverted to existence-only → REBUILD → **exactly the 2 Half-B case-runs RED** at the title-honesty assertion with all 16 others GREEN incl. the F-TT pair (the halves independently gated) → restored → `git diff --stat src/` = exactly the two intended fix files → rebuild → **18/18 green** |
