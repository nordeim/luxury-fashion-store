# Remediation Plan — Session 19 (AURELIA / VELOUR clone)

> **Status:** EXECUTED. **Mode:** Verify-first (Mode C) → warm-workspace
> re-validation → audit → sweep → TDD remediation. **Scope:** (1) reconciliation
> of the pulled remote `03c66b6` (the session-18 work `a55a631` + the
> user-added session-18 transcript; the workspace carried only environment
> file-mode churn and a `skills/` mirror rewrite — no project work — restored
> to `origin/main`); (2) an audit of the never-audited session-18 commit
> `a55a631` (skills: `code-review-checklist`, `security-and-hardening`, `tdd`,
> per `skills/skills-catalog.md`) — all claims verified first-hand; (3) a
> **live reference parity sweep round 14** (desktop 1440×900 + mobile 390×844,
> FULL two-census ritual) — **ZERO drift, the ELEVENTH consecutive**; (4) the
> top carried finding **N-1** opened and TDD-remediated: the production CSP
> retires `script-src 'unsafe-inline'` in favor of a **per-request nonce**
> (`src/proxy.ts` + the pure `src/lib/csp.ts` seam), verified against the
> installed Next 16.4.0 nonce plumbing before a line was written; (5) audit
> findings **F-B** (README claimed PDP JSON-LD the code never had — code
> catches up to the docs with a pure `productJsonLd` seam) and **F-A** (the
> admin axe fixture's hardcoded session id hardened to a token-derived id)
> folded into the same remediation.

---

## 1. Starting state

The workspace was warm (node_modules, chromium v1248, seeded `db/custom.db`)
but `.env` had drifted to an absolute `DATABASE_URL` — re-pinned to the
contract `DATABASE_URL="file:../db/custom.db"` (+ dev `AUTH_SECRET`,
`NEXT_PUBLIC_SITE_URL`) per AGENTS.md; `.env.example` verified tracked with
the identical contract. `db/custom.db` was present but EMPTY (0/0/0/0) —
re-materialized with `env -u DATABASE_URL npm run db:setup` → canonical
4/12/2/4. Playwright's chromium headless-shell v1248 was missing from the
cache (the known sessions-6+ quirk) — `npx playwright install chromium`
restored it. The sandbox `DATABASE_URL` leak persists — all DB/build commands
run `env -u DATABASE_URL` (§9 #12). Container paths (`skills/*` rewrite,
`upload/`, `download/`) remain locally excluded via `.git/info/exclude`
(never the committed `.gitignore`).

**Baseline gates on the committed tree (all reproduce the session-18 ledger;
SEVENTH consecutive session fully green):**

| Gate | Result |
|---|---|
| typecheck | ✓ |
| lint | ✓ |
| unit | ✓ 122/122 (15 files) |
| build + assemble | ✓ |
| E2E | ✓ 160 passed + 2 skipped (80 unique × 2 − 2 viewport skips + 2 setup) |

`npm audit`: 11 findings (1 moderate, 8 high, 2 critical) — re-verified
unchanged; all dev-toolchain; accepted with rationale — carried.

## 2. Audit of `a55a631` (first-hand full-diff verification)

The commit's own claims, verified against the diff and the final tree:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | Production diff = exactly ONE attribute-level accessible-name composition | `git show a55a631 -- src/` touches ONLY `admin-products-table.tsx` — the visibility toggle composes `Visible, hide <name>` / `Hidden, show <name>` from the same state the visible word renders, trap-#32 rationale comment present | TRUE |
| 2 | The M-1/L-3 gate spec contract | `tests/e2e/accessibility-axe.spec.ts`: FOURTEEN surfaces × both projects — 7 logged-out (empty storageState) + 3 logged-in (per-project reuse, self-cleaning fixtures) + 4 admin (dashboard/products/orders/order-detail-via-first-link) behind a SQL-minted admin storageState (INSERT…SELECT, admin id resolved by the DB, row deleted in `afterAll`); A+AA tags; `color-contrast` the single loud exclusion | TRUE |
| 3 | `E2E_AUTH_SECRET` shared by both consumers | `tests/e2e/e2e-secrets.ts` exported `playwright-e2e-session-secret` (byte-identical to the previously inlined value); imported by BOTH `playwright.config.ts` (webServer env) and the gate spec (offline HMAC) — drift impossible by construction | TRUE |
| 4 | axe-core load-bearing | devDependency `axe-core@^4.10.0`; the only real consumer is the gate spec (`rg -l` also hits a prose comment in `admin-products-table.tsx`) | TRUE |
| 5 | RED 2/28 → GREEN 30/30 evidence | plan-session18 §5/§6 records the RED state (admin products × both projects, `label-content-name-mismatch(serious)×12`); the GREEN state re-observed live this session — the 14-surface gate passes inside the full suite (160+2) | TRUE |
| 6 | Round-13 zero-drift census | plan-session18 §3 matches the ledger set — and round-14a of THIS session reproduced every field byte-for-byte | TRUE |
| 7 | Docs aligned (152→160, 76→80, trap #32, fourteen-surface bullet) | SKILL v1.11.0 (project_state, §2, §8, §9 #32, §11, Appendix B), README badge + 3 count mentions, CLAUDE gate line + admin-minting bullet, PAD test table line 412 — all re-read this session | TRUE |
| 8 | `.env.example` tracked, screenshots refreshed | `git ls-files .env.example` non-empty; four refreshed screenshots in the commit footprint; §11 pin re-run this session | TRUE |

`03c66b6` (user commit): adds `docs/session_18.md` (68 lines, the session-18
transcript) — docs only, no code. No action needed.

**Findings (new, this audit):**

- **F-A (LOW, test-infra):** the admin axe fixture inserts the session row
  with the HARDCODED id `'admin-axe-gate-session'`. Safe today (workers:1 —
  the two projects run sequentially in ONE worker, `afterAll` deletes the row
  before the second `beforeAll` re-inserts), but any future bump to
  `workers: 2` collides two concurrent INSERTs on the `Session` PK. Fix:
  derive the id from the per-run random token (`'admin-axe-gate-' ||
  token`) — collision-free under any parallelism, zero behavior change.
- **F-B (LOW, docs-vs-code):** README line 21 claims the PDP ships
  "JSON-LD"; `rg -i "json-ld|jsonld|application/ld" src/` finds NOTHING —
  the claim is false of the code. SKILL §12 #8: docs drift IS code drift.
  Fix direction: the clone is a functional SUPERSET and JSON-LD is a
  headless SEO feature (invisible at rest — parity-safe): IMPLEMENT the
  feature so the docs become true (Product + Offer, seeded data only).
- **F-C (INFO):** the axe gate injects axe via `page.addScriptTag` —
  subject to CSP. Under N-1's nonce-only `script-src` this injection would
  be blocked; the gate needs the Playwright context option
  `bypassCSP: true` (test-harness-only — axe is not app code). Handled as
  part of N-1.

## 3. Live reference sweep — round 14 (measured 2026-10-16): ZERO drift

Round-14a census (pre-change, committed tree) byte-equal to the session-9..18
ledger on EVERY field:

| Surface (ledger) | Reference (14a) | Clone (14a) | Verdict |
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
| Mobile drawer nav | `flex flex-col gap-5 mt-4`, 5 items x=32/w=256/h=20, gaps [20,20,20,20] | **identical** | v4 pin intact |
| Size chips (resting) | 10px / 10px pad / 4px py / r0 / transparent / rgb(229,224,220) | identical | P-11 holds |
| Card-name h3 | Cormorant (72px desktop / 48px mobile) | identical | P-15 holds |
| Marquee | present | present | P-3 holds |
| Console (clone) | — | clean | the two 401s are the REFERENCE's own auth probe |

**The reference has now held still across ELEVEN consecutive same-day sweeps
(sessions 9→…→19).**

## 4. The N-1 seam — measured before writing a line

**Nonce plumbing verified against the INSTALLED next 16.4.0** (measurement,
not memory):

- `next/dist/server/route-modules/app-page/parse-request-headers.js:30-31`
  reads `content-security-policy` (or `-report-only`) from the REQUEST
  headers → `getScriptNonceFromHeader` (first `'nonce-<b64>'` in
  `script-src`, else `default-src`) → the nonce flows into app-render and
  onto every script tag Next controls.
- `next/dist/server/app-render/get-script-nonce-from-header.js` — the nonce
  regex `^'nonce-([A-Za-z0-9+/_-]+={0,2})'$` (standard base64 fits).
- The proxy convention: `src/proxy.ts` with a named `proxy` export
  (`get-page-static-info.js:268` accepts `/proxy` or `/src/proxy`; Next 16
  ERRORS if both middleware and proxy exist — "middleware-to-proxy").
- The repo's own source has ZERO hand-written inline scripts
  (`rg "<script|dangerouslySetInnerHTML" src/` → clean), so the ONLY inline
  scripts are Next's own bootstrap/RSC payloads — exactly what the nonce
  mechanism covers. Chunk scripts load via `'self'`.

**The design:** a pure seam `src/lib/csp.ts`
(`buildCspHeader({ nonce, isDev })`) + `src/proxy.ts` (mints a 128-bit
Web-Crypto nonce per request, sets the CSP header on BOTH the request — so
Next reads the nonce — and the response — so the browser enforces it;
dev keeps `'unsafe-inline' 'unsafe-eval'` per F-7/§9 #17). `next.config.ts`
drops its static CSP entry (two CSP headers would intersect — the static
`unsafe-inline` would defeat the nonce); the other six security headers stay
exactly where they are. `style-src 'self' 'unsafe-inline'` is UNCHANGED and
documented (React inline styles + Tailwind; the reference platform ships the
same). JSON-LD data blocks (`type="application/ld+json"`) are non-executing
data blocks — not gated by `script-src`; verified live in the GREEN run.

**TDD RED→GREEN (observed):**

1. Unit RED: `src/lib/csp.test.ts` (prod+nonce: script-src carries
   `'nonce-…'`, no `unsafe-inline` anywhere in script-src; dev: keeps
   `unsafe-inline`+`unsafe-eval`; style-src/other directives byte-stable;
   nonce format matches Next's regex; JSON-LD builder emits Product+Offer
   with seeded integer cents → dollars) + `src/lib/structured-data.test.ts`
   → both RED (modules absent).
2. Unit GREEN: `src/lib/csp.ts` + `src/lib/structured-data.ts` implemented;
   unit suite 122 → 138 (15 → 17 files), all green.
3. E2E RED: new `tests/e2e/security-csp.spec.ts` (5 cases × 2 projects) run
   against the CURRENT bundle → **8 failed / 4 passed** — the CSP-shape
   assertions fail on the static `'unsafe-inline'` CSP and the PDP JSON-LD
   assertion fails on the absent script (the hydration case passes
   vacuously while `unsafe-inline` still stands) — the gate demonstrably
   precedes the fix.
4. E2E GREEN: `src/proxy.ts` + the `next.config.ts` CSP removal + the axe
   gate's `bypassCSP: true` + the PDP JSON-LD integration → rebuild (trap
   #16) → the CSP spec passes on both projects; hydration asserted by the
   spec (parity-safe interaction + console clean) AND by the entire suite
   staying green.
5. **Measured mid-GREEN lesson (now trap #33):** the first GREEN run still
   failed the nonce-carrying case — browsers HIDE the `nonce` content
   attribute after parsing (`getAttribute("nonce")` → `""`, CSP
   nonce-hiding), while a raw fetch of the same URL shows all 16 inline
   scripts carrying the exact header nonce. The spec now asserts the
   SERVED BYTES (`response.text()`), the CSP ground truth — and the trap
   is recorded.

## 5. ToDo ledger (execution order)

| # | Item | Status |
|---|---|---|
| 1 | Workspace reconciliation (env-mode churn + skills-mirror noise restored away; tree = `origin/main 03c66b6`) + warm-env verification (`.env` re-pinned, seed 4/12/2/4, chromium v1248 installed) | ✅ |
| 2 | Baseline fully green on every gate (seventh consecutive session) | ✅ |
| 3 | First-hand audit of `a55a631` + `03c66b6` (8 claims + npm-audit composition, driven by `code-review-checklist` / `security-and-hardening` / `tdd`); findings F-A / F-B / F-C | ✅ |
| 4 | Parity sweep round 14a (both viewports, zero drift — 11th consecutive) | ✅ |
| 5 | Unit RED: `src/lib/csp.test.ts` + `src/lib/structured-data.test.ts` written first, observed failing | ✅ |
| 6 | Unit GREEN: `src/lib/csp.ts` + `src/lib/structured-data.ts` — unit suite 122 → 138 | ✅ |
| 7 | E2E RED: `security-csp.spec.ts` (5 cases × 2) observed failing on the pre-fix bundle (8 failed / 4 passed) | ✅ |
| 8 | E2E GREEN: `src/proxy.ts` (nonce on request+response), `next.config.ts` CSP removal, axe gate `bypassCSP`, PDP JSON-LD, F-A token-derived fixture id → rebuild → gate green (after the trap-#33 measurement correction: assert the served bytes, not `getAttribute`) | ✅ |
| 9 | Round 14b post-change census with the fixed tree: byte-equal to 14a on every field | ✅ |
| 10 | Full E2E on the final tree: **170 passed + 2 skipped** (85 unique × 2 − 2 viewport skips + 2 setup; arithmetic exact); final gates re-run after the last file change (trap #28) | ✅ |
| 11 | Scratch artifacts deleted (never committed); screenshots refreshed (`--shots`); `.env.example` contract re-verified | ✅ |
| 12 | Docs alignment: SKILL v1.12.0 (project_state, §2 rows, §8 CSP bullet, §9 trap #33, §11 verify line, Appendix B rows); README security + counts; CLAUDE gate line + CSP bullet; PAD test table + security-headers section; this plan; worklog session-19 entry | ✅ |
| 13 | Commit to main; SSH-wrapper v3 push (dry-run first, key shredded, remote ref verified) | ✅ |

## 6. Verification ledger (post-remediation, evidence-backed)

- **N-1 unit RED (observed):** `npx vitest run src/lib/csp.test.ts
  src/lib/structured-data.test.ts` before the modules existed → both files
  failed to resolve (RED by absence), all 15 existing files green.
- **N-1 unit GREEN (observed):** after implementation → 138/138 across 17
  files (`csp.test.ts` 11 tests, `structured-data.test.ts` 5 tests).
- **N-1/F-B E2E RED (observed):** `npx playwright test
  tests/e2e/security-csp.spec.ts` on the pre-fix bundle → **8 failed / 4
  passed** (10 spec tests + 2 setup) — the nonce-only, nonce-carrying,
  route-coverage and JSON-LD cases failed on BOTH projects (script-src
  still carried `'unsafe-inline'`; the PDP had no JSON-LD); the hydration
  case passed vacuously while `unsafe-inline` stood. 152 other tests green.
- **N-1/F-B E2E GREEN (observed):** after the proxy + PDP change, a full
  rebuild, and the trap-#33 test correction → the CSP spec passes 12/12 (10
  spec + 2 setup; header shape: `script-src 'self' 'nonce-…'`, zero
  `unsafe-inline`; all 16 inline scripts carry the exact request nonce in
  the SERVED BYTES; hydration click lands; console clean; PDP JSON-LD
  parses with `@type: Product` + the seeded 2850.00 price). A raw curl of
  the standalone shows a FRESH nonce per request — per-request minting
  measured first-hand.
- **Round 14b (observed):** post-fix tree → census byte-equal to 14a on
  every field — the CSP/JSON-LD work is rest-invariant BY MEASUREMENT (a
  header and a data-block script are invisible to the resting census).
- **Final gates on the final tree (observed):** typecheck ✓ lint ✓
  **133/133 unit (17 files)** ✓ build + assemble ✓ E2E **170 passed +
  2 skipped** — the two desktop-only geometry pins still skip on mobile,
  nothing else.

## 7. Residual risks / next steps

1. `color-contrast` remains excluded from the axe gate BY DOCUMENTED DECISION
   (parity law §1/§4/§19) — unchanged.
2. `style-src 'unsafe-inline'` remains BY DOCUMENTED DECISION (React inline
   styles + Tailwind; retiring it needs style hashes/nonce across every
   injected stylesheet — low value, high churn). Carried, documented in the
   CSP seam itself.
3. The admin axe fixture mints ONE session per project group — extend the
   fixture rather than adding logins for future gated surfaces (F-A removed
   the fixed-id collision, so future parallelism is also safe).
4. G-3 POSIX-only sweep paths — fix before using the tool on Windows (carried).
5. Dev-toolchain npm-audit findings — revisit when vitest 5 / prisma 7 land
   non-breaking paths (carried; composition re-verified this session).
6. Real PSP behind the checkout seam (carried).
7. H-56/H-59 disclosed E2E gaps (DB-mocking harness) — unchanged, carried.
8. L-2: the axe gate's PDP surface hardcodes `silk-draped-evening-gown` —
   fine while the seed is contract-pinned (recorded, carried).
9. Keep running the FULL two-census ritual every session — eleven same-day
   zero-drift sweeps is a streak, not a guarantee (session-10 §6 #5).
10. If the reference re-adds the drawer ACCOUNT/WISHLIST tail, restore the
    clone's tail and re-pin 7 items (session-8 §6 #7 — unchanged).
