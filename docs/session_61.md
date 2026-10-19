# Session 61 — the session-46 round (F-QQ: the checkout limiter floor — the wire-measured fetch-action dispatch, a throwaway healthy-DB server with per-IP bucket control)

Resuming with the **Session 45 task book** (the user's latest directive —
session_59/remediation-plan-session45/session_60 reviewed, the session
numbers advanced by the parallel thread's logs). Per the standing precedent,
my round = the session-45 continuation auditing `b96f130` (the parallel
thread's session-log commit — docs-only) plus a full re-verification of the
committed tree. NO workspace reset this round — the standing tree was
intact (node_modules, the canonical `.env`, both DB files, the built
standalone); `git pull` fast-forwarded `53d3832 → b96f130`.

**Step 1: Workspace refresh + audit of the pulled HEAD**

`git show --stat b96f130` → 1 file, +90: `docs/session_60.md` only — the
parallel thread's raw narration transcript of the SAME session-45 round; its
ledger matches `53d3832`'s actual work (test-only, zero `src/`, the F-PP
describe + the probe script + 11 screenshots + SKILL v1.38.0 + the five-docs
alignment). Docs-only, RETAINED. This round's narration ships as
`docs/session_61.md` (session_60.md taken).

**Step 2: The reference re-probe — FIRST THING (§11 item 14 of the
session-45 plan)**

The live reference (Base44) answered **HTTP 503 on both `/` and `/login`**
at the round's start — the sessions-44/45 outage, now the THIRD consecutive
round. Re-probed at the census window and once more before the final gates:
**STILL 503** — handled per the honest-outage precedent (the census runs
clone-side ×2; the reference-side fields carry by documentation from the
round-38 live measurement; the WOMEN-inert posture re-check + the 2 ref
screenshots stay deferred; §12 item 14 carried forward).

**Step 3: Baseline gates — re-proven on the standing tree**

typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build + assemble ✓ E2E
**278 passed + 2 skipped** (140 unique × 2; 6.4m) — the 46th consecutive
session fully green at baseline, exactly matching session-45's final gates.
The standing Tailwind v4 / mobile-nav pins re-verified first-hand during
the audit (mobile-nav.tsx:76 `flex flex-col gap-5 mt-4`, the `w-80` panel
at :59, 26 full `hsl()` literals in globals.css `@theme`, every `space-y`
grep hit in store components COMMENT documentation — zero live usage on
parity surfaces).

**Step 4: Fresh audit pass — the round's finding, with TWO plan-level
refinements**

The session-45 plan §11 named this round's candidate directly: item 3 —
the checkout limiter floor ("each burst post needs a full checkout payload
+ a valid cart"). **F-QQ — `placeOrderAction`'s
`rateLimit("checkout:"+ip, 10, 10min)` (checkout.ts:66-70)**, the last
un-gated abuse floor in the action seams: the 11th same-IP attempt must
answer `fail("Too many attempts. Try again in N seconds.")`; wire-blind
since the limiter's introduction (the suite's documented checkout budget
is 8 < 10 — a dropped `if (!limiter.allowed)` block rides an order-spam
burst through with all gates green).

First-hand source reading refuted the §11 note's assumption and named the
real wire shape:

1. **NO valid cart is needed.** The limiter fires at :67 BEFORE `findCart`
   (:73), and a cart-less guest's `findCart` returns null (a pure read —
   no creation; cart.ts:65-73) → `fail("Your bag is empty.")`. The whole
   burst is **zero-write**: iterations 1..10 answer the cart-less envelope,
   the 11th answers the floor.
2. **The wire shape is the JS-path FETCH-ACTION dispatch, not the F-PP
   no-JS form.** CheckoutFlow renders NO `<form action>` (the dispatch is
   programmatic — `startTransition(() => formAction(fd))`), and the
   cart-less /checkout page REDIRECTS to /cart at render (page.tsx:12),
   which would swallow the MPA re-render. The correct invocation — derived
   from the compiled Next 16 (`server-action-request-meta.js`,
   `action-handler.js`) + React 19 (the flight client/server encoders)
   and measured by the probe: `POST /checkout` + `Next-Action:
   <placeOrderId>` header + multipart body carrying field `"0"` =
   `[null,"$K1"]` (the flight-serialized args) and the `_1_<formField>`
   entries — the flight `case "K"` decoder reassembles the FormData and
   invokes `placeOrderAction(null, formData)`; the response is the flight
   stream carrying the ActionResult (the envelope assertable in the body
   bytes, the action-seam gate's shape).

The per-IP control design: spawn the throwaway with **`TRUST_PROXY=1`**
(`clientIpFrom` honors the first X-Forwarded-For hop — the H-35 contract)
so per-request headers give exact per-bucket control — pinning the KEY
SHAPE (`checkout:<ip>`, not a global lockout), coverage no existing gate
reads (a collapse to a constant key passes every existing gate: the suite
runs without TRUST_PROXY).

**Step 5: Plan-probe discipline (BEFORE the spec) — the round's discovery**

`scripts/plan-probe-session46.cjs` — the throwaway healthy-copy standalone
on :3209 (a tmpdir copy of `db/custom.db`) with `TRUST_PROXY=1`.
**THE PROBE CAUGHT ITS OWN WIRE-ORDER BUG:** its first run answered the
Zod-null envelope ("Expected string, received null" for every field) —
the crafted POST invoked placeOrderAction but `$K1` reassembled to an
EMPTY FormData. Root cause (read from the flight sources): the real
client's `encodeReply` appends the FormData entries DURING the model walk
and sets the flight row `"0"` LAST, and the server's `case "K"`
reassembly walks `referencedEntries` IN ORDER, breaking at the first
non-matching key — so the `_1_*` fields MUST PRECEDE field `"0"` in the
multipart body (FormData insertion order). The fix landed; **FINAL: 11/11
checks passed** — boot + `{"ok":true,"db":true}`; the checkout manifest's
exactly 3 ids with exactly one `placeOrderAction` (by `exportedName`); the
crafted fetch-action POST answering the cart-less envelope (200, no
Set-Cookie); both sibling ids fail-closed on garbage line ids; IP-A
iterations 2..10 lawful + the 11th → "Too many attempts. Try again in 600
seconds" (N bounded 1..600); IP-B's control post NOT floored; zero writes
(order 4→4, cartItem 0→0, user 2→2 on the copy).

**Step 6: The TDD spec**

NEW describe **"checkout limiter floor (F-QQ, session-46)"** at the END of
`tests/e2e/cart-checkout.spec.ts` (the OWNING spec — the checkout seam's
own; the F-CC/F-FF/F-MM chain lives there; the file's uniques 14 → 15).
ONE request-level case: copy `db/e2e.db` to a tmpdir (the serial topology
keeps the suite DB quiescent at copy time); spawn the throwaway on :3213
with `TRUST_PROXY=1`; poll health; then the ladder — the manifest canary
(exactly 3 ids; exactly one placeOrderAction) → the wire-shape probe
(burst iteration 1: the cart-less envelope + no Set-Cookie) → the sibling
fail-closed sweep → **LOAD-BEARING 1** (IP-A iterations 2..10 lawful, the
11th → the floor with bounded retry seconds 1..600) → **LOAD-BEARING 2**
(IP-B's control NOT floored — the per-IP key shape) → the zero-writes
delta; the finally SIGTERMs the child (SIGKILL escalation) and removes the
tmpdir. **ZERO logins, ZERO registers, ZERO main-server limiter
consumption, ZERO DB writes anywhere.** GREEN **32 passed** (15 uniques ×
2 + 2 setups; F-QQ ~1.1s on BOTH projects).

**Step 7: TWO mutation demos — both halves independently gated**

1. **The checkout limiter-drop** (the block replaced by a bare
   `limiter.allowed;`) → REBUILD → **all 30 existing case-runs GREEN**
   (the wire-blindness proof) while **exactly the 2 F-QQ case-runs failed**
   at LOAD-BEARING 1 (Received: null — the 11th answered the cart-less
   envelope).
2. **The per-IP key collapse** (`clientIpFrom(hdrs) && "local"` — the
   typecheck-clean collapse; the naive constant form dies TS6133 on the
   now-unused import, the strict-mode gate doing its job) → REBUILD → the
   30 existing GREEN (the suite runs without TRUST_PROXY — every existing
   consume keys `checkout:local` either way) while **exactly the 2 F-QQ
   case-runs failed** at LOAD-BEARING 2 (IP-B answered the FLOOR —
   "Too many attempts. Try again in 600 seconds."; LB1 stayed green).

All restored via inverse edit (`git diff --stat src/` empty —
byte-identical) → rebuild → **32/32 green**. With F-QQ **every rate-limited
mutation seam (login/register/checkout/newsletter/search) owns a gate** —
the residual ledger's limiter chapter CLOSES.

**Step 8: Round-41 census — the reference outage handled honestly (again)**

**ENVIRONMENT: the LIVE reference (Base44) answered HTTP 503 across every
probe this round** (start, census window, final re-probe — the sessions-
44/45 outage unbroken, now the third round). The census ran **clone-side
×2** (41a on the post-restore build + 41b on the post-dev-rebuild):
**ZERO DRIFT — byte-identical to the round-38/39/40 clone-side ledger in
ALL census fields**: desktop pageH 11085, mobile pageH 11264, mainKids 11
both viewports, footers 444/1189, the drawer char-identical (`w-80` panel
+ `flex flex-col gap-6` + `flex flex-col gap-5 mt-4` + gaps [20,20,20,20])
— **the v4 mobile-nav pin holds**; clone console clean both censuses. The
clone's mobile menu verified end-to-end on the dev server (`rm -rf .next`
first; `env -u DATABASE_URL` boot): burger → drawer (dialog:1) → overflow
hidden → Women → `/shop?category=women` → closed → overflow restored →
zero console/page errors (no cold-compile race this round). 11 screenshots
refreshed; 9 byte-identical to the committed versions; the 2 differing
(clone-mobile-home, clone-mobile-menu-open) are the documented
timing-dependent class (hash-verified unstable across runs while every
geometry pin stays byte-stable); the dev cart's row cleaned after the
shot, canonical 4/12/2/4 re-verified.

**Step 9: Final gates + docs**

typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **280
passed + 2 skipped** (141 unique × 2; 6.4m) — the 47th consecutive
fully-green session, exactly the plan's count ledger (140→141 unique,
278→280 passed). Docs aligned: SKILL v1.39.0 (frontmatter 280/141 + F-QQ;
§2 E2E row + F-QQ; §11 command 141; Appendix B NEW session-46 row with the
measured wire-order note), README (badge 173+280 + the F-QQ pins + counts
141), CLAUDE.md (gate line 141 + the F-PP→F-QQ chain + the NEW F-QQ segment
+ commands 141), PAD (test table 18|141|280 + §7.3 command 141 + the
coverage-map session-46 extension), AGENTS.md (the security line's F-QQ
gate + the E2E command row 141), `docs/remediation-plan-session46.md` (the
plan + this execution record), worklog, this log; `.env.example` unchanged
and matching; stale-count sweep zero.

**Step 10: Commit + push (main only)**

One main-branch commit (test-only round — zero `src/` changes in the
final tree; the artifacts: the F-QQ describe + the plan + the probe script
+ the dev-hygiene helper + the refreshed screenshots + the five-docs
alignment + the worklog + this log) pushed via the SSH wrapper v3 with
`--remote git@github.com:nordeim/luxury-fashion-store.git`, verified on the
remote, key shredded.
