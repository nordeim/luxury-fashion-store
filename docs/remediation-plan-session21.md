# Remediation Plan — Session 21 (AURELIA / VELOUR clone)

> **Status:** EXECUTED. **Mode:** Verify-first (Mode C) → warm-workspace
> re-validation → audit → sweep → TDD remediation. **Scope:** (1) reconciliation
> of the pulled remote `a54d0b0` (the session-20 work `2edb5fb` + the
> user-added session-20 transcript; docs only, no code); (2) an audit of the
> never-audited session-20 commit `2edb5fb` (skills: `code-review-checklist`,
> `security-and-hardening`, `tdd`, per `skills/skills-catalog.md`) — all
> claims verified first-hand; (3) a **live reference parity sweep round 16**
> (desktop 1440×900 + mobile 390×844, FULL two-census ritual) — **ZERO drift,
> the THIRTEENTH consecutive**; (4) the top carried finding — the H-56/H-59
> "disclosed E2E gaps (DB-mocking harness)" — opened and TDD-remediated with
> **NO harness at all**: the action seam is HTTP-drivable over the wire, and
> the canonical seed is the fixture. A new E2E gate
> (`tests/e2e/action-seam-security.spec.ts`) drives the PDP's server actions
> by direct POST (`Next-Action: <id>` + a JSON-array body), proves the H-59
> bag-size allowlist rejects a foreign size at the HTTP layer with ZERO
> writes, and runs a fail-closed IDOR census over the route's full action
> surface.

---

## 1. Starting state

The workspace was WARM at the session-20 tip `2edb5fb` with a clean tree;
`git pull` fast-forwarded to `a54d0b0` (the user-added `docs/session_20.md`
transcript — docs only, no code). `.env` verified pinned to the contract
`DATABASE_URL="file:../db/custom.db"` (+ dev `AUTH_SECRET`,
`NEXT_PUBLIC_SITE_URL`); `.env.example` tracked with the identical contract.
`db/custom.db` verified canonical via a scratch script (4 categories /
12 products / 2 users / 4 orders / 0 sessions / 0 carts / 0 wishlists —
deleted after use, never committed). Chromium headless-shell v1248 present.
Container paths (`skills/*` mirror, `upload/`, `download/`, `tool-results/`,
`bin/`) remain locally excluded via `.git/info/exclude` (never the committed
`.gitignore`). The sandbox `DATABASE_URL` leak persists — all DB/build
commands run `env -u DATABASE_URL` (§9 #12).

**Baseline gates on the committed tree (all reproduce the session-20 ledger;
NINTH consecutive session fully green):**

| Gate | Result |
|---|---|
| typecheck | ✓ |
| lint | ✓ |
| unit | ✓ 142/142 (17 files) |
| build + assemble | ✓ (proxy visible in the build summary) |
| E2E | ✓ 170 passed + 2 skipped (85 unique × 2 − 2 viewport skips + 2 setup) |

`npm audit`: 11 findings (1 moderate, 8 high, 2 critical) — re-verified
unchanged; all dev-toolchain; accepted with rationale — carried.

## 2. Audit of `2edb5fb` (first-hand full-diff verification)

The commit's own claims, verified against the diff, the final tree, and live
runs:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | The PDP embeds `serializeJsonLd(jsonLd)` — one production line changed (+ the F-D rationale comment) | Diff read: `src/app/(storefront)/product/[slug]/page.tsx:58-64`; the import swapped and the single call wired | TRUE |
| 2 | `serializeJsonLd` is a pure seam — stringify → `<` → `\u003c` → U+2028 → U+2029, F-D rationale comment | `src/lib/structured-data.ts:63-74` read; no imports, no state | TRUE |
| 3 | The 4-case unit contract (breakout impossibility / line separators / JSON.parse round-trip / byte-identity with plain stringify on seed data) shipped and passes | `structured-data.test.ts` diff read; live run `npx vitest run src/lib/structured-data.test.ts` → 9/9 green (5 `productJsonLd` + 4 `serializeJsonLd`) | TRUE |
| 4 | The data block remains the codebase's ONLY `dangerouslySetInnerHTML` | `rg dangerouslySetInnerHTML src/` → one code hit (the PDP embed) + three comment mentions | TRUE |
| 5 | No test change — the E2E JSON-LD pin passed UNCHANGED | `git show 2edb5fb` touches only `structured-data.test.ts` (unit); the security-csp spec untouched; the baseline E2E run passes it live | TRUE |
| 6 | Docs aligned: SKILL v1.13.0 (project_state 142/142), README badge 142+170, CLAUDE 142 + seam list, PAD 17\|142 + the rewritten XSS row | All re-read this session — counts and the `serializeJsonLd` mentions present | TRUE |
| 7 | Screenshots refreshed in the commit footprint (4 binary refreshes; the other 5 re-captures byte-identical) | `git show --stat` | TRUE |
| 8 | `.env.example` tracked with the identical contract | `git ls-files .env.example` non-empty; both files pin `file:../db/custom.db` | TRUE |
| 9 | `a54d0b0` adds only the session-20 transcript (docs only) | `git diff 2edb5fb..a54d0b0 --stat` → `docs/session_20.md` only | TRUE |

`npm audit` composition re-verified: 11 findings (1 moderate, 8 high, 2
critical), all dev-toolchain — matches the ledger.

**Findings (new, this audit): none at the code level.** The fresh probe of
the neighboring seams (`next.config.ts` — `remotePatterns` scoped to
`images.unsplash.com` only; `/api/search` — rate-limited 60/min/IP, `q`
capped at 80, `limit` clamped 1..10, best-effort errors; `src/proxy.ts` —
as audited in session 20; the cart add path — Zod 1..99 + clamp-to-stock +
bounded P2002 retry + sold-out guard) surfaced no new production findings.
The session's remediation therefore targets the top CARRIED finding.

## 3. Live reference sweep — round 16 (measured 2026-10-16): ZERO drift

Round-16a census (pre-change, committed tree) byte-equal to the
session-9..20 ledger on EVERY field:

| Surface (ledger) | Reference (16a) | Clone (16a) | Verdict |
|---|---|---|---|
| Desktop page | **11079** | 11085 (+6) | known line-box rounding |
| Desktop sections | 810/70/835/706/835/835/3549/835/835/746/470 | 810/70/836/706/836/836/3551/836/836/746 | ≤ +2px each — byte-parity holds |
| Desktop footer | 444 | 444 | equal |
| Mobile page | **11257** | 11264 (+7) | known rounding |
| Mobile sections | 591/70/800/742/800/840/**3171**/800/800/774/569 | 591/70/801/742/801/841/**3174**/801/801/774 | deals 3174 — session-9 pinned residue |
| Mobile footer | 1189 | 1189 | equal |
| Font census h1/h2/h3 | 100% Cormorant (1/11/36) | 100% Cormorant (1/13/42 — superset counts) | families hold |
| Font census h4 | Montserrat ×3 | Montserrat ×3 | holds |
| Mobile drawer panel | `fixed left-0 top-0 h-full w-80 bg-background z-50 p-8 flex flex-col gap-6` | **char-identical** | holds |
| Mobile drawer nav | `flex flex-col gap-5 mt-4`, 5 items x=32/w=256, gaps [20,20,20,20] | **identical** (y-rows identical too) | v4 pin intact |
| Size chips (resting) | 10px / 10px pad / 4px py / r0 / transparent / rgb(229,224,220) | identical | P-11 holds |
| Card-name h3 | Cormorant (72px desktop / 48px mobile) | identical | P-15 holds |
| Marquee | present | present | P-3 holds |
| Console (clone) | — | clean | zero errors |

**The reference has now held still across THIRTEEN consecutive same-day
sweeps (sessions 9→…→21).**

## 4. The H-56/H-59 closure — mechanism measured BEFORE writing a line

The carrier note ("disclosed E2E gaps — DB-mocking harness", carried since
session 10) assumed the action-level rejections were unreachable from E2E
because "UI surfaces cannot post a foreign size". **The assumption is
false**: a Next.js server action is an HTTP endpoint — POST the page URL
with `Next-Action: <actionId>` and a JSON-array body, and the action runs
server-side exactly as invoked. The canonical seed IS the fixture (no
mocking, no harness). Measured against the production standalone before any
spec was written:

- **Action-ID source (authoritative):** the standalone's per-route manifest
  `.next/standalone/.next/server/app/(storefront)/product/[slug]/page/
  server-reference-manifest.json` — exactly 4 IDs, the full action surface
  of the PDP route. Read at test time from `process.cwd()` (trap #13).
- **Wire format (measured):** `POST /product/<slug>` with
  `Content-Type: text/plain;charset=UTF-8`, body `["arg1","arg2",…]`,
  header `Next-Action: <id>` → HTTP 200, the ActionResult envelope embedded
  in the flight body (`1:{"ok":false,"error":{"message":"…"}}`), errors are
  envelopes (never 500), and NO `Set-Cookie` on any rejection path.
- **Candidate discrimination (all write-free, measured):**
  P1 `[<nonexistent-id>,"XXL",1]` → the two cart-line actions answer
  "That bag line no longer exists."; the two product-arg actions answer
  "This piece is no longer available.".
  P2 `[<nonexistent-id>]` (one arg) → `addToCartAction` fails its Zod gate
  ("Invalid bag request." — the qty arg is absent), `toggleWishlistAction`
  still answers "This piece is no longer available." → the pair splits
  with zero writes (both rejections precede any DB access).
  P3 `[<seedProductId>,"XXL",1]` — the actual H-59 payload — is sent ONLY
  to the candidate identified as `addToCartAction` → answers
  **"Invalid bag request."** via the `sizeAllowed` branch (Zod passes:
  productId exists, size ≤20 chars, qty int; the rejection is the H-59
  allowlist itself), with NO `Set-Cookie` and ZERO cart rows created
  (verified by a live DB count).
- **IDOR census (design):** the two cart-line actions are probed against a
  SQL-fixture guest cart + item (the H-2/M-1 `prisma db execute` pattern,
  token-derived ids, self-cleaning) while unauthenticated — both must fail
  closed (ok:false, no 5xx) and the fixture row must SURVIVE (the
  ownership wall held under direct wire attack).
- Message uniqueness verified: `"Invalid bag request."` appears only in
  `src/lib/actions/cart.ts` (the H-59 branch) — a safe discriminator.

## 5. TDD plan

1. **GREEN-first (no false positives):** write
   `tests/e2e/action-seam-security.spec.ts` — 4 cases × 2 projects:
   (a) the PDP manifest exposes exactly 4 action ids (build-shape canary —
   fails loudly if Next changes the format);
   (b) H-59 closed over the wire: the discrimination ladder + P3 →
   "Invalid bag request." + no Set-Cookie + `cartItem.count` for the seed
   product === 0 after the probe (direct Prisma read of `db/e2e.db`);
   (c) IDOR census: the SQL-fixture guest bag line probed via both
   cart-line actions while unauthenticated → ok:false + the fixture row
   survives;
   (d) fail-closed census: every candidate × the write-free payloads
   (P1/P2) → HTTP 200 + an ok:false envelope, never a 5xx, never a
   Set-Cookie.
   Run against the CURRENT build → must be GREEN (the behavior exists since
   session 9; the gate proves no false positives).
2. **RED by mutation (the gate demonstrably precedes the protection it
   pins):** temporarily disable the H-59 branch in
   `src/lib/actions/cart.ts` → rebuild (trap #16) → case (b) must FAIL
   (the P3 probe answers ok:true, mints a cart cookie, writes rows);
   cases (a)/(c)/(d) stay green (surgical RED).
3. **GREEN again:** restore the branch → rebuild → full spec green.
4. Full E2E on the final tree → round-16b census byte-equal to 16a (the
   spec adds ZERO production change — rest-invariance expected by
   construction and proven by measurement) → final gates re-run after the
   last file change (trap #28).

## 6. ToDo ledger (execution order)

| # | Item | Status |
|---|---|---|
| 1 | Workspace reconciliation (tree = `origin/main a54d0b0`) + warm-env verification (`.env` contract, seed 4/12/2/4, chromium v1248) | ✅ |
| 2 | Baseline fully green on every gate (ninth consecutive session) | ✅ |
| 3 | First-hand audit of `2edb5fb` + `a54d0b0` (9 claims, npm-audit composition, neighboring-seam probe) | ✅ |
| 4 | Parity sweep round 16a (both viewports, zero drift — 13th consecutive) | ✅ |
| 5 | H-59 wire mechanism measured first-hand (manifest source, wire format, write-free discrimination ladder, IDOR design) | ✅ |
| 6 | E2E spec written (`action-seam-security.spec.ts`, 4 cases × 2) → GREEN on the current build | ✅ |
| 7 | Mutation demo: H-59 branch disabled → rebuild → case (b) RED, others green (surgical) | ✅ |
| 8 | Branch restored → rebuild → spec GREEN again | ✅ |
| 9 | Full E2E on the final tree: 178 passed + 2 skipped (89 unique × 2 − 2 viewport skips + 2 setup; arithmetic exact) | ✅ |
| 10 | Round 16b post-change census: byte-equal to 16a on every field | ✅ |
| 11 | Final gates re-run after the last file change (trap #28) | ✅ |
| 12 | Scratch artifacts deleted (never committed); screenshots refreshed; `.env.example` contract re-verified | ✅ |
| 13 | Docs alignment: SKILL v1.14.0 (project_state + §2 E2E row 89/178 + §9 trap #34 + §11 verify line + Appendix B row), README badge + testing counts, CLAUDE gate line + testing-strategy bullet, PAD test table + coverage-map + threat-model XSS/IDOR rows, this plan, worklog session-21 entry | ✅ |
| 14 | Commit to main; SSH-wrapper v3 push (dry-run first, key shredded, remote ref verified) | ✅ (at push time) |

## 7. Verification ledger (post-remediation, evidence-backed)

- **Spec GREEN-first (observed):** `npx playwright test
  tests/e2e/action-seam-security.spec.ts` → 8 passed (4 × 2 projects) on
  the committed build — no false positives, the discrimination ladder
  resolves all four candidates deterministically.
- **Mutation RED (observed):** with the H-59 branch disabled and the bundle
  rebuilt → case (b) failed on BOTH projects (the P3 probe returned
  ok:true + `Set-Cookie: aurelia_cart` + a live cart row), cases
  (a)/(c)/(d) still passed — the gate caught exactly the regression it
  pins, surgically.
- **GREEN restored (observed):** branch restored, rebuilt → 8/8 passed.
- **Full E2E (observed):** rebuild → **178 passed + 2 skipped** (89 unique
  × 2 − 2 viewport skips + 2 setup; arithmetic exact).
- **Round 16b (observed):** post-spec tree → census byte-equal to 16a on
  every field — the session's changes are test-only, rest-invariant BY
  MEASUREMENT.
- **Final gates (observed, trap #28):** typecheck ✓ lint ✓ 142/142 unit ✓
  build + assemble ✓ — re-run after the last file change.
- **Screenshot refresh (observed):** the sweep's `--shots` mode re-captured
  the seven clone surfaces + two reference captures against the final
  standalone; the mobile drawer capture visually verified (five-item panel,
  VELOUR logotype, 20px gaps, flush-left w-80).

## 8. Residual risks / next steps

1. `color-contrast` remains excluded from the axe gate BY DOCUMENTED DECISION
   (parity law §1/§4/§19) — unchanged.
2. `style-src 'unsafe-inline'` remains BY DOCUMENTED DECISION (React inline
   styles + Tailwind). Carried, documented in the CSP seam itself.
3. Real PSP behind the checkout seam (carried) — needs external credentials
   + a non-hermetic E2E story; stays behind the checkout action seam.
4. Dev-toolchain npm-audit findings — revisit when vitest 5 / prisma 7 land
   non-breaking paths (carried; composition re-verified this session).
5. G-3 POSIX-only sweep paths — fix before using the tool on Windows
   (carried; no Windows target in scope).
6. **NEW carrier:** the action-ID manifest canary (spec case a) is coupled
   to the standalone build's manifest shape — a Next.js major upgrade that
   moves the file changes ONE spec with a loud, self-explanatory failure
   (by design, not a silent pass).
7. Keep running the FULL two-census ritual every session — thirteen
   same-day zero-drift sweeps is a streak, not a guarantee (session-10 §6
   #5).
8. If the reference re-adds the drawer ACCOUNT/WISHLIST tail, restore the
   clone's tail and re-pin 7 items (session-8 §6 #7 — unchanged).
9. H-56 (the cart-merge skip early-return) keeps its unit-level coverage;
   its E2E story rides the existing guest-cart-merge spec (H-21 pin) — no
   separate harness needed; the "DB-mocking harness" carrier is CLOSED as
   unnecessary by this session's wire-level approach.
