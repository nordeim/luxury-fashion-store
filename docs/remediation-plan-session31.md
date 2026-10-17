# Remediation Plan — Session 31 (AURELIA / VELOUR clone)

> **Status:** PLANNED → EXECUTED this round (the session-30 continuation, named
> for the next session number per the standing precedent).
> **Mode:** Verify-first (Mode C) → reconciliation of the pulled remote
> (`a2a2da4` the session-30 F-AA round + `c618f7f`/`ceafbbe` its session log)
> → first-hand audit → live-reference parity sweep round 26 → fresh audit
> pass → one gate-coverage remediation (F-BB). **Scope:** the session-30
> commit audited TRUE first-hand (the F-AA describe verified in full source
> AND re-run green on the fresh build: 18 passed incl. the 2 setup — exactly
> the 5 N-1/F-B + 3 F-AA × 2 ledger shape); **the round-26a census measured
> ZERO DRIFT** (27th/28th consecutive clone-side sweeps — the reference
> byte-stable against the round-24 ledger, mainKids 11 both sides both
> viewports, drawer gaps [20,20,20,20] — the v4 mobile-nav pin holds, the
> standing task re-check); **the fresh pass opened one seam no prior round
> audited** — the cookie-security contract (`aurelia_session` /
> `aurelia_cart` / `aurelia_wishlist`, all three declaring
> `httpOnly + sameSite: lax + secure: production + path: /` in source, the
> shape CLAUDE.md/README declare as "HMAC-signed httpOnly cookies", with
> zero wire-layer assertions anywhere in `tests/` — every Set-Cookie
> reference there is an action-seam ABSENCE probe) — and found **F-BB**, LOW
> gate-coverage, zero product defect (the flags serve today — verified
> first-hand by the round's plan probe, 21/21, on the browser-enforced
> state).

---

## 1. Starting state

WARM workspace fast-forwarded `c618f7f..ceafbbe` (the pull brought only the
updated `docs/session_30.md` round log; docs only, no code). **ZERO sandbox
reset incidents this round** — the recurring reset set fully survived (the
session-29 precedent: do not assume it either way; check ALL of it every
round):

| Step | Result |
|---|---|
| `git pull` | ✓ fast-forward to `ceafbbe`; `skills/` intact (283 entries); no stray `bun.lock` |
| `.env` | ✓ canonical 3-line contract (`DATABASE_URL="file:../db/custom.db"`) |
| Playwright cache | ✓ both builds present (v1200 + v1248); installed @playwright/test 1.64.0 matches the v1248 build |
| `bin/ssh` shim + paramiko | ✓ shim present; paramiko 5.0.0 in `/home/z/.venv` |
| `db/custom.db` | ✓ canonical 4/12/2/4 (Category/Product/User/Order row counts) |
| `core.fileMode false` | ✓ survived |

**Baseline gates on the committed tree (TWENTY-THIRD consecutive session
fully green at baseline):** typecheck ✓ · lint ✓ · **173/173 unit (19
files)** ✓ · build + assemble ✓ (E2E runs at the final gate).

## 2. Audit of `a2a2da4` (first-hand full-source verification)

Composition: the security-gate F-AA describe (+52 lines, 3 cases) + the new
`scripts/plan-probe-session30.cjs` (99 lines, 21 checks: 3 route classes ×
(1 reachability + 6 headers)) + `docs/remediation-plan-session30.md` (233
lines) + 5 screenshot re-captures + README/CLAUDE/PAD/AGENTS/SKILL v1.23.0
alignment + worklog. Claims verified against the final tree:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | The F-AA describe pins all six static transport headers at EXACT values on three route classes | `tests/e2e/security-csp.spec.ts:144-178` read in full — the shared `TRANSPORT_HEADERS` map, `===` per header via `Object.entries`, one case per class (`/`, the canonical PDP, `/api/health`), status 200 asserted per route | TRUE |
| 2 | The security gate is GREEN on the fresh build | `npx playwright test tests/e2e/security-csp.spec.ts` re-run: **18 passed** (5 N-1/F-B + 3 F-AA) × 2 + 2 setup — exactly the session-30 ledger shape | TRUE |
| 3 | The plan-probe discipline artifact exists and matches its contract | `scripts/plan-probe-session30.cjs` present (99 lines); the check loop = 3 routes × (reachability + the six EXPECTED entries) = 21 checks; NOT re-run this round — its assumptions are permanently encoded in the green F-AA spec itself (the stronger witness) | TRUE |
| 4 | Docs aligned (SKILL v1.23.0 frontmatter 121+242+2, §2 E2E row + Appendix B session-30 row; README badge 173+242 + the Production section's six-header inventory; CLAUDE.md gate line 121 + the F-AA pin; PAD test table 17\|121\|242 + §7.1 session-30 paragraph; AGENTS.md Build & deploy header line) | all five docs read this round; counts consistent | TRUE |
| 5 | No production change (test-only round) | `git show a2a2da4 --stat`: only tests/docs/screenshots/scripts/worklog touched; `next.config.ts` absent (the mutation demo's temporary edit restored) | TRUE |

**Verdict: 5/5 claims TRUE, zero production regressions.**

## 3. Live reference sweep — round 26a (measured 2026-10-17): ZERO DRIFT

The single-census pre-remediation pass (the 26b `--shots` pass closes the
ritual after the test-only round). The reference is byte-stable against the
round-24 ledger — **27th consecutive clone-side sweep**:

| Ledger field | Round-24/25 ledger | Round-26a measured | Verdict |
|---|---|---|---|
| ref desktop pageH / mainKids | 11079 / 11 | 11079 / 11 | byte-stable |
| clone desktop pageH | 11085 | 11085 | byte-stable |
| ref mobile pageH / mainKids | 11257 / 11 | 11257 / 11 | byte-stable |
| clone mobile pageH | 11264 | 11264 | byte-stable |
| footers | 444 / 1189 | 444 / 1189 | byte-stable |
| drawer panelCls/navCls | char-identical | identical | byte-stable — **the mobile-nav v4 pin holds** (`w-80` + `flex flex-col gap-5`, gaps [20,20,20,20]; the standing task re-check) |
| clone console | clean | clean | byte-stable |
| ref console | the documented 2× 401 residue | identical | documented residue |

Five stable sweeps since the round-21 move.

## 4. Fresh audit pass — finding (the round's target)

Opened via the unexercised-contract census: `rg "set-cookie|httpOnly|sameSite"
tests/ src/lib` (every tests/ hit is the action-seam's ABSENCE probes —
"no cart cookie minted on rejection" — never an attribute assertion), the
cookie-set-site reads (`src/lib/auth.ts:83-96`, `src/lib/cart.ts:86-119`,
`122-149`), and the docs-declaration grep (CLAUDE.md "custom scrypt + DB
sessions, HMAC-signed httpOnly cookies"; README "HMAC cookies"; CLAUDE.md
"Cart/wishlist rows are keyed by a 192-bit random token").

Competing leads verified and dismissed first-hand:

- **TRUST_PROXY first-hop identity** — declared in README's env table,
  unit-pinned at `rate-limit.test.ts:44-56` (`vi.stubEnv("TRUST_PROXY","1")`
  + the first-`x-forwarded-for`-hop assertions). Covered; no gap.
- **Checkout oversell/sold-out guard** — wire-pinned (H-39/H-15,
  `cart-checkout.spec.ts` drives the SQL stock-zero behind the open drawer).
  Covered; no gap.
- **Login rate limit** — deliberately unpinned (bucket-consuming; the
  documented arithmetic discipline). Carried (session-30 §8 #2 family).

1. **F-BB — the cookie-security contract is declared three times in source
   and twice in docs, pinned nowhere.** Three cookies ship the same hardened
   attribute set — `aurelia_session` (`src/lib/auth.ts:88-96`:
   `httpOnly: true, sameSite: "lax", secure: NODE_ENV === "production",
   path: "/", expires: now + SESSION_TTL_DAYS(30)d`, value =
   HMAC-signed token), `aurelia_cart` (`src/lib/cart.ts:112-118`, same flags,
   `maxAge: 2592000`, value = 24-byte hex token) and `aurelia_wishlist`
   (`src/lib/cart.ts:140-146`, same) — and the docs declare the shape
   ("HMAC-signed httpOnly cookies"; "192-bit random token"). The flags are
   the XSS/CSRF mitigation layer for the entire auth + guest-identity
   surface: a refactor flipping `httpOnly: false` (e.g. reaching for
   client-side JS access) or dropping `sameSite` would silently expose the
   session/cart/wishlist tokens with every gate green — no spec reads a
   Set-Cookie attribute, no unit test pins the setter options objects, and
   the storageState fixtures record the flags without asserting them.
   Severity: LOW (gate-coverage gap; the flags serve today — all three
   cookies verified first-hand on the browser-enforced state by the round's
   plan probe, 21/21). Same family as F-Y/F-AA: a declared contract the
   gates never exercise. Remediation: extend `tests/e2e/security-csp.spec.ts`
   (the security/transport gate — the F-Z/F-AA precedent of landing inside
   the owning spec) with a new describe block, three cases — one per
   cookie seam (cart / wishlist / session) — each asserting the
   BROWSER-ENFORCED state via a fresh logged-out context's `context.cookies()`
   (the strongest witness: the flags the browser parsed and will enforce, not
   Next's header-string serialization). No production change.

INFO-level (verified, no action):

- The cookie flags ride the production standalone's `NODE_ENV=production`
  (`secure: true` as served); Chrome stores Secure cookies on the
  trustworthy `http://localhost` origin — proven daily by the suite's own
  per-project storageState reuse. The pin captures the served truth.
- The wishlist PDP CTA is state-normalizing (the wishlist.spec pattern:
  click back to "Add to Wishlist" first if a stale "In Wishlist" renders) —
  a fresh context always starts un-wishlisted (fresh token ⇒ fresh row), so
  the F-BB case's flow is deterministic; the normalization guard is kept
  anyway (H-13's lesson: never trust shared-DB resting state).
- The probe's throwaway-DB-copy pattern (a `/tmp` copy of `db/custom.db` +
  the absolute-URL pass-through path) gives the pre-spec verification a
  zero-dev-DB-write harness — the cart/wishlist/session rows it mints die
  with the copy. Reusable for future write-flow probes.

### Honest-gate decisions (run before planning)

- **F-BB adds gate coverage; it changes no product behavior.** The served
  DOM is untouched; the parity census cannot drift (test-only round).
- **No gate is weakened.** The five N-1/F-B and three F-AA cases are
  untouched; the new describe is additive inside the owning spec file; no
  vitest/playwright config edits (the spec matches the existing
  `tests/e2e/*.spec.ts` glob); no new npm dependencies; `.env.example`
  unchanged; money untouched.
- **Browser-enforced state, not header strings.** `context.cookies()`
  reports the flags the browser parsed and enforces (`httpOnly: true`,
  `sameSite: "Lax"`, `secure: true`, `path: "/"`, `expires` ≈ +30d) — the
  strongest witness, immune to Next's serialization-order drift.
- **One case per seam keeps failures surgical**: a dropped flag on one
  setter fails exactly its case (the F-AA route-class precedent, one layer
  down: here the classes are the three cookie seams).
- **The login flow costs ONE customer-bucket slot per project** —
  arithmetic: 2 (setup) + 2 (the logout spec's throwaway logins) + 2 (F-BB)
  = 6 < 10 per IP+email (the api-contract precedent of documenting the
  limiter budget in the spec).
- **Writes self-clean (the H-24 discipline)**: the case's cart/wishlist/
  session rows are keyed by the minted tokens, captured from the cookie jar
  and SQL-deleted in `afterAll` — global-setup wipes all three tables at
  the start of every run regardless, but the current run stays canonical
  for later specs.

## 5. Remediation design (TDD)

### ToDo

| # | Task | Layer | Gate |
|---|---|---|---|
| 1 | `scripts/plan-probe-session31.cjs` — NEW probe: boots the standalone on :3205 against a THROWAWAY copy of `db/custom.db` (zero dev-DB writes), drives real Chromium through the three minting flows (guest add-to-bag / guest wishlist toggle / demo-customer login), asserts the browser-enforced cookie state via `context.cookies()` (21 checks) BEFORE the spec is written | tooling | node script |
| 2 | `tests/e2e/security-csp.spec.ts` — NEW describe "cookie security attributes (F-BB, session-31)": three cases (cart / wishlist / session seams), each driving the real flow in a fresh logged-out context (storageState opt-out) and asserting the browser-enforced flag set + ~30d persistence (+ the 192-bit 48-hex token shape for cart/wishlist); tokens captured and SQL-cleaned in afterAll; the spec header gains the session-31 note | E2E | playwright |
| 3 | Mutation demo (surgical, inverse-restore — traps #37/#39): flip `httpOnly: true → false` on the SESSION setter in `src/lib/auth.ts` → REBUILD (trap #16: the standalone serves the assembled copy) → exactly the F-BB session case fails (2 projects; the cart/wishlist cases stay green — the gap's exact shape) → restore, `git diff` clean, rebuild | process | playwright |
| 4 | Round-26b census — MUST be byte-stable vs the 26a ledger (test-only round; the verdict closes the rest-invariance claim); `--shots` refreshes the screenshot set | parity | sweep tool (--shots) |
| 5 | Final gates on the final tree: typecheck → lint → unit → build → full E2E | gates | npm run verify + test:e2e |
| 6 | Docs alignment: README (badge 173+248, the Auth feature row + the cookie pin, the Testing architecture row, testing/status rows), CLAUDE.md (gate line 124 + the security gate description gains the cookie pin), PAD (test table 17\|124\|248, §7.1 session-31 paragraph), SKILL (frontmatter version/project_state, §2 E2E row, Appendix B session-31 row for F-BB), AGENTS.md (the auth/testing line gains the gate), this file's execution record, worklog | docs | stale-count sweep |

### Count ledger (expected post-remediation)

| Metric | Before | After |
|---|---|---|
| unit files / tests | 19 / 173 | 19 / 173 (no new pure seam — the finding is wire-layer) |
| E2E spec files | 17 | 17 (security-csp extended in place) |
| unique E2E cases | 121 | 124 (+3 F-BB) |
| E2E result | 242 passed + 2 skipped | 248 passed + 2 skipped (124 × 2 − 2 desktop-only skips + 2 setup) |

## 6. Validation of this plan against the codebase (pre-execution)

- `scripts/plan-probe-session31.cjs` ran FIRST (the session-29/30
  plan-probe discipline): **21/21 checks passed** — all three cookies mint
  with `httpOnly: true / sameSite: "Lax" / secure: true / path: "/"` on the
  browser-enforced state, ~30d persistence on all three, and the 192-bit
  48-hex token shape on cart/wishlist (the throwaway-DB-copy harness kept
  the dev DB untouched).
- The minting seams read in full: `addToCartAction` (guest path ⇒
  `getOrCreateCart(null)` ⇒ `cookies.set`), the PDP wishlist CTA
  (`getOrCreateWishlist(null)`), `createSession` (login). The PDP
  preselects `sizes[0]` (`product-detail.tsx:28`), so the add-to-bag flow
  is one click (the `openDrawerWithItem` precedent).
- The login form selectors are the auth spec's own (`getByLabel` Email /
  Password + the sign-in role button) — the demo-hint card, proven daily.
- No schema/env/seed changes; money untouched; no revalidatePath surface;
  `.env.example` unchanged; the source setters untouched by the remediation
  itself (the mutation demo's temporary edit is restored and verified).
- The census measures the home page only — a test-only round cannot drift
  it; the ritual still runs as the verdict (trap #40's discipline).
- The security-csp spec's describe inventory read in full (2 describes, 8
  cases) — the new describe is additive, no existing case modified.

## 7. Execution record

| # | Task | Result |
|---|---|---|
| 1 | plan-probe | ✅ `scripts/plan-probe-session31.cjs` — **21/21 checks passed**: all three cookies mint with the hardened flag set on the browser-enforced state (`httpOnly` / `sameSite: "Lax"` / `secure` / `path: "/"`), ~30d persistence × 3, the 192-bit token shape × 2 — every contract assumption verified BEFORE the spec was written, against a throwaway DB copy (zero dev-DB writes) |
| 2 | F-BB cases (security-csp.spec.ts) | ✅ NEW describe "cookie security attributes (F-BB, session-31)" — three cases (cart / wishlist / session seams), each driving the real flow in a fresh logged-out context and asserting the browser-enforced flag set + ~30d persistence (+ 192-bit tokens on the guest seams + the session value's declared token.hmac shape); tokens SQL-cleaned in afterAll; typecheck ✓; GREEN **24 passed** (11 unique = 5 N-1/F-B + 3 F-AA + 3 F-BB) × 2 + 2 setup |
| 3 | Mutation demo | ✅ the session setter's `httpOnly: true` flipped to `false` in `src/lib/auth.ts` → REBUILD (trap #16) → **exactly the 2 F-BB session cases failed** (1 case × 2 projects; the 4 cart/wishlist F-BB cases and all 16 N-1/F-B/F-AA case-runs stayed green — the gap's exact shape: a flipped flag fails only its own seam's case) → restored via `git checkout` (diff clean) → rebuild → 24/24 green |
| 4 | Round-26b census (--shots) | ✅ ZERO DRIFT — byte-identical to 26a in ALL census fields (27th/28th consecutive): mainKids 11 both sides both viewports; pageH 11079/11085 + 11257/11264; footers 444/1189; drawer objects char-identical (the v4 mobile-nav pin holds); ref console = the documented 2× 401 residue; clone console clean — the test-only round proven rest-invisible by measurement; screenshots refreshed (live-variance pattern) |
| 5 | Final gates on the final tree | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **248 passed + 2 skipped** (124 unique × 2 − 2 desktop-only skips + 2 setup) — the TWENTY-THIRD consecutive fully-green session, exactly the §5 count ledger |
| 6 | Docs alignment + stale-count sweep | ✅ README (badge 173+248, the Auth row + the cookie pin, the Testing architecture row + the F-BB extension, testing/status rows); CLAUDE.md (gate line 124 + the security-gate description gains the cookie pin); PAD (test table 17\|124\|248, §7.1 session-31 paragraph); SKILL v1.24.0 (frontmatter version/project_state, §2 E2E row, Appendix B NEW session-31 row); AGENTS.md (the auth/cookie line + the gate); docs/remediation-plan-session31.md (this record); worklog. Stale-count sweep: zero stale counts |

## 8. Residual risks / next steps (post-F-BB)

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
10. The zero-drift streak is a streak, not a guarantee — the two-census ritual
    stays mandatory. Five stable rounds since the round-21 move.
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
