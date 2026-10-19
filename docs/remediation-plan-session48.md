# Remediation Plan — Session 48 (F-SS: the admin seam's role walls + field-validation gates — two actions, three ungated halves, one wire-measured harness)

The session-47 continuation round. Per the standing precedent: audit the pulled
HEAD (`1dfc088` — the parallel thread's session-log commit + the `skills/`
folder re-add), re-verify the baseline, re-probe the reference platform FIRST
THING (the session-47 plan §12 item 13), run the fresh audit pass, then close
the strongest finding with a TDD gate.

## 1. Starting state

- **Workspace RESET since session-47** — a fresh `git clone` (the standing
  tree's node_modules, `.env`, and both DB files were gone). The recovery set
  re-materialized first-hand: `npm install`, the canonical 3-line `.env`
  (`DATABASE_URL="file:../db/custom.db"` + AUTH_SECRET + site URL),
  `npm run db:setup` (canonical 4 categories / 12 products / 2 users / 4
  orders verified), `npx playwright install chromium` (**the round's new
  environment lesson**: a fresh sandbox carries NO Playwright browser binaries
  — the first E2E baseline run failed at `browserType.launch` on both setup
  projects until the browsers installed; an infrastructure step, not a
  product defect).
- HEAD `1dfc088` = remote `main`, verified up to date (`git pull` → already
  current on the fresh clone).
- The committed tree's contract: 173 unit (19 files) · 142 unique E2E × 2
  device projects − 2 desktop-only skips = **282 passed + 2 skipped** ·
  typecheck ✓ lint ✓ build ✓.

## 2. Audit of `1dfc088` (the pulled HEAD) — first-hand

`git log --name-status 1dfc088` (path-limited past `skills/` — the fresh
clone's tree enumeration is fast but the round still scopes the audit to
what changed outside the excluded folder) → **two changes**:

1. `docs/session_64.md` (+85) — the parallel thread's raw narration
   transcript of the SAME session-47 round (the F-RR gate + the round-42
   census + the five-docs alignment); its ledger matches `817f1d0`'s actual
   work (test-only, zero `src/`, the F-RR describe + the two probe scripts +
   11 screenshots + SKILL v1.40.0). Docs-only, RETAINED (never overwrite
   another thread's log).
2. **The `skills/` folder re-added wholesale** (2,606 files) — the operator's
   current-round directive names the repo-included `skills/` folder as
   AUDIT-side reference material (the repo `skills/skills-catalog.md` is the
   lookup index), while keeping the standing exclusion: NOT part of code
   checking, testing, or compilation. Verified first-hand: zero `skills/`
   references from package.json scripts, tsconfig include paths, eslint
   globs, vitest include, playwright config, or `src/` — nothing the build,
   the tests, or the runtime ever reads. RETAINED as reference material.

This round's narration ships as `docs/session_65.md` (session_64.md taken by
the pulled commit; session_63.md is this thread's own session-47 log).

## 3. Reference platform re-probe (the FIRST-THING directive)

The live reference (Base44) answered **HTTP 503 on both `/` and `/login`**
at the round's start — the sessions-44/45/46/47 outage, now the FIFTH
consecutive round. Handled per the honest-outage precedent (§9): the census
runs clone-side ×2; the reference-side fields carry by documentation from
the round-38 live measurement; the WOMEN-inert posture re-check + the 2 ref
screenshots stay DEFERRED; one final re-probe before the final gates. If the
platform recovers mid-round, the full two-sided sweep runs then.

## 4. Baseline re-verification (the recovered workspace)

- typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build + assemble ✓
- E2E **282 passed + 2 skipped** (141 unique × 2; 6.5m) — the 49th
  consecutive session fully green at baseline, exactly matching session-47's
  final gates (after the browser-bin install noted in §1).
- The standing Tailwind v4 / mobile-nav pins re-verified first-hand during
  the audit (mobile-nav.tsx:76 `flex flex-col gap-5 mt-4`, the `w-80` panel
  at :59, 26 full `hsl()` literals in globals.css `@theme`, zero live
  `space-y-` on parity surfaces).
- The sandbox quirk honored: the shell exports a parent-workspace
  `DATABASE_URL` — every DB-touching command runs under `env -u DATABASE_URL`.

## 5. Fresh audit pass — the round's finding

The session-47 plan §12 named the next candidates: "the next seam-census
should sweep the ADMIN mutation actions (… adminUpdateProductAction's role
wall + field validation gates — the next audit pass's first check)" — with
the PDP og:image annotation as the first NAMED (documentation-class)
candidate. Per the session-47 precedence decision, the fresh audit pass's
first discipline is the seam census over the mutation surface; it confirms
the §12 item 14 prediction.

### 5.1 F-SS — the admin seam's ungated halves (src/lib/actions/admin.ts)

The full server-reference-manifest census (read first-hand from the built
standalone): **exactly 15 action ids** — login/register (F-PP), adjust/
remove/addToCart/toggleWishlist (UI + H-59), changePassword (F-II),
saveAddress/updateProfile/deleteAddress/setDefaultAddress (F-JJ/F-RR),
logout (F-KK), placeOrder (F-MM/F-QQ), and **the two admin actions**. Every
seam owns a gate except the admin pair:

| Seam | Gated today | Wire-blind |
|---|---|---|
| `adminUpdateOrderAction` | F-HH pins the ADMIN-positive event-mint path (a real form on an offline-minted admin session) | the **role wall** — no spec anywhere posts the action without an admin session; a dropped `if (!admin)` lets any signed-in customer flip order status + mint FORGED `actor:"admin"` OrderEvent rows into other users' customer-visible timelines (order-integrity + timeline-forgery class), and inject fake tracking |
| `adminUpdateProductAction` | the UI positives only (H-7 stock sellout + visibility toggle, through the canonical admin storageState) | the **role wall** (a dropped `if (!admin)` lets any signed-in customer zero/explode stock or `isActive:false`-hide any product — catalog sabotage), the **field-validation gates** (stock int 0..999; the UI form drives only lawful values), and the **existence wall** |

The role walls live at the TOP of both actions (`requireAdmin()` →
`getCurrentUser()` + `role !== "admin"`); `grep "Admin access required"
tests/` returns ZERO hits — the envelope is asserted nowhere. The page-level
`/admin` redirect (admin.spec.ts case 1) guards the RENDER, not the action
dispatch: the proxy is CSP-only (verified — no route guards in `src/proxy.ts`),
and the crafted-POST protocol (H-59 + F-RR) posts straight to the action
handler on any route whose manifest carries the id.

### 5.2 Wire-blindness (verified against the committed suite)

- `admin.spec.ts` (8 uniques): case 1 pins the /admin page redirect for
  customers; cases 2–6 drive the POSITIVE paths through the canonical admin
  storageState (the admin login bucket exactly consumed 10/10); F-HH pins
  the event mint (admin-positive); F-LL pins the KPI read (admin-positive).
  ZERO cases craft either action without an admin session.
- The action-seam security gate (H-59) probes the PDP route's FOUR action
  ids (cart/wishlist) — zero admin-action coverage.
- Every UI consumer renders through the admin session, so a dropped role
  wall changes nothing for any existing case: the harm is **server-truth
  only** (a customer's crafted POST writes rows no existing assertion
  reads).
- The F-DD/F-RR precedent closed the same wire-blind class for order
  details and the address book; the admin seam predates both (session-4)
  and its walls were never gated over the wire.

### 5.3 The attack surface is real (measured, not assumed)

- The `/admin/products` route manifest exposes **exactly 3 node ids**
  (`adjustCartItemAction`, `removeCartItemAction`, `adminUpdateProductAction`);
  the `/admin/orders` route manifest exposes **exactly 3**
  (`adjust`, `remove`, `adminUpdateOrderAction`) — both read first-hand from
  the built standalone; the actions are wire-addressable via the established
  crafted-POST protocol (`Next-Action: <id>` + the F-QQ multipart shape —
  both actions are `(_prev, formData)` useActionState forms, the SAME shape
  F-RR's saveAddress edit used: `_1_<field>` entries BEFORE the flight row
  `"0"` = `[null,"$K1"]`).
- The actions carry **NO rate limiter** (verified: no `rateLimit` in
  admin.ts) — the gate consumes zero limiter budget, needs no throwaway
  server, and no login (both sessions mint OFFLINE — the F-RR customer mint
  + the F-HH admin mint).
- `adminProductUpdateSchema`: productId min(1), stock **int 0..999**
  optional, isActive boolean optional. `adminOrderUpdateSchema`: orderId
  min(1), status **enum** (processing/in_transit/delivered/cancelled)
  optional, carrier ≤40, trackingNumber ≤60. The Zod probes: stock −1 /
  1000 / 1.5 / "abc" (NaN via `Number()`), status "banana".

### 5.4 Why this outranks the named og:image candidate

The og:image annotation is a served-metadata polish with a DOCUMENTED
deliberate design decision behind it (`product/[slug]/page.tsx:41` — remote
catalog URLs' dimensions "not statically known"; the root card's annotations
come from its file-convention PNG). F-SS is the **role wall on every admin
mutation** — the authz class the house style has gated at every seam since
F-DD, and the session-47 plan §12 item 14 names it as the next audit pass's
FIRST check. The source checks are CORRECT today (zero product defect); what
is missing is the GATE — a dropped wall rides through with every existing
case green (the silent-class definition).

## 6. Plan-probe discipline (run BEFORE the spec)

`scripts/plan-probe-session48.cjs` — the throwaway healthy-copy standalone
on :3209 (the F-PP/F-QQ/F-RR copyFile pattern; the admin actions need
working DB reads), wire-verifying every F-SS assumption:

1. the server BOOTS and LISTENS against the healthy throwaway copy
   (`/api/health` → 200 + `{"ok":true,"db":true}` — the spawn-works control);
2. both admin route manifests expose exactly 3 ids; the two admin actions
   identified by `exportedName` (the build-shape canary);
3. **the unauthenticated half**: cookie-less crafted POSTs to both actions
   answer `"Admin access required."` (200 envelopes, never 5xx);
4. **LB1 (the role walls)**: the minted CUSTOMER session (offline SQL mint
   on the COPY: a Session row with FUTURE expiry + the HMAC cookie contract)
   crafts a hostile product update (a real product id + stock=1) and a
   hostile order update (a real order id + status="delivered") — each
   answers `"Admin access required."` AND the target rows SURVIVE
   byte-identical (server-truth Prisma reads: product stock/isActive; order
   status/carrier/trackingNumber + the OrderEvent count unchanged);
5. **LB2 (the field/existence walls)**: the minted ADMIN session (offline
   mint on the COPY) crafts the invalid shapes — stock −1 / 1000 / 1.5 /
   "abc" → `"Check the highlighted fields."` + zero writes; status "banana"
   → the same envelope + zero writes; unknown productId → `"That piece no
   longer exists."`; unknown orderId → `"That order no longer exists."`;
6. **LB3 (the controls — the false-positive guards)**: the SAME admin
   session crafts a LAWFUL product update (a real product id + a
   run-unique stock) → `"ok":true` AND the write LANDS server-truth
   (restored in the probe's finally); the order action's control is the
   ZERO-WRITE lawful shape (the order's CURRENT status → the transaction
   writes nothing, zero events minted) → `"ok":true` — proving the mint
   works, the wire shape reaches the action, and the LB1/LB2 denials are
   the ROLE/ZOD walls, not a broken harness;
7. the finally SIGTERMs the child (SIGKILL escalation) and removes the
   tmpdir; per-request AbortController guards (the session-45 hardening
   lesson); zero writes to dev/e2e DBs (the copy dies with its tmpdir).

## 7. Remediation design (TDD)

NEW describe **"admin seam role walls + field gates (F-SS, session-48)"** at
the END of `tests/e2e/admin.spec.ts` (the OWNING spec — the admin seam's
own; the file's uniques 8 → 9).

- **ONE case, request-level** (no browser surface — the F-RR/F-PP/F-QQ
  shape; Node fetch with explicit Cookie headers, so the projects'
  storageState never rides the probes; the describe needs NO storageState):
  - `beforeAll` mints on `db/e2e.db` (the F-NN/F-RR/F-HH SQL-fixture
    pattern, idempotent delete-then-insert, per-worker suffix identity):
    (a) the CUSTOMER session for james (FUTURE expiry, +1 day) — zero
    logins; (b) the ADMIN session (random 256-bit token — the F-HH shape,
    same FUTURE expiry); (c) nothing else — the probe targets are CANONICAL
    rows resolved at RUNTIME (a real product by slug — `leather-crossbody-bag`,
    a product no other stock-writing spec touches: H-7 uses wide-brim-felt-hat,
    the checkout flows use silk-draped-evening-gown; a real order by its
    canonical number), their current values captured by dbRead (never
    hardcoded);
  - the manifest canary: the /admin/products manifest's exactly 3 ids with
    `adminUpdateProductAction` by exportedName; the /admin/orders
    manifest's exactly 3 ids with `adminUpdateOrderAction`;
  - the unauthenticated fail-closed half (the "Admin access required."
    envelope × both actions, cookie-less);
  - **LB1 (the role walls)**: the CUSTOMER session crafts both hostile
    shapes → each answers `"Admin access required."` + `"ok":false` AND the
    target rows survive byte-identical server-truth (product stock/isActive
    unchanged; order status/carrier/trackingNumber unchanged; the order's
    OrderEvent count unchanged);
  - **LB2 (the field/existence walls)**: the ADMIN session crafts the four
    invalid stock shapes + the invalid status shape → `"Check the
    highlighted fields."` + zero writes; the unknown ids → the two
    existence envelopes + zero writes;
  - **LB3 (the controls)**: the ADMIN session crafts the lawful product
    update (stock → the captured value's run-unique neighbor, within
    bounds) → `"ok":true` AND the DB reads the new stock (LOAD-BEARING —
    the write half; restored in the finally); the order action's
    CURRENT-status zero-write shape → `"ok":true` AND the OrderEvent count
    unchanged (the no-op proof);
  - `afterAll` cleans: the prefix-scoped DELETEs for both minted session
    rows (idempotent; global-setup's session wipe is the belt-and-braces);
    the product stock restore ALSO runs in the case's finally (the shared-DB
    discipline — the H-7 try/finally pattern).
- **ZERO logins, ZERO registers, ZERO limiter consumption (the admin
  actions carry none), ZERO writes to any row the gate did not mint or
  restore byte-identically.** The eight existing admin cases are untouched —
  unique labels, serial topology (workers: 1, fullyParallel: false — the
  mint window is quiescent).
- **Count ledger**: 142 → 143 unique cases; 282 → 284 passed + 2 skipped.
  The F-SS case-runs green on BOTH device projects (a request-level seam —
  no viewport dependence).

## 8. Mutation demos (the regression shapes, proven RED)

Each demo: drop ONE wall half, REBUILD, expect **all existing case-runs
GREEN** (the wire-blindness proof) while **exactly the 2 F-SS case-runs
fail**:

1. **adminUpdateProductAction's role wall dropped** (the `if (!admin)`
   return removed — the requireAdmin call kept, satisfying the unused-var
   gate; or the role check inverted) → the CUSTOMER's hostile craft answers
   a success/redirect stream and the product's stock CHANGES server-truth —
   the case fails at the role-wall envelope assertion.
2. **adminUpdateOrderAction's role wall dropped** → the CUSTOMER's hostile
   craft mints a forged `status_changed` event + flips the order status —
   the case fails at the order-role-wall envelope assertion.
3. **The stock bounds loosened** (`z.number().int()` — min/max dropped) →
   the ADMIN's stock=1000 craft passes Zod and writes — the case fails at
   the field-gate envelope assertion.

All restored via inverse edit (`git diff --stat src/` empty — byte-identical)
→ rebuild → green.

## 9. Validation of this plan against the codebase (pre-execution)

- `admin.ts` read first-hand: both role walls verbatim (requireAdmin →
  `getCurrentUser()` → `role !== "admin"` → "Admin access required.");
  Zod BEFORE the existence reads; the order action's no-op shape verified
  (status === order.status → no update; carrier/trackingNumber undefined →
  no tracking write; the transaction writes nothing);
  `adminProductUpdateSchema` / `adminOrderUpdateSchema` bounds read
  (validation.ts:108-119);
- Both admin route manifests read first-hand: exactly 3 ids each, the two
  admin actions present with `exportedName`s (the full 15-id census
  confirms no seam is skipped);
- The proxy read: CSP-only, no route guards — the action dispatch is
  transport-reachable (the F-RR /account precedent);
- The F-RR describe read first-hand (the postJsonAction/postFormAction
  helpers, the F-QQ multipart shape, the dbRead/sqlRun helpers, the
  per-worker suffix mint) — the harness templates;
- The F-HH describe read first-hand (the admin offline mint:
  `INSERT..SELECT` the admin's id by email, the HMAC cookie with the shared
  `E2E_AUTH_SECRET`, afterAll cleanup);
- The product-fixture map read: H-7 writes wide-brim-felt-hat's stock;
  checkout flows write silk-draped-evening-gown / wide-brim-felt-hat; F-LL's
  pins are slug-prefix-scoped and afterAll-deleted — `leather-crossbody-bag`
  is touched by NO stock-writing spec (seed orders read it only);
- `playwright.config.ts` re-read: `workers: 1` serial topology (the mint
  window is quiescent); request-level cases carry no viewport dependence;
- The port contract: the request-level probes post to the SUITE server on
  :3100 (no throwaway needed — the admin actions carry no limiter; the F-RR
  main-DB mint shape); the plan-probe uses :3209 (never :3100/:3211/:3212/
  :3213);
- Trap #13 honored: `process.cwd()`-based paths in the spec (the Playwright
  loader compiles TS as CJS; `import.meta` unavailable).

## 10. Round-43 parity census (the standing ritual)

**ENVIRONMENT: the live reference (Base44) answered HTTP 503 at the round's
start** (the sessions-44/45/46/47 outage, now the fifth consecutive round).
Handled per the honest-outage precedent: the census runs **CLONE-side ×2**
(43a on the post-restore build with `--shots`; 43b after the post-dev
rebuild), both viewports, against the round-38/39/40/41/42 clone-side ledger
(desktop 11085, mobile 11264, mainKids 11, footers 444/1189, the drawer's
`flex flex-col gap-5 mt-4` + gaps [20,20,20,20] — the v4 mobile-nav pin);
the reference-side fields CARRY BY DOCUMENTATION from the round-38 live
measurement; the WOMEN-inert posture re-check + the 2 ref screenshots stay
DEFERRED while the platform is down. The clone's mobile-menu behavior
verified end-to-end on the dev server (`rm -rf .next` first;
`env -u DATABASE_URL` boot; boot + probe + kill in ONE foreground command —
the sandbox kills detached process groups; the settle probe
`scripts/dev-nav-settle-session47.cjs` waits the URL explicitly). The
reference gets one final re-probe before the final gates; if it recovered
mid-round, the full two-sided sweep runs then.

## 11. Final gates + docs

- typecheck ✓ lint ✓ 173/173 unit ✓ build ✓ E2E **284 passed + 2 skipped**
  (143 unique × 2) — the 49th consecutive fully-green session.
- Screenshots refreshed (the sweep's clone shots + the dev-server set).
- Docs aligned: SKILL (§2 E2E row + F-SS; §11 command 143; Appendix B NEW
  session-48 row), README, CLAUDE.md, PAD, AGENTS.md, this plan's execution
  record, worklog, `docs/session_65.md`; `.env.example` unchanged and
  matching the codebase; stale-count sweep zero.
- One main-branch commit pushed via the SSH wrapper v3
  (`--remote git@github.com:nordeim/luxury-fashion-store.git`).

## Execution record

| # | Task | Result |
|---|---|---|
| 1 | Plan probe | ✅ `scripts/plan-probe-session48.cjs` — **8/8 checks passed** on the throwaway healthy-copy standalone on :3209: boot + `{"ok":true,"db":true}`; BOTH admin route manifests' exactly 3 ids with the two admin actions by exportedName; the canonical targets resolving at runtime (leather-crossbody-bag stock=12; ORD-2026-001 status=delivered, 3 events); the cookie-less probes answering the role wall; **LB1** the customer's hostile crafts denied with both rows byte-identical (stock 12→12, status delivered→delivered, events 3→3); **LB2** the 4 invalid stocks + the invalid status + the two unknown ids all denied, zero writes; **LB3** the admin's lawful product craft WRITING server-truth (12→77→restored 12) + the order's CURRENT-status zero-write shape answering ok with the event count unchanged; cleanup confirmed (minted rows deleted, tmpdir gone, zero dev/e2e-DB writes) |
| 2 | admin.spec.ts F-SS describe | ✅ NEW describe "admin seam role walls + field gates (F-SS, session-48)" at the END of `tests/e2e/admin.spec.ts` (the OWNING spec; the file's uniques 8 → 9), ONE request-level case (Node fetch + explicit Cookie headers — the projects' storageState never rides the probes): beforeAll mints BOTH sessions OFFLINE (james's customer session + the seeded admin's session — INSERT..SELECT by email, FUTURE expiry +1d, idempotent delete-then-insert, per-worker suffix); the ladder — the manifest canaries (both routes' exactly 3 ids; the two actions by exportedName) → the unauth fail-closed half → **LB1** (the customer's hostile crafts vs both actions — with a runtime-picked status that DIFFERS from the target's, so a dropped wall flips status AND mints a forged event: both envelope + zero-writes asserted server-truth) → **LB2** (the 4 bad stocks −1/1000/1.5/abc + the banana status + the two unknown ids — every envelope asserted, zero writes) → **LB3** (the admin's lawful stock craft WRITES server-truth; the order's CURRENT-status craft is the zero-write ok) → the final delta; the finally restores EVERY captured field (the product stock + the order status/carrier/trackingNumber + excess-event cleanup — the F-HH demo-hygiene contract, SQL-escaped); afterAll deletes both session rows. ZERO logins, ZERO registers, ZERO limiter consumption (the admin actions carry none), ZERO writes to any row the gate did not mint or restore byte-identically. typecheck ✓ eslint ✓; GREEN **20 passed** (9 uniques × 2 + 2 setups; F-SS ~2-3.4s on BOTH projects) |
| 3 | Mutation demo 1 (product role wall dropped) | ✅ adminUpdateProductAction's `if (!admin) return fail(...)` dropped (the requireAdmin call kept — typecheck-clean) → REBUILD → **all 18 existing case-runs GREEN on both projects** (the wire-blindness proof: the UI drives only the canonical admin session) while **exactly the 2 F-SS case-runs failed** at the cookie-less product probe's role-wall envelope assertion (line 807 — with the wall dropped even a GUEST's craft wrote stock=1; the finally restored it) → restored via inverse edit |
| 4 | Mutation demo 2 (order role wall dropped) | ✅ adminUpdateOrderAction's role wall dropped → REBUILD → all 18 existing GREEN while **exactly the 2 F-SS case-runs failed** at the order role-wall envelope ("order: the role wall fires first") with the product probes GREEN (the walls independently gated); the demo's forged writes (a flipped status + a minted event) restored by the case's hardened finally — the demo-hygiene contract working as designed → restored via inverse edit |
| 5 | Mutation demo 3 (stock bounds loosened) | ✅ adminProductUpdateSchema's stock `.min(0).max(999)` dropped → REBUILD → all 18 existing GREEN (the UI forms drive only lawful values — the field-gate wire-blindness proof) while **exactly the 2 F-SS case-runs failed** at the stock=−1 Zod-bounds assertion (line 856) with the role-wall halves GREEN (the three halves independently gated) → restored via inverse edit → `git diff --stat src/` EMPTY (byte-identical) → rebuild → **20/20 green** |
| 6 | Round-43 census + screenshots | ✅ **ENVIRONMENT: the reference (Base44) answered 503 at the round's start, across the census window, and at the final re-probe** (the sessions-44/45/46/47 outage unbroken — the FIFTH consecutive round). **CLONE-side ×2 (43a on the post-restore build + 43b on the post-dev-rebuild): ZERO DRIFT — byte-identical to the round-38/39/40/41/42 clone-side ledger in ALL census fields**: desktop pageH 11085 / mainKids 11 / footerH 444, mobile pageH 11264 / mainKids 11 / footerH 1189, the drawer char-identical (panelCls `w-80` + `flex flex-col gap-6` + navCls `flex flex-col gap-5 mt-4`, gaps [20,20,20,20]) — **the v4 mobile-nav pin holds** (the standing task re-check); clone console clean both censuses. The reference-side fields CARRY BY DOCUMENTATION from the round-38 live measurement; the WOMEN-inert posture re-check + the 2 ref screenshots stay DEFERRED (§12 item 14). **The clone's mobile-menu behavior verified end-to-end on the dev server** (`rm -rf .next` first; `env -u DATABASE_URL` boot; the sandbox's detached-process-group kill honored — boot + probe + kill in ONE foreground command): burger → drawer (dialog:1) → overflow hidden → **Women → `/shop?category=women` NAVIGATION LANDS (8 product cards rendered — the settle probe's explicit URL wait)** → menu closed → overflow restored → zero console/page errors. Screenshots: 11 refreshed (the census's 7 clone shots + the dev-server login set via `scripts/dev-shots-session39.cjs`: clone-login/cart/account/admin-dashboard — zero console errors); 8 of 11 byte-identical to the committed versions (deterministic rendering — itself a zero-drift signal); the 3 differing (clone-exclusive-deals, clone-mobile-home, clone-mobile-menu-open) are the documented timing-dependent class (live countdown ticks / hero carousel — every geometry pin byte-stable); the dev cart's row cleaned via `scripts/dev-hygiene-session46.cjs`, canonical 4/12/2/4 re-verified |
| 7 | Final gates on the final tree | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **284 passed + 2 skipped** (143 unique × 2 − 2 desktop-only skips; 6.7m) — the FORTY-NINTH consecutive fully-green session, exactly the §7 count ledger (142→143 unique, 282→284 passed); the F-SS case-runs green on BOTH device projects (~2-3.4s each) |
| 8 | Docs alignment + stale-count sweep | ✅ SKILL v1.41.0 (frontmatter 284/143 + F-SS; §2 E2E row + F-SS; §11 command 143; Appendix B NEW session-48 row with the playwright-browser-install environment note), README (badge 173+284, the Testing architecture row's F-SS pin + 143, the Testing command block 143, the status row's F-SS entry + 143), CLAUDE.md (gate line 143 + the F-RR→F-SS chain + the NEW F-SS segment + commands 143), PAD (test table 18\|143\|284, §7.3 command 143, the coverage-map session-48 extension), AGENTS.md (the security line's F-SS gate + the E2E command row 143), docs/remediation-plan-session48.md (this record), scripts/plan-probe-session48.cjs (the round's probe artifact). `.env.example` unchanged and matching the codebase (DATABASE_URL file:../db/custom.db). Stale-count sweep over the five living docs: zero stale counts (the one remaining `142` is header.tsx's line-count in PAD's key-files table) |

## 12. Residual risks / next steps (post-F-SS)

1. With F-SS every mutation seam's authz wall owns a gate; the residual
   ledger's next named candidates return to the documentation/infrastructure
   class: the PDP og:image annotation / og:type union / `style-src
   'unsafe-inline'` exceptions (carried since 26 — now the FIRST named
   candidate again).
2. Real PSP behind the checkout seam (carried).
3. Dev-toolchain npm-audit findings (all dev-only) — carried.
4. The merge's H-29 transaction-atomicity half stays source-read-only
   (wire fault-injection into a SQLite tx is not Playwright-reachable;
   carried).
5. The success gate's foreign-owner row stays covered-by-shape (carried).
6. The cart/wishlist sweeper-anchor touch writes (cart.ts:39/41) stay
   source-read-only (carried).
7. The zero-drift streak is a streak, not a guarantee — the census ritual
   stays mandatory.
8. security.txt `Expires` (2027-11-01) renewal cadence (carried).
9. `NewsletterSubscriber` stays outside global-setup's wipe list (carried).
10. The sandbox kills detached process groups — long gates in the
    foreground (carried, honored again this round).
11. **A fresh sandbox needs `npx playwright install chromium` before the
    first E2E run** (this round's new environment lesson — the browser
    cache is not part of the repo or npm's tree).
12. `rm -rf .next` before `npm run dev` after build-heavy rounds, then
    rebuild before re-running the sweep (the session-39/40 lessons).
13. The F-OO/F-PP/F-QQ throwaway-server harnesses spawn a child process
    per case-run — amortization candidate (carried).
14. The reference platform's 503 outage (Base44 — down through sessions
    44/45/46/47/48 census windows) keeps the two-sided census's reference
    half, the WOMEN-inert posture re-check, and the 2 ref screenshots
    DEFERRED; the NEXT round re-runs the full two-sided sweep FIRST THING
    if the platform recovered (carried forward).
