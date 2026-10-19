# Remediation Plan — Session 46 (F-QQ: the checkout limiter floor — the wire-measured fetch-action dispatch on a throwaway healthy-DB server)

The session-45 continuation round. Per the standing precedent: audit the pulled
HEAD (`b96f130` — the parallel thread's session-log commit), re-verify the
baseline, re-probe the reference platform FIRST THING (§11 item 14), run the
fresh audit pass, then close the strongest finding with a TDD gate.

## 1. Starting state

- NO workspace reset this round — the standing tree was intact (node_modules,
  the canonical 3-line `.env` with `DATABASE_URL="file:../db/custom.db"`,
  `db/custom.db` + `db/e2e.db` materialized, the built standalone). `git pull`
  fast-forwarded `53d3832 → b96f130` (docs-only).
- HEAD `b96f130` = remote `main`, verified up to date.
- The committed tree's contract: 173 unit (19 files) · 140 unique E2E × 2
  device projects − 2 desktop-only skips = **278 passed + 2 skipped** ·
  typecheck ✓ lint ✓ build ✓.

## 2. Audit of `b96f130` (the pulled HEAD) — first-hand

`git show --stat b96f130` → 1 file, +90: `docs/session_60.md` only — the
parallel thread's raw narration transcript of the SAME session-45 round (the
F-PP gate + the round-40 census + the five-docs alignment); its ledger matches
`53d3832`'s actual work (test-only, zero `src/`, the F-PP describe + the probe
script + 11 screenshots + SKILL v1.38.0). Docs-only, RETAINED (never overwrite
another thread's log). This round's narration ships as `docs/session_61.md`
(session_60.md taken by the pulled commit).

## 3. Reference platform re-probe (§11 item 14 — FIRST THING)

The live reference (Base44) answered **HTTP 503 on both `/` and `/login`** at
the round's start — the same outage sessions 44 AND 45 documented (now the
THIRD consecutive round). Handled per the honest-outage precedent (§9): the
census runs clone-side ×2; the reference-side fields carry by documentation
from the round-38 live measurement; the WOMEN-inert posture re-check + the 2
ref screenshots stay DEFERRED; one final re-probe before the final gates.

## 4. Baseline re-verification (the standing tree)

- typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build + assemble ✓
- E2E **278 passed + 2 skipped** (140 unique × 2; 6.4m) — the 46th
  consecutive session fully green at baseline, exactly matching session-45's
  final gates.
- The standing Tailwind v4 / mobile-nav pins re-verified first-hand during the
  audit: the drawer's `flex flex-col gap-5 mt-4` at mobile-nav.tsx:76 + the
  `w-80` panel (:59); 26 full `hsl()` literals in globals.css `@theme`;
  every `space-y` grep hit in store components is COMMENT documentation
  (the trap pins), zero live usage on parity surfaces.

## 5. Fresh audit pass — the round's finding

The session-45 plan §11 named this round's candidate directly: item 3 —
"the checkout limiter floor (`checkout:${ip}`, 10/10min) stays unpinned — the
same throwaway harness closes it, but each burst post needs a full checkout
payload + a valid cart; candidate for a future round (carried, now with the
harness precedent two rounds deep)."

**F-QQ — the checkout seam's limiter floor.** The third and last mutation
seam on `placeOrderAction` that no gate reads:

| Seam | The floor (src/lib/actions/checkout.ts) | The ungated shape |
|---|---|---|
| `placeOrderAction:66-70` | `rateLimit(`checkout:${clientIpFrom(hdrs)}`, 10, 10min)` → the 11th same-IP attempt answers `fail("Too many attempts. Try again in N seconds.")` | the `if (!limiter.allowed)` block dropped → an order-spam burst rides through to the cart lookup with every existing gate green |

**Wire-blindness (verified against the committed suite):** the documented
checkout limiter budget is 8 < 10 per run (the suite's own header note:
6 existing + F-MM's 2) — every existing placeOrderAction consume is lawful
and far under the floor. A dropped limiter block keeps every gate green while
the abuse guard (order spam / resource exhaustion through the transactional
seam) silently disappears — the same silent-abuse class F-OO closed for
`/api/search` and F-PP closed for the auth actions.

### 5.1 Two plan-level refinements (first-hand code reading vs the §11 note)

1. **No valid cart is needed.** The limiter fires at checkout.ts:67 BEFORE
   `findCart` (:73), and `findCart` for a cart-less guest returns `null`
   (cart.ts:65-73 — a pure read, no creation) → `fail("Your bag is empty.")`
   (:74). So a cart-less COD burst consumes the bucket on every iteration
   (1..10 lawful "Your bag is empty." envelopes, zero writes) and the 11th
   answers the floor — **zero DB writes, zero fixtures, zero cleanup, on the
   throwaway copy.** The §11 "needs a valid cart" assumption is refuted by
   the source order; the floor is the same code path either way (the block
   sits before the cart lookup).
2. **The wire shape is the fetch-action dispatch, not the F-PP no-JS form.**
   CheckoutFlow renders NO `<form action>` (checkout-flow.tsx dispatches
   programmatically via `startTransition(() => formAction(fd))`), so the
   F-PP-measured SSR'd `$ACTION_REF_1` binding does not exist on /checkout —
   and the cartless /checkout page REDIRECTS to /cart at render time
   (page.tsx:12), which would swallow the MPA response's re-render. The
   correct invocation is the JS-path fetch-action wire format, derived
   first-hand from the compiled Next 16 + React 19 sources and measured by
   this round's probe:
   - `POST /checkout` + header `Next-Action: <placeOrderId>` + multipart body
   - field `"0"` = the flight-serialized args `[null,"$K1"]` (the prev-state
     null + the FormData reference; `nextPartId` starts at 1 in
     `processReply`)
   - fields `"_1_<formField>"` = the checkout FormData entries (the `$K1`
     prefix rule: `"" + "_" + 1 + "_"`, reassembled server-side by the
     flight `case "K"` decoder) — **and the `_1_*` fields MUST precede
     field `"0"` in the multipart body** (the probe's measured order rule:
     the server's ordered referencedEntries walk breaks at the first
     non-matching key, and the real client's encodeReply appends the
     entries during the model walk, setting the flight row LAST)
   - the server resolves the action id via `serverModuleMap` (the manifest —
     the checkout page's manifest lists exactly THREE ids:
     `adjustCartItemAction`, `removeCartItemAction`, `placeOrderAction`),
     decodes the args, invokes `placeOrderAction(null, formData)`, and the
     response is the flight stream carrying the ActionResult — the envelope
     assertable in the body bytes (`"ok":false` + the message copy), the
     exact shape the action-seam gate already pins for the PDP's JSON-arg
     actions.

### 5.2 The per-IP control (the TRUST_PROXY twist)

`clientIpFrom` (rate-limit.ts:53-66) honors the FIRST `x-forwarded-for` hop
only when `TRUST_PROXY=1` — the documented H-35 contract. Spawning the
throwaway with `TRUST_PROXY=1` gives the gate exact per-IP bucket control:
the burst rides IP-A's header while ONE control post rides IP-B's — IP-B
answers the lawful envelope (NOT the floor), pinning the per-IP key shape
(`checkout:${ip}`, not a global lockout) over the wire. This is coverage no
existing gate reads: a mutation collapsing the key to a constant would pass
every existing gate.

### 5.3 Why this was carried

Tripping the floor on the MAIN suite server would poison `checkout:local`
for 10 minutes — and the suite's own checkout consumes (8 per run, serial
topology) would floor mid-run. The F-OO/F-PP process-isolation insight
dissolves it: **a throwaway standalone gets its own module-scope `buckets`
Map** (per-process state), so a burst on the throwaway consumes nothing on
`:3100`.

**The F-QQ twist vs F-PP:** the throwaway spawns against a healthy COPY of
`db/e2e.db` (the F-PP copyFile + absolute-URL pattern — the checkout action
needs working DB reads for findCart; the copy is tmpdir-scoped and deleted in
the finally; zero main-DB writes), WITH `TRUST_PROXY=1` for the per-IP
control.

HIGH-value coverage class (the last un-gated abuse floor in the action seams —
brute-force order-spam through the transactional seam), zero product defect
today (the floor is correct in source; nothing asserts it).

## 6. Plan-probe discipline (run BEFORE the spec)

`scripts/plan-probe-session46.cjs` — the throwaway healthy-copy standalone on
:3213 with `TRUST_PROXY=1`, wire-verifying every F-QQ assumption:

1. the server BOOTS and LISTENS against the healthy throwaway copy
   (`/api/health` → 200 + `{"ok":true,"db":true}` — the spawn-works control);
2. the checkout page manifest exposes exactly THREE action ids (40+ hex each),
   exactly one `placeOrderAction` from `src/lib/actions/checkout.ts`
   (the build-shape canary);
3. **THE WIRE SHAPE** (the round's protocol discovery candidate): the crafted
   fetch-action POST — `Next-Action: <placeOrderId>` + field `"0"` =
   `[null,"$K1"]` + the `_1_*` checkout fields (COD payload, valid per
   checkoutSchema) → 200 + the flight body carrying `"ok":false` +
   "Your bag is empty." (the cart-less envelope; the probe doubles as burst
   iteration 1). If the crafted shape fails, the probe falls back to
   capturing the REAL dispatch's wire bytes by driving the wizard in a real
   browser against the throwaway — the ground-truth discipline;
4. the fail-closed sweep: the sibling ids (adjust/remove) answer their own
   envelopes on garbage line ids ("That bag line no longer exists."), never
   5xx, never a floor (their payloads never reach the checkout bucket);
5. **LB (the floor)**: IP-A iterations 2..10 → all "Your bag is empty." (the
   lawful window — the floor must not fire early), the 11th → the floor
   envelope with a bounded retry-seconds value (1..600 — the 10-min window);
6. **the per-IP control**: IP-B's single post → "Your bag is empty." (NOT
   floored — the per-IP key shape);
7. zero writes: the throwaway copy's Order / CartItem / User counts unchanged
   after the whole ladder (read through Prisma, delta-form);
8. the finally SIGTERMs the child (SIGKILL escalation) and removes the
   tmpdir; per-request AbortController guards (the session-45 hardening
   lesson — the harness can never hang).

## 7. Remediation design (TDD)

NEW describe **"checkout limiter floor (F-QQ, session-46)"** at the END of
`tests/e2e/cart-checkout.spec.ts` (the OWNING spec — the checkout seam's own;
the F-CC/F-FF/F-MM chain lives there; the file's uniques 14 → 15).

- **ONE case**, request-level (no browser surface — the F-PP/F-OO shape):
  copy `db/e2e.db` to a tmpdir; spawn the throwaway standalone
  (`node .next/standalone/server.js`, `PORT=3213`, `NODE_ENV=production`,
  `AUTH_SECRET=E2E_AUTH_SECRET`, `TRUST_PROXY=1`, `DATABASE_URL` = the
  absolute throwaway copy URL) inside a try/finally; poll `/api/health`;
  then the LOAD-BEARING assertion ladder:
  - the manifest canary (exactly 3 ids; the placeOrderAction id identified
    by `exportedName` — the build-shape canary);
  - the wire-shape probe (iteration 1): the crafted fetch-action POST answers
    the cart-less envelope (wire-real discrimination of the action);
  - the fail-closed sweep over the sibling ids (their own envelopes, never
    5xx);
  - **LB1 (the floor)**: IP-A iterations 2..10 → the lawful envelope, NOT
    floored; the 11th → the floor envelope, retry seconds bounded 1..600;
  - **LB2 (the per-IP key)**: IP-B's control post → the lawful envelope, NOT
    floored;
  - the zero-writes delta (Order/CartItem/User counts unchanged on the copy);
  - the finally SIGTERMs the child and removes the tmpdir.
- **ZERO logins, ZERO registers, ZERO main-server limiter consumption, ZERO
  DB writes anywhere** (the burst carries no cookies — findCart reads null;
  the copy is deleted; the main e2e.db is read once at copyFileSync).
- **Count ledger**: 140 → 141 unique cases; 278 → 280 passed + 2 skipped.
  The F-QQ case-runs green on BOTH device projects (a request-level seam —
  no viewport dependence). Port 3213 (distinct from :3100, F-OO's :3211,
  F-PP's :3212; workers:1 serial topology keeps the copy quiescent).

## 8. Mutation demos (the regression shapes, proven RED)

1. **The checkout limiter-drop**: the `if (!limiter.allowed) { … }` block
   deleted from `placeOrderAction` → REBUILD → the 11th burst post rides
   through to findCart and answers "Your bag is empty." — all existing
   case-runs GREEN (every existing checkout consume is lawful « 10) while
   exactly the 2 F-QQ case-runs fail at LB1's floor assertion.
2. **The per-IP key collapse** (the LB2 half): `clientIpFrom(hdrs)` replaced
   by the constant `"local"` inside placeOrderAction → REBUILD → IP-B's
   control post answers the FLOOR (the burst poisoned the global bucket) —
   exactly the 2 F-QQ case-runs fail at LB2 while every existing gate stays
   green (the suite runs without TRUST_PROXY — every existing consume is
   `checkout:local` either way).

All restored via inverse edit (`git diff --stat src/` empty — byte-identical)
→ rebuild → green.

## 9. Validation of this plan against the codebase (pre-execution)

- `checkout.ts` read first-hand: the limiter ordering (Zod → card checks →
  `headers()` → `rateLimit` → the floor check → `getCurrentUser` → `findCart`)
  — the cart-less COD burst composes with zero writes; the floor copy;
  `placeOnce`'s transaction never reached.
- `cart.ts:65-73` read first-hand: `findCart` is a pure read (null for a
  cart-less guest — no row creation).
- `checkout-flow.tsx` read first-hand: NO `<form action>` element — the
  programmatic `startTransition(() => formAction(fd))` dispatch; the field
  names (email, fullName, street, city, state, zip, country, paymentMethod,
  cardNumber/cardExpiry/cardCvc for card only).
- `page.tsx` (checkout route) read first-hand: the cart-less redirect at
  render (:12) — the fetch-action path's flight response sidesteps the
  page re-render for the envelope (the actionResult streams in the body).
- `validation.ts` checked: the COD payload (email + the 6 address fields +
  `paymentMethod: "cod"`) passes `checkoutSchema` and skips the card branch.
- The Next 16 compiled sources read first-hand (the wire-shape derivation):
  `server-action-request-meta.js` (the `Next-Action` header detection —
  `isFetchAction`), `action-handler.js` (the fetch+multipart branch:
  `decodeReplyFromBusboy` → the args; the CSRF origin check passes crafted
  requests with a warning), the react-server-dom-webpack client encoder
  (`nextPartId` starts at 1; the FormData arg → `"$K1"` + `"_1_"`-prefixed
  fields) and the server `case "K"` decoder (the `_1_` prefix reassembly).
- The checkout page manifest read first-hand: exactly THREE ids, exactly one
  `placeOrderAction` (filename `src/lib/actions/checkout.ts`).
- `rate-limit.ts` read first-hand: the module-scope `buckets` Map
  (per-process state); `clientIpFrom` honors the first XFF hop only under
  `TRUST_PROXY=1` (the per-IP control mechanism).
- `playwright.config.ts` read first-hand: `workers: 1, fullyParallel: false`
  (the serial topology — the suite DB is quiescent at copy time); the
  webServer env shape mirrored by the throwaway spawn.
- `cart-checkout.spec.ts` read first-hand: 14 uniques counted; the F-PP
  describe's spawn/poll/kill harness (auth.spec.ts:765-987) mirrored.
- Trap #13 honored: `process.cwd()`-based paths in the spec (the Playwright
  loader compiles TS as CJS; `import.meta` unavailable).
- The standalone exists post-`npm run build` (the E2E suite's own
  prerequisite — the throwaway spawns the same artifact).

## 10. Round-41 parity census (the standing ritual)

**ENVIRONMENT: the live reference (Base44) answered HTTP 503 at the round's
start** (the sessions-44/45 outage, now the third consecutive round). Handled
per the honest-outage precedent: the census runs **CLONE-side ×2** (41a on the
post-restore build with `--shots`; 41b after the post-dev rebuild), both
viewports, against the round-38/39/40 clone-side ledger (desktop 11085,
mobile 11264, mainKids 11, footers 444/1189, the drawer's `flex flex-col
gap-5 mt-4` + gaps [20,20,20,20] — the v4 mobile-nav pin); the
reference-side fields CARRY BY DOCUMENTATION from the round-38 live
measurement; the WOMEN-inert posture re-check + the 2 ref screenshots stay
DEFERRED while the platform is down. The clone's mobile-menu behavior
verified end-to-end on the dev server (`rm -rf .next` first;
`env -u DATABASE_URL` boot — the session-39/40 lessons). The reference gets
one final re-probe before the final gates; if it recovered mid-round, the
full two-sided sweep runs then.

## 11. Final gates + docs

- typecheck ✓ lint ✓ 173/173 unit ✓ build ✓ E2E **280 passed + 2 skipped**
  (141 unique × 2) — the 47th consecutive fully-green session.
- Screenshots refreshed (the sweep's clone shots + the dev-server set).
- Docs aligned: SKILL (§2 E2E row + F-QQ; §11 141; Appendix B NEW session-46
  row with the measured fetch-action wire-shape note), README, CLAUDE.md,
  PAD, AGENTS.md, this plan's execution record, worklog,
  `docs/session_61.md`; `.env.example` unchanged and matching the codebase;
  stale-count sweep zero.
- One main-branch commit pushed via the SSH wrapper v3
  (`--remote git@github.com:nordeim/luxury-fashion-store.git`).

## Execution record

| # | Task | Result |
|---|---|---|
| 1 | Plan probe | ✅ `scripts/plan-probe-session46.cjs` — **11/11 checks passed** on the throwaway healthy-copy standalone on :3209 (TRUST_PROXY=1): boots + `{"ok":true,"db":true}`; the checkout manifest's exactly 3 ids with exactly one placeOrderAction; **THE WIRE SHAPE measured first-hand** — the crafted fetch-action POST (Next-Action header + field "0" `[null,"$K1"]` + `_1_*` form fields) invokes placeOrderAction with the cart-less envelope in the flight body (the probe's OWN first run caught a load-bearing ORDER fact: the real client's encodeReply appends the FormData entries DURING the model walk and sets the flight row "0" LAST — the server's `case "K"` reassembly walks referencedEntries IN ORDER and breaks at the first non-matching key, so the `_1_*` fields MUST precede field "0" in the multipart body; the wrong order answered the Zod-null envelope); no Set-Cookie on the burst; both siblings fail-closed on garbage line ids; IP-A iterations 2..10 lawful + the 11th → "Too many attempts. Try again in 600 seconds" (N bounded 1..600); IP-B's control post NOT floored (the per-IP key shape over the wire); zero writes (order 4→4, cartItem 0→0, user 2→2). Zero dev-DB writes, zero e2e.db writes |
| 2 | cart-checkout.spec.ts describe | ✅ NEW describe "checkout limiter floor (F-QQ, session-46)" at the END of `tests/e2e/cart-checkout.spec.ts` (the file's uniques 14 → 15), ONE request-level case spawning the throwaway healthy-copy standalone on :3213 (a tmpdir COPY of db/e2e.db; TRUST_PROXY=1 for the per-IP control) — the measured fetch-action wire shape (Next-Action header + `_1_*` fields BEFORE the flight row `"0"` = `[null,"$K1"]`): the manifest canary (exactly 3 ids; exactly one placeOrderAction by exportedName) → the wire-shape probe (burst iteration 1: 200 + the cart-less envelope + no Set-Cookie) → the sibling fail-closed sweep (both answer the cart-line envelope on garbage ids) → **LOAD-BEARING 1** (IP-A iterations 2..10 lawful + not-floored, the 11th → the floor envelope with bounded retry seconds 1..600) → **LOAD-BEARING 2** (IP-B's control post NOT floored — the per-IP key shape) → the zero-writes delta (order/cartItem/user counts unchanged on the copy); the finally SIGTERMs the child (SIGKILL escalation) and removes the tmpdir. ZERO logins, ZERO registers, ZERO main-server limiter consumption, ZERO DB writes. typecheck ✓ eslint ✓; GREEN **32 passed** (15 uniques × 2 + 2 setups; 59s; F-QQ ~1.1s on BOTH projects) |
| 3 | Mutation demo 1 (checkout limiter-drop) | ✅ the `if (!limiter.allowed) { … }` block replaced by a bare `limiter.allowed;` expression (the floor check dropped) → REBUILD → **all 30 existing case-runs GREEN** (every existing checkout consume is lawful « 10 — the wire-blindness proof) while **exactly the 2 F-QQ case-runs failed** at LOAD-BEARING 1 ("the 11th same-IP checkout answers the floor envelope" — Received: null; the 11th answered the cart-less envelope instead) → restored via inverse edit |
| 4 | Mutation demo 2 (per-IP key collapse) | ✅ the key expression `clientIpFrom(hdrs)` collapsed to `clientIpFrom(hdrs) && "local"` (every caller keys ONE bucket — the typecheck-clean collapse shape; the naive constant form dies TS6133 on the now-unused import, the strict-mode gate doing its job) → REBUILD → **the 30 existing runs GREEN** (the suite runs without TRUST_PROXY — every existing consume keys `checkout:local` either way) while **exactly the 2 F-QQ case-runs failed** at LOAD-BEARING 2 ("a different IP is not floored" — IP-B answered "Too many attempts. Try again in 600 seconds."; LB1 stayed green — the halves are independently gated) → restored via inverse edit → `git diff --stat src/` empty (byte-identical) → rebuild → **32/32 green**. The checkout seam's floor and its per-IP key shape each own a gate half |
| 5 | Round-41 census + screenshots | ✅ **ENVIRONMENT: the reference (Base44) answered 503 at the round's start, across the census window, and at the final re-probe** (the sessions-44/45 outage unbroken — the third consecutive round; three probe rounds + one final re-probe). **CLONE-side ×2 (41a on the post-restore build + 41b on the post-dev-rebuild): ZERO DRIFT — byte-identical to the round-38/39/40 clone-side ledger in ALL census fields**: desktop pageH 11085, mobile pageH 11264, mainKids 11 both viewports, footers 444 (desktop) / 1189 (mobile), the drawer char-identical (panelCls `fixed left-0 top-0 h-full w-80 bg-background z-50 p-8 flex flex-col gap-6` + navCls `flex flex-col gap-5 mt-4`, gaps [20,20,20,20]) — **the v4 mobile-nav pin holds** (the standing task re-check); clone console clean both censuses. The reference-side fields CARRY BY DOCUMENTATION from the round-38 live measurement; the WOMEN-inert posture re-check + the 2 ref screenshots stay DEFERRED (§12 item 14). The clone's mobile-menu behavior verified end-to-end on the dev server through real Playwright (`scripts/dev-hydration-probe-session38.cjs`, `rm -rf .next` first per the session-39 lesson; `env -u DATABASE_URL` boot): burger visible → drawer opens (dialog:1) → overflow hidden → Women → `/shop?category=women` → menu closed → overflow restored → zero console/page errors (no cold-compile race this round — the click landed warm). Screenshots: 11 refreshed (the census's 7 clone shots + the dev-server set via `scripts/dev-shots-session39.cjs`: clone-login, clone-cart, clone-account, clone-admin-dashboard — zero console errors); 9 of 11 byte-identical to the committed versions (deterministic rendering — itself a zero-drift signal); the 2 differing (clone-mobile-home, clone-mobile-menu-open) are the documented timing-dependent class (the hero carousel mid-advance / the live countdown caught at different ticks — hash-verified unstable ACROSS RUNS while every geometry pin stays byte-stable); the dev cart's row cleaned after the shot (`scripts/dev-hygiene-session46.cjs`), canonical 4/12/2/4 re-verified by direct Prisma count |
| 6 | Final gates on the final tree | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **280 passed + 2 skipped** (141 unique × 2 − 2 desktop-only skips; 6.4m) — the FORTY-SEVENTH consecutive fully-green session, exactly the §7 count ledger (140→141 unique, 278→280 passed); the F-QQ case-runs green on BOTH device projects (~1.1s each) |
| 7 | Docs alignment + stale-count sweep | ✅ SKILL v1.39.0 (frontmatter 280/141 + the F-QQ gate; §2 E2E row + F-QQ; §11 command 141; Appendix B NEW session-46 row with the measured wire-order note); README (badge 173+280, the Testing architecture row's F-QQ pin + 141, the Testing command block 141, the status row's F-QQ entry + 141); CLAUDE.md (gate line 141 + the F-PP→F-QQ chain + the NEW F-QQ segment + commands 141); PAD (test table 18\|141\|280, §7.3 command 141, the coverage-map session-46 extension); AGENTS.md (the security line's F-QQ gate + the E2E command row 141); docs/remediation-plan-session46.md (this record); scripts/plan-probe-session46.cjs (the round's probe artifact); scripts/dev-hygiene-session46.cjs (the dev-DB hygiene helper). `.env.example` unchanged and matching the codebase. Stale-count sweep over the five living docs: zero stale counts |

## 12. Residual risks / next steps (post-F-QQ)

1. The merge's H-29 transaction-atomicity half stays source-read-only
   (wire fault-injection into a SQLite tx is not Playwright-reachable;
   carried).
2. The success gate's foreign-owner row stays covered-by-shape (carried).
3. With F-QQ, every rate-limited mutation seam (login/register/checkout/
   newsletter/search) owns a gate; the residual ledger's limiter chapter
   CLOSES — the next named candidates shift to the carried documentation/
   infrastructure items (the PDP og:image annotation, the real PSP,
   npm-audit dev-only findings, security.txt renewal).
4. The PDP og:image annotation / og:type union / `style-src 'unsafe-inline'`
   exceptions (carried, sessions 26–45).
5. Real PSP behind the checkout seam (carried).
6. Dev-toolchain npm-audit findings (11, all dev-only) — carried.
7. The cart/wishlist sweeper-anchor touch writes (cart.ts:39/41) stay
   source-read-only (carried).
8. The zero-drift streak is a streak, not a guarantee — the census ritual
   stays mandatory.
9. security.txt `Expires` (2027-11-01) renewal cadence (carried).
10. `NewsletterSubscriber` stays outside global-setup's wipe list
    (carried).
11. The sandbox kills detached process groups — long gates in the
    foreground (carried, honored again this round).
12. `rm -rf .next` before `npm run dev` after build-heavy rounds, then
    rebuild before re-running the sweep (the session-39/40 lessons,
    honored again this round).
13. The F-OO/F-PP/F-QQ throwaway-server harnesses spawn a child process
    per case-run (6 per full suite run now, ~2s boot each) — if a future
    round adds more throwaway-server cases, consider a describe-scoped
    beforeAll spawn to amortize (carried).
14. The reference platform's 503 outage (Base44 — down through sessions
    44/45/46 census windows) keeps the two-sided census's reference half,
    the WOMEN-inert posture re-check, and the 2 ref screenshots DEFERRED;
    the NEXT round re-runs the full two-sided sweep FIRST THING if the
    platform recovered (carried forward).
