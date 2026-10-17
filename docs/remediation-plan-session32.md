# Remediation Plan — Session 32 (AURELIA / VELOUR clone)

> **Status:** PLANNED → EXECUTED this round (the session-31 continuation, named
> for the next session number per the standing precedent).
> **Mode:** Verify-first (Mode C) → reconciliation of the pulled remote
> (`52b4d73` the session-31 F-BB round + `7681451`/`5e01d09` its session logs
> + `23f618c` the dependency-bump commit) → first-hand audit → live-reference
> parity sweep round 27 → fresh audit pass → one gate-coverage remediation
> (F-CC). **Scope:** the session-31 commit audited TRUE first-hand (the F-BB
> describe verified in full source AND re-run green on the fresh build:
> 24 passed incl. the 2 setup — exactly the 5 N-1/F-B + 3 F-AA + 3 F-BB × 2
> ledger shape); **the `23f618c` dependency bump audited on the synced
> toolchain** (next 16.4.0→16.4.2, react 19.3.0→19.3.1,
> @playwright/test 1.64.0→1.64.1 — lockfile-only change; the full verify gate
> plus the security gate re-run green on the bumped toolchain, proving the
> transport-header + cookie contracts survive the framework patch bumps);
> **the round-27a census measured ZERO DRIFT** (29th/30th consecutive
> clone-side sweeps — the reference byte-stable against the round-24 ledger,
> mainKids 11 both sides both viewports, drawer gaps [20,20,20,20] — the v4
> mobile-nav pin holds, the standing task re-check); **the fresh pass opened
> one seam no prior round audited** — the guest order-view capability gate
> (`/checkout/success?order=N&t=<hmac>`, `src/lib/order-token.ts` +
> `src/app/(storefront)/checkout/success/page.tsx`): the HMAC view-token
> contract is declared twice in prose (CLAUDE.md "Guest order confirmations
> ride an HMAC view token — sequential order numbers are not capability
> tokens"; the module header "an unauthenticated visitor must present
> `?order=N&t=<hmac>` to view a guest order") and unit-pinned at the
> pure-function layer (`order-token.test.ts`: determinism, distinctness,
> verify accept/reject, length-extension rejection) — yet ZERO wire-layer
> pins anywhere: the checkout E2E reaches `/checkout/success` only by
> following the placement redirect and never asserts the capability gate
> itself. A refactor dropping the `isGuestWithToken` check (or rendering the
> order before verification) would expose every guest order's email, name and
> address to anyone holding the sequential order number — with every gate
> green. **F-CC**, LOW gate-coverage, zero product defect (the gate serves
> correctly today — verified first-hand by the round's plan probe, 19/19).

---

## 1. Starting state

WARM workspace fast-forwarded `7681451..23f618c` (the pull brought
`docs/session_32.md` — the session-31 round's narration log — plus the
`5e01d09` session-log commit and `23f618c` "update package versions":
package.json + package-lock.json ONLY, a dependency-range bump). **TWO
sandbox reset incidents this round** — the recurring reset set fired again
(check ALL of it every round either way; the session-31 round proved the
full set can survive, this round two items fired):

| Step | Result |
|---|---|
| `git pull` | ✓ fast-forward to `23f618c`; `skills/` pruned by the sandbox → `git restore -- skills/`; stray `bun.lock` → deleted |
| `.env` | ✗ REWRITTEN to the absolute path by the sandbox → re-pinned to `DATABASE_URL="file:../db/custom.db"` |
| `bin/ssh` shim + paramiko | ✗ shim GONE + paramiko missing → rebuilt from the how-to skill doc Appendix A; paramiko 5.0.0 reinstalled into `/home/z/.venv` |
| Playwright cache | ✗ the v1248 build pruned (only v1200 survived) → `npx playwright install chromium` after the 1.64.1 sync |
| `db/custom.db` | ✗ **EMPTY (0/0/0/0)** — the session-22-class empty-DB incident — → `npm run db:setup` re-materialized 4/12/2/4 |
| `core.fileMode false` | ✓ survived |

**The round-27a census caught the empty DB first-hand**: the first census run
measured the clone at pageH 7162/7358 vs the ledger's 11085/11264 (the ref
side byte-matched 11079/11257 — mainKids 11 held because the section
structure is static, but the product grids collapsed). Root cause verified by
direct Prisma count (0/0/0/0), fixed by `db:setup`, census re-run green. The
two-census ritual did exactly its job — the anomaly never reached a pin.

**Dependency sync (the `23f618c` audit precondition):** `npm install` synced
node_modules to the new lockfile (next 16.4.2, react 19.3.1, react-dom
19.3.1, @playwright/test 1.64.1; tailwindcss 4.3.3 / prisma 6.19.3 / vitest
3.2.7 / eslint 9.39.5 / tsx 4.23.15 already current); working tree stayed
clean (the lockfile is the contract).

**Baseline gates on the bumped toolchain (TWENTY-FOURTH consecutive session
fully green at baseline):** typecheck ✓ · lint ✓ · **173/173 unit (19
files)** ✓ · build + assemble ✓ (E2E runs at the final gate).

## 2. Audit of `52b4d73` (session-31) and `23f618c` (the bump) — first-hand

`52b4d73` composition (13 files): the security-gate F-BB describe (+196 lines
net, 3 cases), the new `scripts/plan-probe-session31.cjs` (173 lines, 21
checks), the plan (275 lines), 4 screenshot re-captures, README/CLAUDE/PAD/
AGENTS/SKILL v1.24.0 alignment, worklog. Claims verified against the final
tree:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | The F-BB describe pins the three identity cookies' hardened flags on the browser-enforced state across the real minting flows | `tests/e2e/security-csp.spec.ts` read: the "cookie security attributes (F-BB, session-31)" describe at :279+, three cases (cart / wishlist / session seams) via fresh logged-out contexts + `context.cookies()`, tokens SQL-cleaned in afterAll | TRUE |
| 2 | The security gate is GREEN on the fresh build | `npx playwright test tests/e2e/security-csp.spec.ts` re-run on the BUMPED toolchain: **24 passed** (5 N-1/F-B + 3 F-AA + 3 F-BB) × 2 + 2 setup | TRUE |
| 3 | The plan-probe artifact exists and matches its contract | `scripts/plan-probe-session31.cjs` present (173 lines); its assumptions are permanently encoded in the green F-BB spec (the stronger witness) | TRUE |
| 4 | Docs aligned (SKILL v1.24.0 frontmatter 124+248+2; README badge 173+248 + the Auth row's cookie pin; CLAUDE.md gate line 124 + the F-BB pin; PAD test table 17\|124\|248; AGENTS.md the security line) | all five docs read this round; counts consistent | TRUE |
| 5 | No production change (test-only round) | `git show 52b4d73 --stat`: tests/docs/screenshots/scripts/worklog only; `src/lib/auth.ts` absent (the mutation demo's temporary edit restored) | TRUE |

`23f618c` composition (2 files): package.json + package-lock.json ONLY. The
bump is dependency-range re-resolution — `next ^16.0.0 → ^16.4.2`,
`react/react-dom ^19.2.0 → ^19.3.1`, `@playwright/test ^1.56.0 → ^1.64.1`,
`@tailwindcss/postcss` + `tailwindcss ^4.1.14 → ^4.3.3`, `prisma/@prisma/client
^6.16.2 → ^6.19.3`, `eslint ^9.37.0 → ^9.39.5`, `axe-core ^4.10 → ^4.14`,
`tsx ^4.19.2 → ^4.23.15`, `vitest ^3.2.4 → ^3.2.7`, Radix minors. Audited by
syncing + running the full baseline gate AND the security gate on the bumped
toolchain (both green — the F-AA transport headers and F-BB cookie flags
survive the framework patch bumps; no source file changed).

**Verdict: session-31 5/5 claims TRUE; the bump behavior-neutral on this
toolchain, zero production regressions.**

**Doc-drift finding (small, fixed in this round's docs pass):** the bump
moved the LOCKFILE-resolved versions past the docs' stack tables —
CLAUDE.md + README said Next 16.4.0 / React 19.3.0 / Playwright 1.64.0; the
lockfile now resolves 16.4.2 / 19.3.1 / 1.64.1. Alignment belongs to this
round's docs step (§5 #6).

## 3. Live reference sweep — round 27a (measured 2026-10-17): ZERO DRIFT

The single-census pre-remediation pass (the 27b `--shots` pass closes the
ritual after the test-only round; the FIRST 27a attempt measured the clone
short — the empty-DB incident above — and was re-run green after
`db:setup`). The reference is byte-stable against the round-24 ledger —
**29th consecutive clone-side sweep**:

| Ledger field | Round-24/25/26 ledger | Round-27a measured | Verdict |
|---|---|---|---|
| ref desktop pageH / mainKids | 11079 / 11 | 11079 / 11 | byte-stable |
| clone desktop pageH | 11085 | 11085 | byte-stable |
| ref mobile pageH / mainKids | 11257 / 11 | 11257 / 11 | byte-stable |
| clone mobile pageH | 11264 | 11264 | byte-stable |
| footers | 444 / 1189 | 444 / 1189 | byte-stable |
| drawer panelCls/navCls | char-identical | identical | byte-stable — **the mobile-nav v4 pin holds** (`w-80` + `flex flex-col gap-5`, gaps [20,20,20,20]; the standing task re-check) |
| clone console | clean | clean | byte-stable |
| ref console | the documented 2× 401 residue | identical | documented residue |

Seven stable sweeps since the round-21 move.

## 4. Fresh audit pass — finding (the round's target)

Opened via the unexercised-contract census. Competing leads verified and
dismissed first-hand:

- **Open-redirect-safe redirects** (README Auth row) — the pure seam
  `validateRedirectPath` is unit-pinned (9-case describe incl. `//evil.example`,
  `https://evil.example`, CRLF injection). Unit-covered ⇒ no gap (the
  session-31 TRUST_PROXY precedent: unit-pinned = covered).
- **robots.txt contract** — wire-pinned (`seo.spec.ts` asserts the exact
  allow/disallow body + the sitemap URL). Covered.
- **TRUST_PROXY first-hop identity** — unit-pinned (carried, session-31).
- **Checkout oversell guard / search-429 / fault-injection shapes** — carried
  (session-31 §8).

1. **F-CC — the guest order-view capability gate is declared twice in prose
   and unit-pinned at the pure layer, pinned nowhere on the wire.** The
   success page's gate (`src/app/(storefront)/checkout/success/page.tsx`):
   `isOwner` (signed-in owner) OR `isGuestWithToken` (`!order.userId &&
   tokenValue && verifyOrderViewToken(order.number, tokenValue)`) — anything
   else `notFound()` ("no existence leak", the source comment). The checkout
   E2E reaches `/checkout/success` only by following the placement redirect —
   it proves the browser landed, never that the GATE works: no test fetches
   the URL with an absent token, a wrong token, a cross-order token, or an
   unknown order number; no test asserts the 404s render the not-found card
   or leak no guest PII (email/name/address on the confirmation body). The
   token itself is minted at `src/lib/actions/checkout.ts:100`
   (`result.viewToken = orderViewToken(placed.number)` for guest orders).
   Severity: LOW (gate-coverage gap; the gate serves correctly today — all
   19 probe checks passed first-hand). Same family as F-Y/F-AA/F-BB: a
   declared contract the gates never exercise. Remediation: extend
   `tests/e2e/cart-checkout.spec.ts` (the OWNING spec — the flow that mints
   guest orders lives there; the F-Z precedent of landing inside the spec
   whose fixtures the pin reuses) with a new describe block, one case
   driving the real guest COD flow in a fresh logged-out context and
   asserting the full capability matrix over direct fetches. No production
   change.

INFO-level (verified, no action):

- The probe's offline-HMAC reproduction check (probe secret === boot secret ⇒
  the minted token is reproducible from `AUTH_SECRET` alone) is the load-bearing
  assumption for the spec's cross-order negative: the spec computes a token
  for a DIFFERENT order number offline (via the shared `E2E_AUTH_SECRET`,
  the `e2e-secrets.ts` single-source-of-truth constant the a11y fixture
  already uses) instead of placing a second order — saving one
  checkout-bucket slot and one wizard round-trip.
- The 404 shape is the platform not-found card (`src/app/not-found.tsx`,
  chrome-less, "Page Not Found") — the failure-surfaces spec pins the card on
  catalog routes; the capability gate reuses the SAME renderer, so the body
  assertion here is a consistency pin, not a new surface.
- Guest orders ride `userId: null` — the `isOwner` branch never applies to
  them; the negative matrix is stable regardless of who else is signed in.

### Honest-gate decisions (run before planning)

- **F-CC adds gate coverage; it changes no product behavior.** The served DOM
  is untouched; the parity census cannot drift (test-only round).
- **No gate is weakened.** The three existing cart-checkout describes are
  untouched; the new describe is additive inside the owning spec file; no
  vitest/playwright config edits (the spec matches the existing
  `tests/e2e/*.spec.ts` glob); no new npm dependencies; `.env.example`
  unchanged; money untouched.
- **Direct fetches, not UI navigation.** The negative matrix asserts
  `page.goto(...)` response statuses + body markers — the gate's own contract
  is the HTTP shape (404 + not-found card + no PII), not a UI affordance.
- **One case for the whole matrix** (the mint-and-assert flow is sequential
  and stateful: one placed order feeds every assertion) — the case name names
  the gate; a regression anywhere in the matrix fails the one case loudly.
- **The flow costs ONE checkout-bucket slot per project** — arithmetic:
  2 (cart-checkout's COD + card) + 1 (F-CC) = 3 per project, 6 < 10 per
  10-min window per IP (the api-contract precedent of documenting the limiter
  budget in the spec).
- **Writes self-clean (the H-24 discipline)**: the placed order is TRANSIENT
  state — global-setup wipes the orders table at the start of every run, and
  the existing checkout specs already leave their orders in place (the same
  tolerated residue); no afterAll cleanup is needed beyond what the suite
  already does. The cart row dies with the guest cookie's token (wiped too).

## 5. Remediation design (TDD)

### ToDo

| # | Task | Layer | Gate |
|---|---|---|---|
| 1 | `scripts/plan-probe-session32.cjs` — NEW probe: boots the standalone on :3206 against a THROWAWAY copy of `db/custom.db` (zero dev-DB writes), drives the real guest COD flow, captures the confirmation URL, and wire-verifies all 19 contract assumptions (URL shapes, offline-HMAC reproduction, the positive path, the four rejected variants, the not-found card, zero PII leakage) BEFORE the spec is written | tooling | node script |
| 2 | `tests/e2e/cart-checkout.spec.ts` — NEW describe "guest order-view capability gate (F-CC, session-32)": one case — fresh logged-out context (storageState opt-out), the proven COD flow, capture `order`+`t` from the success URL, then direct-fetch the matrix: captured URL 200 + order number + guest email; absent token 404; flipped-char token 404; offline-minted cross-order token (via `E2E_AUTH_SECRET`, the `e2e-secrets.ts` constant) 404; unknown order + its own valid token 404 — each 404 rendering the not-found card and leaking no guest email; the spec header gains the session-32 note + the limiter arithmetic (3/project, 6 < 10) | E2E | playwright |
| 3 | Mutation demo (surgical, inverse-restore — traps #37/#39): drop the `isGuestWithToken` term from the success page's gate (the old build renders the order to ANY caller with the order number) → REBUILD (trap #16: the standalone serves the assembled copy) → exactly the F-CC case fails (2 projects; every other case stays green — the gap's exact shape) → restore, `git diff` clean, rebuild | process | playwright |
| 4 | Round-27b census — MUST be byte-stable vs the 27a ledger (test-only round; the verdict closes the rest-invariance claim); `--shots` refreshes the screenshot set | parity | sweep tool (--shots) |
| 5 | Final gates on the final tree: typecheck → lint → unit → build → full E2E | gates | npm run verify + test:e2e |
| 6 | Docs alignment: README (badge 173+250, the Orders row gains the capability-gate pin, the Testing architecture row, testing/status rows), CLAUDE.md (gate line 126 + the checkout-gate description gains the F-CC pin + the stack-table version refresh 16.4.2/19.3.1/1.64.1), PAD (test table 17\|126\|250, §7.1 session-32 paragraph, the stack version refresh), SKILL (frontmatter version/project_state, §2 E2E row, Appendix B session-32 row for F-CC), AGENTS.md (the Build & deploy line gains the gate), the doc-drift fix from §2, this file's execution record, worklog | docs | stale-count sweep |

### Count ledger (expected post-remediation)

| Metric | Before | After |
|---|---|---|
| unit files / tests | 19 / 173 | 19 / 173 (no new pure seam — the finding is wire-layer) |
| E2E spec files | 17 | 17 (cart-checkout extended in place) |
| unique E2E cases | 124 | 126 (+1 F-CC) |
| E2E result | 248 passed + 2 skipped | 250 passed + 2 skipped (126 × 2 − 2 desktop-only skips + 2 setup) |

## 6. Validation of this plan against the codebase (pre-execution)

- `scripts/plan-probe-session32.cjs` ran FIRST (the session-29/30/31
  plan-probe discipline): **19/19 checks passed** — the guest COD flow lands
  on `/checkout/success?order=ORD-YYYY-NNN&t=<40-hex>`; the offline HMAC
  reproduces the minted token from the boot's AUTH_SECRET alone (the
  cross-order negative is computable offline); the positive path serves 200
  with the order number AND the guest email; absent / wrong / cross-order /
  unknown-order+valid-token all 404; every 404 renders the not-found card and
  leaks no guest email (against a throwaway DB copy — zero dev-DB writes).
- The flow selectors are the COD test's own (proven daily): the PDP
  preselects `sizes[0]` so add-to-bag is one click; the wizard is
  Shipping → Payment(COD) → Review → Place.
- `playwright.config.ts` injects `E2E_AUTH_SECRET` into the standalone's env
  (`webServer.env.AUTH_SECRET`) — the offline cross-order token computed with
  the shared constant verifies against the server exactly when the gate is
  correct (the `e2e-secrets.ts` single-source-of-truth contract).
- The checkout limiter is `checkout:<ip>` at 10 per 10 min (one shared
  bucket without TRUST_PROXY) — the in-memory instance dies with each
  playwright run's server, so the per-run arithmetic (2 existing + 1 new = 3
  per project, 6 < 10) holds regardless of same-round re-runs of single
  specs.
- No schema/env/seed changes; money untouched; no revalidatePath surface;
  `.env.example` unchanged; the source gate untouched by the remediation
  itself (the mutation demo's temporary edit is restored and verified).
- The census measures the home page only — a test-only round cannot drift
  it; the ritual still runs as the verdict (trap #40's discipline).
- The cart-checkout spec's describe inventory read in full (3 describes, 5
  cases + 2 helpers) — the new describe is additive, no existing case
  modified; `emptyTheBag`/`openDrawerWithItem` helpers reused unmodified.

## 7. Execution record

| # | Task | Result |
|---|---|---|
| 1 | plan-probe | ✅ `scripts/plan-probe-session32.cjs` — **19/19 checks passed**: the URL shapes, the offline-HMAC reproduction, the positive path (200 + order + email), the four rejected variants (absent/wrong/cross-order/unknown → 404), the not-found card on every 404, zero PII leakage — every contract assumption verified BEFORE the spec was written, against a throwaway DB copy (zero dev-DB writes) |
| 2 | F-CC case (cart-checkout.spec.ts) | ✅ NEW describe "guest order-view capability gate (F-CC, session-32)" — one case: fresh logged-out context, the proven COD flow, the capability matrix over direct fetches (captured URL 200 + order number + guest email; absent/flipped/cross-order/unknown → 404 × not-found card × no-PII), the offline cross-order token via `E2E_AUTH_SECRET`; typecheck ✓; GREEN **26 passed** (12 unique = 11 existing + 1 F-CC) × 2 + 2 setup |
| 3 | Mutation demo | ✅ the gate's verification dropped (`!!tokenValue ||` short-circuit, type-safe with `?? ""` — the first mutant shape failed the build's typecheck on an unnarrowed `tokenValue` and was corrected BEFORE any test ran) → REBUILD (trap #16) → **exactly the 2 F-CC case-runs failed** (1 case × 2 projects; all 22 other case-runs + 2 setup stayed green — the gap's exact shape: the placement-redirect cases never exercise the verification) → restored via `git checkout` (diff clean) → rebuild → 26/26 green |
| 4 | Round-27b census (--shots) | ✅ ZERO DRIFT — byte-identical to 27a in ALL census fields (29th/30th consecutive): mainKids 11 both sides both viewports; pageH 11079/11085 + 11257/11264; footers 444/1189; drawer objects char-identical (the v4 mobile-nav pin holds); ref console = the documented 2× 401 residue; clone console clean — the test-only round proven rest-invisible by measurement; screenshots refreshed (live-variance pattern) |
| 5 | Final gates on the final tree | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **250 passed + 2 skipped** (126 unique × 2 − 2 desktop-only skips + 2 setup; 5.1m) — the TWENTY-FOURTH consecutive fully-green session, exactly the §5 count ledger |
| 6 | Docs alignment + stale-count sweep | ✅ README (badge 173+250, the Orders row + the capability-gate pin, the Testing architecture row + the F-CC extension, testing/status rows); CLAUDE.md (gate line 126 + the checkout-flow description gains the capability pin + the stack-table refresh 16.4.2/19.3.1/1.64.1); PAD (test table 17\|126\|250, §7.1 session-32 paragraph, the stack-version refresh); SKILL v1.25.0 (frontmatter version/project_state, §2 E2E row, Appendix B NEW session-32 row); AGENTS.md (the checkout line gains the gate); docs/remediation-plan-session32.md (this record); worklog. Stale-count sweep: zero stale counts |

## 8. Residual risks / next steps (post-F-CC)

1. The search 503 and health `db:false` deliberate-failure shapes stay pinned
   by source-read + success-path only (fault injection rejected — the F-I
   precedent). Carried, documented.
2. `/api/search`'s 429 path is unpinned by design — minting it would consume
   60 requests against the shared in-memory limiter and poison the run
   (documented arithmetic; a future dedicated limiter-reset harness could pin
   it, tooling-only).
3. The PDP og:image carries no `og:image:type/width/height` annotations (the
   remote catalog URL's dimensions are not statically known — declaring them
   would be dishonest). Carried (session-28 §8 #1).
4. og:type on ALL pages stays `website` — Next's `OpenGraphType` union lacks
   `"product"`; a type-dishonest cast remains rejected (the JSON-LD Offer is
   the authoritative price channel). Carried (session-26 §8 #8).
5. `style-src 'unsafe-inline'` remains the documented CSP exception (carried).
6. Real PSP behind the checkout seam (carried).
7. Dev-toolchain npm-audit findings (11, all dev-only) — carried.
8. G-3 POSIX-only sweep paths (carried).
9. The action-seam gate couples to the standalone manifest shape — fails loud
   at the canary by design (carried).
10. The zero-drift streak is a streak, not a guarantee — the two-census
    ritual stays mandatory. Seven stable rounds since the round-21 move.
11. security.txt's `Expires` (2027-11-01) renewal stays a documented
    maintenance cadence.
12. The canonical convention delta (home renders the bare origin vs the
    reference's trailing-slash form) remains RFC-3986-equivalent, pinned as
    served (carried, session-26).
13. `/shop`'s inherited `og:url` = origin (the root convention; the canonical
    link disambiguates) — accepted; carried.
14. The sweep tool inherits the shell's `AUTH_SECRET` (playwright.config is
    self-sufficient; the sweep is not) — a future round may harden the tool
    with an inline dev-secret fallback (zero product impact, tooling-only).
    This round ran it with the inline env (the documented workaround).
15. `NewsletterSubscriber` stays outside global-setup's wipe list (content,
    not transient state) — the api-contract spec self-cleans its own row; a
    future content-reset harness decision is out of scope.
16. HSTS on the http://localhost dev origin is inert by construction (browsers
    ignore STS over plain HTTP) — the header is the production deployment
    contract, pinned as declared; no action.
17. The F-BB login case consumes one customer-bucket slot per project (the
    arithmetic 6 < 10 is documented in the spec) — a future limiter-reset
    harness (§8 #2) would relax the budget for both specs at once.
18. The session cookie's `Expires` is pinned as a ~30d WINDOW (29–31d), not
    an instant-exact value — the TTL constant is exercised, not the clock;
    an exact-date pin would be flaky by construction. Documented shape.
19. The F-CC case consumes one checkout-bucket slot per project (3/project,
    6 < 10 per run documented in the spec) — the same future limiter-reset
    harness (§8 #2) would relax this too.
20. The F-CC negative matrix exercises the gate's REJECT paths; the
    signed-in-OWNER positive path (`isOwner`) is exercised by the account
    order-history surface (the a11y gate's logged-in admin/account fixtures
    render it) but no case pins "an owner sees their order WITHOUT the
    token" on the wire — a candidate one-case extension if a future round
    opens the account-orders seam.
21. The dependency bump (`23f618c`) re-resolved the lockfile to next
    16.4.2/react 19.3.1/playwright 1.64.1 — audited green this round; future
    bumps should repeat the sync-then-full-gate sequence (the §2 audit is
    the reusable shape).
