# Remediation Plan — Session 20 (AURELIA / VELOUR clone)

> **Status:** EXECUTED. **Mode:** Verify-first (Mode C) → warm-workspace
> re-validation → audit → sweep → TDD remediation. **Scope:** (1) reconciliation
> of the pulled remote `a14e6c5` (the session-19 work `adc801b` + the
> user-added session-19 transcript; the workspace was already at `adc801b`
> with a clean tree — fast-forwarded to `a14e6c5`, docs only); (2) an audit
> of the never-audited session-19 commit `adc801b` (skills:
> `code-review-checklist`, `security-and-hardening`, `tdd`, per
> `skills/skills-catalog.md`) — all claims verified first-hand; (3) a **live
> reference parity sweep round 15** (desktop 1440×900 + mobile 390×844, FULL
> two-census ritual) — **ZERO drift, the TWELFTH consecutive**; (4) the top
> carried finding **F-D** opened and TDD-remediated: the PDP's JSON-LD data
> block — the codebase's ONLY `dangerouslySetInnerHTML` — embeds
> `JSON.stringify(jsonLd)` raw; a `</script>` sequence inside any future
> product name/description would terminate the data block early and inject
> markup. Unreachable today (product text is seed-controlled; the admin
> action mutates `stock`/`isActive` ONLY — verified in
> `adminUpdateProductAction`), so this is defense-in-depth at the seam: a
> pure `serializeJsonLd` that HTML-safely escapes (`<` → `\u003c`, plus the
> U+2028/U+2029 line separators for JS-embedding completeness). On the
> current seed (no `<` in any catalog string — verified) the output is
> byte-identical, so the change is provably rest-invariant.

---

## 1. Starting state

The workspace was WARM and already at the session-19 tip `adc801b` with a
clean tree; `git fetch` showed remote one commit ahead (`a14e6c5`, the
user-added `docs/session_19.md` transcript — docs only, no code) and the
fast-forward pull landed there. `.env` verified pinned to the contract
`DATABASE_URL="file:../db/custom.db"` (+ dev `AUTH_SECRET`,
`NEXT_PUBLIC_SITE_URL`); `.env.example` tracked with the identical contract.
`db/custom.db` verified canonical via a scratch script (4 categories /
12 products / 2 users / 4 orders / 0 sessions / 0 carts / 0 wishlists —
deleted after use, never committed). Chromium headless-shell v1248 present.
Container paths (`skills/*` mirror, `upload/`, `download/`, `tool-results/`,
`bin/`) remain locally excluded via `.git/info/exclude` (never the committed
`.gitignore`). The sandbox `DATABASE_URL` leak persists — all DB/build
commands run `env -u DATABASE_URL` (§9 #12).

**Baseline gates on the committed tree (all reproduce the session-19 ledger;
EIGHTH consecutive session fully green):**

| Gate | Result |
|---|---|
| typecheck | ✓ |
| lint | ✓ |
| unit | ✓ 138/138 (17 files) |
| build + assemble | ✓ (proxy visible in the build summary) |
| E2E | ✓ 170 passed + 2 skipped (85 unique × 2 − 2 viewport skips + 2 setup) |

`npm audit`: 11 findings (1 moderate, 8 high, 2 critical) — re-verified
unchanged; all dev-toolchain; accepted with rationale — carried.

## 2. Audit of `adc801b` (first-hand full-diff verification)

The commit's own claims, verified against the diff, the final tree, and
live runs:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | `src/proxy.ts` mints a fresh nonce per request and sets the CSP on BOTH the request (Next's `parse-request-headers.js` → `getScriptNonceFromHeader` reads it) and the response (browser enforces) | File read: `requestHeaders.set("content-security-policy", csp)` + `response.headers.set(...)`; matcher skips `api`/`_next/static`/`_next/image`/`favicon.ico`; build summary shows `ƒ Proxy (Middleware)` | TRUE |
| 2 | `src/lib/csp.ts` is a pure seam — prod `script-src 'self' 'nonce-…'`, dev keeps `'unsafe-inline' 'unsafe-eval'` (F-7), nonceless prod call falls back to `script-src 'self'` (never silently widens), `style-src 'self' 'unsafe-inline'` the documented exception, all other directives byte-stable | File read + the 11 unit tests pass (verified live: `npx vitest run src/lib/csp.test.ts` → green) | TRUE |
| 3 | `next.config.ts` drops its static CSP; the other six security headers stay | Diff read: only the CSP entry removed (Referrer-Policy, nosniff, HSTS, X-Frame-Options: DENY, Permissions-Policy, COOP untouched); the CSP rationale comment updated | TRUE |
| 4 | F-B: the PDP ships the schema.org Product JSON-LD (pure `productJsonLd`, integer cents → dollars, stock → availability) as a non-executing data block | `src/lib/structured-data.ts` read (pure, no imports beyond the DTO type); PDP page embeds `<script type="application/ld+json" dangerouslySetInnerHTML>`; the 5 `structured-data` unit tests pass; the E2E JSON-LD case (seeded price 2850.00) passes inside the 170 | TRUE |
| 5 | F-A: the admin axe fixture's session id is token-derived | `tests/e2e/accessibility-axe.spec.ts` line 196: `SELECT 'admin-axe-gate-' \|\| '<token>'` (token = `randomBytes(32).toString("hex")` per run; `Session.id` is an untyped `String @id` — 79 chars fine in SQLite) | TRUE |
| 6 | F-C: the axe gate opts out of CSP enforcement for its harness injection | `test.use({ bypassCSP: true })` at the describe scope, with the rationale comment | TRUE |
| 7 | `security-csp.spec.ts` (5 cases × 2) pins the header shape, the nonce in the served bytes, hydration + clean console, route coverage, and the JSON-LD data block | File read — all five cases as described, incl. the trap-#33 "assert the SERVED BYTES" note; all pass live inside the baseline 170 | TRUE |
| 8 | Docs aligned + `.env.example` tracked + screenshots refreshed | SKILL v1.12.0 (project_state, §2, §9 #33, §11, Appendix B), README badge 138+170 + deploy CSP paragraph, CLAUDE 85/138 + CSP/axe bullets, AGENTS CSP line, PAD (file tree, security-rules row 387, XSS row 404, test table 414–416, coverage-map N-1/F-B sentence) — all re-read; `git ls-files .env.example` non-empty; 5 refreshed screenshots in the commit footprint | TRUE |

`a14e6c5` (user commit): adds `docs/session_19.md` (81 lines, the session-19
transcript) — docs only, no code. No action needed.

**Findings (new, this audit):**

- **F-D (LOW, defense-in-depth):** the PDP's JSON-LD data block — the
  codebase's ONLY `dangerouslySetInnerHTML` — embeds `JSON.stringify(jsonLd)`
  RAW. If a product `name`/`description` ever contained the sequence
  `</script>`, the data block would terminate early and inject markup (the
  classic JSON-LD breakout). Unreachable TODAY: product text comes from the
  seed catalog (verified — the only `<` in `catalog.ts` is a TS generic),
  and `adminUpdateProductAction` can only mutate `stock`/`isActive` (schema
  inspected). But the PAD's XSS row (line 404) documents this site as the
  one intentional raw-HTML sink, and the OWASP/Next.js guidance is to
  escape at the seam regardless of current data trustworthiness. Fix
  direction: a pure `serializeJsonLd(value)` in `src/lib/structured-data.ts`
  — `JSON.stringify` then replace `<` → `\u003c` and the U+2028/U+2029 line
  separators (harmless in data blocks, mandatory if the value is ever
  inlined into a classic script) — and the PDP uses it. On the current seed
  the output is byte-identical (no `<` exists), so the E2E JSON-LD parse
  pin keeps passing untouched and the change is rest-invariant.
- **F-E (INFO, no action):** `mintNonce()` uses the bare `crypto` global —
  valid in every runtime Next 16 can run the proxy in (Node ≥ 20 exposes
  webcrypto globally; Edge likewise). Measured fine; recorded so nobody
  "fixes" it into a runtime-specific import.
- **F-G (INFO, no action):** the proxy matcher gives `/sitemap.xml` and
  `/robots.txt` a CSP header they don't need — harmless (they are documents;
  a strict CSP on them is a no-op) and cheaper than widening the matcher's
  negative lookahead.

## 3. Live reference sweep — round 15 (measured 2026-10-16): ZERO drift

Round-15a census (pre-change, committed tree) byte-equal to the session-9..19
ledger on EVERY field:

| Surface (ledger) | Reference (15a) | Clone (15a) | Verdict |
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
| Mobile drawer nav | `flex flex-col gap-5 mt-4`, 5 items x=32/w=256/h=20, gaps [20,20,20,20] | **identical** (y-rows identical too) | v4 pin intact |
| Size chips (resting) | 10px / 10px pad / 4px py / r0 / transparent / rgb(229,224,220) | identical | P-11 holds |
| Card-name h3 | Cormorant (72px desktop / 48px mobile) | identical | P-15 holds |
| Marquee | present | present | P-3 holds |
| Console (clone) | — | clean | the two 401s are the REFERENCE's own auth probe |

**The reference has now held still across TWELVE consecutive same-day sweeps
(sessions 9→…→20).**

## 4. The F-D seam — measured before writing a line

- The ONLY `dangerouslySetInnerHTML` in `src/` is the PDP's JSON-LD data
  block (`rg -n "dangerouslySetInnerHTML" src/` → exactly one hit, the F-B
  integration). Every other render path goes through React's escaping.
- React does NOT escape `dangerouslySetInnerHTML` by design — the author
  owns the bytes. `JSON.stringify` output is JS-safe but not HTML-safe: the
  sequence `</script>` inside a JSON string still terminates a classic
  `<script>` element when the HTML parser (not the JS engine) scans it.
  For `type="application/ld+json"` data blocks the parser treats content as
  raw text until `</script` — same hazard.
- The standard hardening (OWASP HTML-safe JSON embedding): replace `<` with
  `\u003c` after stringify; U+2028/U+2029 (` `/` `) likewise
  (they terminate a JS string literal in old semantics — irrelevant inside a
  data block but zero-cost to cover).
- Current-data impact: NO `<` exists anywhere in the catalog strings
  (verified) → `serializeJsonLd(jsonLd) === JSON.stringify(jsonLd)` byte-for-
  byte on the seeded PDPs → the existing E2E JSON-LD parse pin passes
  UNCHANGED and the resting census cannot see the change.

**TDD RED→GREEN (planned):**

1. Unit RED: extend `src/lib/structured-data.test.ts` with a
   `serializeJsonLd` contract block — escapes `<` to `\u003c` (a payload
   containing `</script>` renders the breakout impossible), escapes
   U+2028/U+2029, `JSON.parse(output)` round-trips to the input object
   (data unchanged), and for the SEEDED gown the output is byte-equal to
   plain `JSON.stringify` (the rest-invariance contract). Run → RED
   (function absent).
2. Unit GREEN: implement `serializeJsonLd` in `src/lib/structured-data.ts`
   → full unit suite green (138 → 145).
3. Production wiring: the PDP page swaps `JSON.stringify(jsonLd)` →
   `serializeJsonLd(jsonLd)`. No test change — the E2E JSON-LD pin already
   asserts parseability + the seeded price, which the escaping preserves by
   construction (round-trip contract pinned at the unit layer).
4. Rebuild (trap #16) → full E2E green → round-15b census byte-equal to
   15a (rest-invariance BY MEASUREMENT) → final gates re-run after the last
   file change (trap #28).

## 5. ToDo ledger (execution order)

| # | Item | Status |
|---|---|---|
| 1 | Workspace reconciliation (tree = `origin/main a14e6c5`) + warm-env verification (`.env` contract, seed 4/12/2/4, chromium v1248) | ✅ |
| 2 | Baseline fully green on every gate (eighth consecutive session) | ✅ |
| 3 | First-hand audit of `adc801b` + `a14e6c5` (8 claims + npm-audit composition, driven by `code-review-checklist` / `security-and-hardening` / `tdd`); findings F-D / F-E / F-G | ✅ |
| 4 | Parity sweep round 15a (both viewports, zero drift — 12th consecutive) | ✅ |
| 5 | Unit RED: `serializeJsonLd` contract tests written first, observed failing | ✅ |
| 6 | Unit GREEN: `serializeJsonLd` implemented — unit suite 138 → 142 | ✅ |
| 7 | Production wiring: the PDP embeds `serializeJsonLd(jsonLd)`; rebuild (trap #16) | ✅ |
| 8 | Full E2E on the final tree: 170 passed + 2 skipped (arithmetic exact) | ✅ |
| 9 | Round 15b post-change census: byte-equal to 15a on every field | ✅ |
| 10 | Final gates re-run after the last file change (trap #28) | ✅ |
| 11 | Scratch artifacts deleted (never committed); screenshots refreshed; `.env.example` contract re-verified | ✅ |
| 12 | Docs alignment: SKILL v1.13.0 (project_state + §2 unit counts 138 → 142; Appendix B JSON-LD row gains `serializeJsonLd`), README badge + testing counts, CLAUDE verify line + testing-strategy seam list, PAD XSS row + test table, this plan, worklog session-20 entry | ✅ |
| 13 | Commit to main; SSH-wrapper v3 push (dry-run first, key shredded, remote ref verified) | ✅ (at push time) |

## 6. Verification ledger (post-remediation, evidence-backed)

- **Unit RED (observed):** `npx vitest run src/lib/structured-data.test.ts`
  with the new `serializeJsonLd` block → **4 failed / 5 passed** — RED by
  absence (the function was not exported), all five `productJsonLd` tests
  still green.
- **Unit GREEN (observed):** after implementation → **142/142 across 17
  files** (the 4-case `serializeJsonLd` contract: breakout impossibility,
  U+2028/U+2029 escaping, JSON.parse round-trip, byte-identity with plain
  `JSON.stringify` on seed data).
- **Production wiring (observed):** the PDP embeds `serializeJsonLd(jsonLd)`
  — one production line changed (plus the F-D rationale comment); no test
  change needed (the E2E JSON-LD pin asserts parseability + the seeded
  price, preserved by construction).
- **E2E (observed):** rebuild (trap #16) → full suite **170 passed + 2
  skipped** (85 unique × 2 − 2 viewport skips + 2 setup; arithmetic exact)
  — the JSON-LD pin passes UNCHANGED.
- **Round 15b (observed):** post-fix tree → census byte-equal to 15a on
  every field — the escaping is invisible at rest BY MEASUREMENT (the
  current seed contains no escapable characters; the serialization is a
  data-block byte detail the resting census cannot see).
- **Final gates on the final tree (observed, trap #28):** typecheck ✓ lint ✓
  **142/142 unit (17 files)** ✓ build + assemble ✓ — all re-run after the
  last file change.
- **Screenshot refresh (observed):** 7 clone surfaces + 2 ref captures
  re-shot via the sweep's `--shots` mode against the remediated standalone;
  the mobile drawer capture visually verified — five-item panel
  pixel-identical (VELOUR logotype + WOMEN/MEN/ACCESSORIES/DESIGNERS/SALE,
  20px gaps, flush-left w-80).

## 7. Residual risks / next steps

1. `color-contrast` remains excluded from the axe gate BY DOCUMENTED DECISION
   (parity law §1/§4/§19) — unchanged.
2. `style-src 'unsafe-inline'` remains BY DOCUMENTED DECISION (React inline
   styles + Tailwind; retiring it needs style hashes/nonce across every
   injected stylesheet — low value, high churn). Carried, documented in the
   CSP seam itself.
3. Real PSP behind the checkout seam (carried) — the largest functional
   gap vs a "real" store; needs external credentials + a non-hermetic E2E
   story, so it stays behind the checkout action seam until then.
4. H-56/H-59 disclosed E2E gaps (DB-mocking harness) — unchanged, carried.
5. Dev-toolchain npm-audit findings — revisit when vitest 5 / prisma 7 land
   non-breaking paths (carried; composition re-verified this session).
6. G-3 POSIX-only sweep paths — fix before using the tool on Windows
   (carried; no Windows target in scope).
7. L-2-class hardcoded seed slugs across specs are FINE while the seed is
   contract-pinned (the seed IS the contract — `prisma/seed.ts` + the
   canonical catalog). Not carried as a finding anymore; recorded as
   doctrine.
8. Keep running the FULL two-census ritual every session — twelve same-day
   zero-drift sweeps is a streak, not a guarantee (session-10 §6 #5).
9. If the reference re-adds the drawer ACCOUNT/WISHLIST tail, restore the
   clone's tail and re-pin 7 items (session-8 §6 #7 — unchanged).
