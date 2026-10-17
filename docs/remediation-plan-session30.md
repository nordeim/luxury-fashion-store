# Remediation Plan — Session 30 (AURELIA / VELOUR clone)

> **Status:** PLANNED → EXECUTED this round (the session-29 continuation, named
> for the next session number per the standing precedent).
> **Mode:** Verify-first (Mode C) → reconciliation of the pulled remote
> (`be652c9` the session-29 F-Y/F-Z round + `ed22b65` its session log) →
> first-hand audit → live-reference parity sweep round 25 → fresh audit pass →
> one gate-coverage remediation (F-AA). **Scope:** the session-29 commit
> audited TRUE first-hand (the F-Y spec and the F-Z case verified in full
> source AND over the wire — the two gates re-run green combined: 52 passed
> incl. the 2 setup, exactly 18 + 32 + 2); **the round-25a census measured
> ZERO DRIFT** (25th/26th consecutive clone-side sweeps — the reference
> byte-stable against the round-24 ledger, mainKids 11 both sides both
> viewports, drawer gaps [20,20,20,20] — the v4 mobile-nav pin holds, the
> standing task re-check); **the fresh pass opened one seam no prior round
> audited** — the static transport-header contract (`next.config.ts`
> `async headers()`: six headers declared there AND in AGENTS.md/README, zero
> wire-layer assertions anywhere in `tests/`) — and found **F-AA**, LOW
> gate-coverage, zero product defect (the headers serve today — verified
> first-hand by the round's plan probe, 21/21).

---

## 1. Starting state

WARM workspace fast-forwarded `be652c9..ed22b65` (the pull brought only
`docs/session_29.md` — the previous thread's session log; docs only, no
code). The recurring reset set FIRED in full this round — four incidents,
all recovered before any gate ran:

| Step | Result |
|---|---|
| `git pull` | ✓ fast-forward to `ed22b65`; `skills/` pruned again (339 entries) → `git restore -- skills/`; stray `bun.lock` → deleted |
| `.env` | ⚠️ rewritten ABSOLUTE (`file:/home/z/my-project/db/custom.db`) → re-pinned to the canonical 3-line contract in one write (the session-28 truncation lesson applied) |
| Playwright cache | ⚠️ present but the WRONG BUILD only (v1200; the pinned 1.64.0 needs v1248 — third recurrence) → `npx playwright install chromium` |
| `bin/ssh` shim + paramiko | ⚠️ both wiped → shim rebuilt (venv shebang, skill-doc Appendix A verbatim) + paramiko 5.0.0 reinstalled into `/home/z/.venv` |
| `db/custom.db` | ⚠️ EMPTY (zero rows — the session-22 class) → `npm run db:setup` restored canonical 4/12/2/4 (verified via `env -u DATABASE_URL` count) |
| `core.fileMode false` | ✓ survived |

**Baseline gates on the committed tree (TWENTY-SECOND consecutive session
fully green at baseline):** typecheck ✓ · lint ✓ · **173/173 unit (19
files)** ✓ · build + assemble ✓ (E2E runs at the final gate).

## 2. Audit of `be652c9` (first-hand full-source verification)

Composition: the new `tests/e2e/api-contract.spec.ts` (228 lines, 9 unique
cases) + the brand-metadata F-Z case (+40 lines) + the new
`scripts/plan-probe-session29.cjs` (134 lines, 13 checks) + 4 screenshot
re-captures + `docs/remediation-plan-session29.md` (281 lines) +
README/CLAUDE/PAD/SKILL v1.22.0 alignment + worklog. Claims verified against
the final tree:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | The F-Y spec pins the four REST contract groups over the wire exactly as planned | `tests/e2e/api-contract.spec.ts` read in full — the health liveness envelope (exact-body pin), the search fast path / five-field DTO with the integer-cents assertion / F-12 no-hit degradation / limit clamp, the newsletter success + idempotent-upsert (row-count via the scratch-probe `dbRead`, spawnSync args-array — trap #34) + Zod 400 envelopes, the 405 method matrix (status pinned, never the absent Allow header); the spec-unique email SQL-cleaned in afterAll | TRUE |
| 2 | The F-Y + F-Z gates are GREEN on the fresh build | `npx playwright test tests/e2e/api-contract.spec.ts tests/e2e/brand-metadata.spec.ts` re-run: **52 passed** (9×2 + 16×2 + the 2 setup — exactly the 20 + 34 ledger shapes minus the double-counted setup) | TRUE |
| 3 | The F-Z case derives its fetch list from the SERVED DOM (no duplicated literals) | the case diff read in full — `link[rel="preload"][as="font"]` evaluateAll → per-href GET → 200 + `font/woff2` + >100-byte body | TRUE |
| 4 | The plan-probe discipline artifact exists | `scripts/plan-probe-session29.cjs` present, 13 `check(` calls matching the plan's 13 assumptions; NOT re-run this round — its assumptions are permanently encoded in the green F-Y spec itself (the stronger witness) | TRUE |
| 5 | Docs aligned (SKILL v1.22.0 frontmatter 118/236+2, §2 E2E row + Appendix B session-29 row; README badge 173+236 + the API feature row; CLAUDE.md gate line 118 + the API-contract gate description; PAD test table 17\|118\|236 + §7.1 session-29 paragraph) | all five docs read this round; counts consistent | TRUE |

**Verdict: 5/5 claims TRUE, zero production regressions.**

## 3. Live reference sweep — round 25a (measured 2026-10-17): ZERO DRIFT

The single-census pre-remediation pass (the 25b `--shots` pass closes the
ritual after the test-only round). The reference is byte-stable against the
round-24 ledger — **25th consecutive clone-side sweep**:

| Ledger field | Round-24 ledger | Round-25a measured | Verdict |
|---|---|---|---|
| ref desktop pageH / mainKids | 11079 / 11 | 11079 / 11 | byte-stable |
| clone desktop pageH | 11085 | 11085 | byte-stable |
| ref mobile pageH / mainKids | 11257 / 11 | 11257 / 11 | byte-stable |
| clone mobile pageH | 11264 | 11264 | byte-stable |
| footers | 444 / 1189 | 444 / 1189 | byte-stable |
| drawer panelCls/navCls | char-identical | identical | byte-stable — **the mobile-nav v4 pin holds** (`w-80` + `flex flex-col gap-5`, gaps [20,20,20,20]; the standing task re-check) |
| clone console | clean | clean | byte-stable |
| ref console | the documented 2× 401 residue | identical | documented residue |

Four stable sweeps since the round-21 move.

## 4. Fresh audit pass — finding (the round's target)

Opened via the unexercised-contract census: `rg "X-Frame-Options|Referrer-Policy|nosniff|Strict-Transport" tests/ src/` (zero hits in tests/), the headers-of-record read in `next.config.ts`, and the AGENTS/README declaration grep.

1. **F-AA — the static transport headers are declared twice but pinned
   nowhere.** `next.config.ts` `async headers()` ships SIX security headers
   on `/:path*` — `Referrer-Policy: strict-origin-when-cross-origin`,
   `X-Content-Type-Options: nosniff`,
   `Strict-Transport-Security: max-age=31536000`, `X-Frame-Options: DENY`,
   `Permissions-Policy: camera=(), microphone=(), geolocation=(),
   interest-cohort=()`, `Cross-Origin-Opener-Policy: same-origin` — and both
   AGENTS.md and README declare the transport contract in prose ("Security
   headers … ship from `next.config.ts`"). The CSP is deliberately NOT in
   that block (minted per-request by `src/proxy.ts` since N-1 — the config
   comment documents why). Yet the grep census shows the only header
   assertions in `tests/` are content-type / set-cookie / cache-control /
   location + the dynamic CSP — the six static headers have ZERO wire-layer
   pins. A typo'd key or a dropped line in `next.config.ts` would silently
   strip e.g. `X-Frame-Options: DENY` from every response with every gate
   green. Severity: LOW (gate-coverage gap; the headers serve today — all
   six verified first-hand on three route classes by the round's plan probe,
   21/21). Same family as F-Y: a declared contract the gates never exercise.
   Remediation: extend `tests/e2e/security-csp.spec.ts` (the security/transport
   gate — the F-Z precedent of landing inside the owning spec) with a new
   describe block, three cases — one per route class (document root, deep
   PDP route, API route) — each asserting all six exact values. No
   production change.

INFO-level (verified, no action):
- The login `?redirect=` open-redirect defense (`validateRedirectPath`,
  `src/lib/validation.ts:122`) is robust (scheme/`//`/`/\`/CRLF/`://`
  rejected, 512-cap, fallback `/account`) and unit-pinned at
  `validation.test.ts:146` — 7 cases incl. the `//evil.example` and
  `https://evil.example` bypass shapes. The wire behavior additionally rides
  the H-21 merge pin's `?redirect=/cart` login flow. No gap.
- The admin role gate IS wire-pinned (`admin.spec.ts` "customers are
  redirected away from /admin") — candidate dismissed.
- `/_next/static` immutable caching is a Next framework contract, not a
  product declaration (the `next.config.ts` comment explicitly scopes the
  fonts block away from it) — not pinned, not owed.
- The docs' four-header abbreviation (AGENTS/README: "Referrer-Policy,
  nosniff, HSTS, X-Frame-Options: DENY") under-declares the six-header
  reality (Permissions-Policy + COOP unmentioned) — docs-alignment note,
  folded into this round's doc updates.
- The F-M font-cache pin covers the `/fonts/:file*` block; the six-header
  block is the only unpinned `headers()` entry.

### Honest-gate decisions (run before planning)

- **F-AA adds gate coverage; it changes no product behavior.** The served
  DOM is untouched; the parity census cannot drift (test-only round).
- **No gate is weakened.** The five N-1/F-B cases are untouched; the new
  describe is additive inside the owning spec file; no vitest/playwright
  config edits (the spec matches the existing `tests/e2e/*.spec.ts` glob);
  no new npm dependencies; `.env.example` unchanged; money untouched.
- **Exact-value pins, not substring pins** — each header asserted `===` the
  next.config.ts declaration (the plan probe's EXPECTED map), so a value
  drift (not just key loss) fails the gate.
- **Route-class coverage**: `/` (the document root), the canonical PDP (a
  deep document route — proves `/:path*` isn't root-only), and
  `/api/health` (the API class — the headers wrap the REST surface too).
  One case per class keeps failures surgical (a dropped header fails all
  three; a route-scoped regression fails exactly one).

## 5. Remediation design (TDD)

### ToDo

| # | Task | Layer | Gate |
|---|---|---|---|
| 1 | `scripts/plan-probe-session30.cjs` — NEW probe: boots the standalone on :3204, asserts all six headers `===` exact values on `/`, the PDP, and `/api/health` (21 checks) BEFORE the spec is written | tooling | node script |
| 2 | `tests/e2e/security-csp.spec.ts` — NEW describe "static transport headers (F-AA, session-30)": three cases (/, PDP, /api/health), each asserting the six exact values from the probe's EXPECTED map; the spec header gains the session-30 note | E2E | playwright |
| 3 | Mutation demo (surgical, inverse-restore — traps #37/#39): delete the `X-Frame-Options` line from `next.config.ts` → REBUILD (trap #16: the standalone serves the assembled copy) → exactly the F-AA cases fail (all three route classes; the five N-1/F-B cases stay green) → restore, `git diff` clean, rebuild | process | playwright |
| 4 | Round-25b census — MUST be byte-stable vs the 25a ledger (test-only round; the verdict closes the rest-invariance claim); `--shots` refreshes the screenshot set | parity | sweep tool (--shots) |
| 5 | Final gates on the final tree: typecheck → lint → unit → build → full E2E | gates | npm run verify + test:e2e |
| 6 | Docs alignment: README (badge 173+242, the Production section's header inventory gains Permissions-Policy + COOP + the gate mention), CLAUDE.md (gate line 121 + the security gate description gains the static-header pin), PAD (test table 17\|121\|242, §7.1 session-30 paragraph), SKILL (frontmatter version/project_state, §2 E2E row, Appendix B session-30 row for F-AA), AGENTS.md (the Build & deploy header line gains the full inventory + the gate), this file's execution record, worklog | docs | stale-count sweep |

### Count ledger (expected post-remediation)

| Metric | Before | After |
|---|---|---|
| unit files / tests | 19 / 173 | 19 / 173 (no new pure seam — the finding is wire-layer) |
| E2E spec files | 17 | 17 (security-csp extended in place) |
| unique E2E cases | 118 | 121 (+3 F-AA) |
| E2E result | 236 passed + 2 skipped | 242 passed + 2 skipped (121 × 2 − 2 desktop-only skips + 2 setup) |

## 6. Validation of this plan against the codebase (pre-execution)

- `scripts/plan-probe-session30.cjs` ran FIRST (the session-29 plan-probe
  discipline): **21/21 checks passed** — all six headers serve with the
  EXACT next.config.ts values on `/`, `/product/silk-draped-evening-gown`,
  and `/api/health` on the fresh build.
- The security-csp spec's describe inventory read in full (5 cases, one
  describe) — the new describe is additive, no existing case modified.
- The `/api/health` route is a route HANDLER (not a document) — the probe
  confirms the header block wraps it; the F-AA case pins that class too.
- No schema/env/seed changes; money untouched; no revalidatePath surface;
  `.env.example` unchanged; `next.config.ts` untouched by the remediation
  itself (the mutation demo's temporary edit is restored and verified).
- The census measures the home page only — a test-only round cannot drift
  it; the ritual still runs as the verdict (trap #40's discipline).

## 7. Execution record

| # | Task | Result |
|---|---|---|
| 1 | plan-probe | ✅ `scripts/plan-probe-session30.cjs` — **21/21 checks passed** on the fresh build: all six headers `===` the next.config.ts values on `/`, the PDP, and `/api/health` (three route classes) — every contract assumption wire-verified BEFORE the spec was written |
| 2 | F-AA cases (security-csp.spec.ts) | ✅ NEW describe "static transport headers (F-AA, session-30)" — three cases (document root / deep PDP route / API route class), each asserting the six EXACT values via the shared `TRANSPORT_HEADERS` map; typecheck ✓; GREEN **18 passed** (5 N-1/F-B + 3 F-AA) × 2 + 2 setup |
| 3 | Mutation demo | ✅ the `X-Frame-Options` line deleted from `next.config.ts` → REBUILD (trap #16) → **exactly the 6 F-AA cases failed** (3 × 2 projects; all 10 N-1/F-B cases stayed green — the gap's exact shape: a dropped declared header fails only the new gate) → restored via `git checkout` (diff clean) → rebuild → 18/18 green |
| 4 | Round-25b census (--shots) | ✅ ZERO DRIFT — byte-identical to 25a in ALL census fields (25th/26th consecutive): mainKids 11 both sides both viewports; pageH 11079/11085 + 11257/11264; footers 444/1189; drawer objects char-identical (the v4 mobile-nav pin holds); ref console = the documented 2× 401 residue; clone console clean — the test-only round proven rest-invisible by measurement; 5 screenshots refreshed (live-variance pattern) |
| 5 | Final gates on the final tree | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **242 passed + 2 skipped** (121 unique × 2 − 2 desktop-only skips + 2 setup; 4.7m) — the TWENTY-SECOND consecutive fully-green session, exactly the §5 count ledger |
| 6 | Docs alignment + stale-count sweep | ✅ README (badge 173+242, the Production section's full six-header inventory + the gate mention); CLAUDE.md (gate line 121 + the security-gate description gains the static-header pin); PAD (test table 17\|121\|242, §7.1 session-30 paragraph); SKILL v1.23.0 (frontmatter version/project_state, §2 E2E row, Appendix B NEW session-30 row); AGENTS.md (the Build & deploy header line gains the full inventory + the gate); this file's record; worklog. Stale-count sweep: zero stale counts |

## 8. Residual risks / next steps (post-F-AA)

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
    stays mandatory. Four stable rounds since the round-21 move.
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
