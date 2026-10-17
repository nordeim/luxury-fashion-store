# Remediation Plan — Session 29 (AURELIA / VELOUR clone)

> **Status:** PLANNED → EXECUTED this round (the session-28 continuation, named
> for the next session number per the standing precedent).
> **Mode:** Verify-first (Mode C) → reconciliation of the pulled remote
> (`f552dd3` the session-28 F-X round + `1252458` its session log) → first-hand
> audit → live-reference parity sweep round 24 → fresh audit pass → two
> gate-coverage remediations (F-Y, F-Z). **Scope:** the session-28 commit
> audited 5/5 claims TRUE first-hand (the F-X case verified in source AND over
> the wire — the brand-metadata gate re-run 32/32 (16 unique × 2) on the fresh
> build; the head census re-run 43/43; the session-27 wire probe re-run 14/14
> carrying every session-26 claim forward); **the round-24a census measured
> ZERO DRIFT** (23rd/24th consecutive clone-side sweeps — the reference
> byte-stable against the round-23 ledger, mainKids 11 both sides both
> viewports, drawer gaps [20,20,20,20] — the v4 mobile-nav pin holds, the
> standing task re-check); **the fresh pass opened two seams no prior round
> audited** — the REST route-handler wire contract (three endpoints the README
> declares as the product's only REST surface, with zero wire-layer pins) and
> the F-O preload's referenced font targets (three files, only one ever
> fetched) — and found **F-Y** and **F-Z**, both LOW gate-coverage gaps in the
> F-X family ("a declared contract surface the gates never exercise over the
> wire").

---

## 1. Starting state

WARM workspace fast-forwarded `f552dd3..1252458` (the pull brought only
`docs/session_28.md` — the previous thread's session log; docs only, no code).
The recurring reset set did NOT fire this round — zero sandbox incidents:

| Step | Result |
|---|---|
| `git pull` | ✓ fast-forward to `1252458`; `skills/` intact (283 entries); tree clean |
| `.env` | ✓ canonical 3-line contract survived (`DATABASE_URL="file:../db/custom.db"` + dev AUTH_SECRET + NEXT_PUBLIC_SITE_URL) |
| Playwright cache | ✓ both builds present (v1200 + v1248, the pinned 1.64.0's) |
| `bin/ssh` shim + paramiko | ✓ shim present (venv shebang) + paramiko 5.0.0 in the venv |
| `db/custom.db` | ✓ canonical 4/12/2/4 verified via `env -u DATABASE_URL` count (13 tables) |
| `core.fileMode false` | ✓ survived |

**Baseline gates on the committed tree (TWENTY-FIRST consecutive session fully
green at baseline):** typecheck ✓ · lint ✓ · **173/173 unit (19 files)** ✓ ·
build + assemble ✓ (E2E runs at the final gate).

## 2. Audit of `f552dd3` (first-hand full-source verification)

Composition: the brand-metadata gate extension (the F-X case + the spec
header's session-28 note) + the new evidence tool `scripts/head-census-session28.cjs`
(ten-route head census + six-asset fetch) + 3 screenshot re-captures +
`docs/remediation-plan-session28.md` + README/CLAUDE/PAD/SKILL v1.21.0
alignment + worklog. Claims verified against the final tree:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | The F-X case derives expectations from the SERVED artifacts and fetches every referenced asset | `tests/e2e/brand-metadata.spec.ts` read in full — the case reads the SERVED manifest body (`manifestRes.json()`) and the SERVED home JSON-LD (regex-extracted `application/ld+json` blocks, `Organization.logo`), builds the fetch list from them (+ `/apple-icon.png`, `/opengraph-image.png`), and asserts 200 + content-type + body > 100 bytes per asset; no duplicated literals | TRUE |
| 2 | The F-X case is GREEN on the fresh build | `npx playwright test tests/e2e/brand-metadata.spec.ts` re-run: **32/32** (16 unique × 2) | TRUE |
| 3 | The head-census tool exists and passes first-hand | `scripts/head-census-session28.cjs` read in full (191 lines: six-asset S1 + nine-route S2 + the robots-disallowed canonical-absence contract + the /account //admin 3xx check; spawns the standalone from the repo root on :3201) and re-run: **43/43 checks passed** | TRUE |
| 4 | Session-27's claims still hold over the wire | `scripts/wire-probe-session27.cjs` re-run on the fresh build: **14/14** — the F-W PDP OG identity case still PASSes, all session-26 claims (F-R/F-S/F-T/F-V) still PASS | TRUE |
| 5 | Docs aligned (SKILL v1.21.0 frontmatter project_state 108/216+2, Appendix B session-28 row; README badge 173+216 + feature row; CLAUDE.md gate line 108 + the F-X gate description; PAD §7.1 session-28 paragraph + test table 16\|108\|216) | all five docs read this round; counts consistent; the SKILL frontmatter version = 1.21.0 | TRUE |

**Verdict: 5/5 claims TRUE, zero production regressions.**

## 3. Live reference sweep — round 24a (measured 2026-10-17): ZERO DRIFT

Full two-census ritual (both viewports, both sides). The reference is
byte-stable against the round-23 ledger — **23rd consecutive clone-side
sweep**:

| Ledger field | Round-23 ledger | Round-24a measured | Verdict |
|---|---|---|---|
| ref desktop pageH / mainKids | 11079 / 11 | 11079 / 11 | byte-stable |
| clone desktop pageH | 11085 | 11085 | byte-stable |
| ref mobile pageH / mainKids | 11257 / 11 | 11257 / 11 | byte-stable |
| clone mobile pageH | 11264 | 11264 | byte-stable |
| footers | 444 / 1189 | 444 / 1189 | byte-stable |
| drawer panelCls/navCls | char-identical | identical | byte-stable — **the mobile-nav v4 pin holds** (`flex flex-col gap-5`, five items, gaps [20,20,20,20]; the standing task re-check) |
| clone console | clean | clean | byte-stable |
| ref console | the documented 2× 401 residue | identical | documented residue |

The reference did NOT move this round (rounds 22 and 23 held too; three stable
sweeps since the round-21 move).

## 4. Fresh audit pass — findings (the round's targets)

Two seams no prior round audited, opened via a full-tests grep census
(`rg "api/search|api/newsletter|api/health" tests/` + the preload/font target
census over `brand-metadata.spec.ts`):

1. **F-Y — the REST route handlers' wire contract is unpinned.** README's
   Key Features table declares the API surface as a product contract ("API |
   `/api/health`, `/api/search` (typeahead), `/api/newsletter` — the only REST
   endpoints"); the action-seam security gate (session-21) pins the SERVER
   ACTION seam over the wire, the SEO gate pins robots/sitemap, the
   brand-metadata gate pins the head surfaces — but the three route HANDLERS
   have zero wire-layer assertions anywhere in `tests/` (grep census: the only
   reference is `tests/unit/sweep-lib.test.ts:44` — the sweep tool's health-URL
   builder, tooling not a gate). The contracts that live unpinned:
   - `/api/health` GET → 200 `{ok:true, db:true}` (the liveness envelope —
     `ok` stays true even when the DB read fails, with `db:false` carrying the
     diagnosis);
   - `/api/search` GET → the empty-query fast path (`{ok:true, results:[]}`),
     the hit shape (`slug/name/brand/image/price` — price in integer cents),
     the best-effort degradation (a no-hit query returns 200 + `[]`, never
     404/500 — the F-12 contract), and the limit clamp (`limit=1` honored
     against the take bound 1..10);
   - `/api/newsletter` POST → the Zod 400 envelope (`{ok:false, error}` for a
     malformed body and an invalid email), the idempotent upsert (the same
     email twice → both success, one row), and the success envelope
     (`{ok:true}`);
   - the method matrix: un-exported methods must 405 (search/health export
     GET only, newsletter exports POST only — a POST to a read endpoint must
     not execute its handler).
   Severity: LOW (gate-coverage gap; the handlers are correct today — each
   contract verified first-hand against the source AND over the wire while
   drafting this plan; the risk is silent future regression on the only REST
   surface the README documents). Same family as F-X: a declared contract the
   gates never exercise. Remediation: a new spec
   `tests/e2e/api-contract.spec.ts` (9 unique cases) pinning the four
   contract groups over the wire, with SQL self-cleaning for the one
   subscription row it mints (the H-24 discipline; `NewsletterSubscriber` is
   NOT in global-setup's wipe list). No production change.
2. **F-Z — the F-O preload's referenced font targets are unpinned (one hop
   out, the F-X sibling).** The F-O case pins the three first-paint preload
   hrefs as LITERAL strings matched against the served DOM
   (`/fonts/cormorant-garamond-300.woff2`, `/fonts/montserrat-300.woff2`,
   `/fonts/montserrat-400.woff2` — plus `toHaveCount(3)`); the F-M case fetches
   exactly ONE font file (`cormorant-garamond-300.woff2`) for the immutable
   cache contract. The other two referenced files are never fetched: a
   rename/delete of `public/fonts/montserrat-300.woff2` would keep the F-O
   string pins green (the DOM href still says the right path) and F-M green
   (the cormorant file still serves) while the first-paint preload 404s — the
   double-fetch fix silently broken plus a console error. The F-X lesson's
   direct sibling, one layer down: "assert the referenced TARGETS, not just
   the reference." Severity: LOW (gate-coverage; the files serve today —
   verified via the round's wire fetches). Remediation: one new case in the
   brand-metadata gate that derives its fetch list from the SERVED DOM's
   preload hrefs (the F-X discipline — no duplicated literals) and asserts
   200 + `font/woff2` content-type + nonzero body for each. No production
   change.

INFO-level (verified, no action):
- The F-O count pin (`toHaveCount(3)`) already guards ADDITIONS to the preload
  set — the gap is only the fetch-the-targets hop.
- The home newsletter UI test (`home.spec.ts` "newsletter form accepts an
  email (API superset)") drives the endpoint THROUGH the form — a UI-behavior
  case, not a wire-contract pin; its `newsletter@example.com` row is an
  idempotent upsert leftover (harmless; not in the wipe list by design — the
  subscriber table is content, not transient state).
- The newsletter rate-limit bucket (10/10min/IP) is shared per standalone
  process: this spec mints 4 requests + the home UI test's 1 = 5 < 10 — the
  limiter stays unconsumed for the rest of the run (verified arithmetic, the
  §9 #23 discipline).
- `/api/search`'s 503 DB-blip path and `/api/health`'s `db:false` path are
  deliberate-failure surfaces — driving them honestly would need fault
  injection in production code (rejected, the session-23 F-I precedent);
  their *shape* is pinned by the success-path cases + the source read, labeled
  Reasoned.
- The 405 method-matrix cases pin Next's route-handler framework behavior
  (un-exported method → 405 Allow) — a framework contract worth pinning at the
  seam because the handlers' export set IS the product's method contract.

### Honest-gate decisions (run before planning)

- **F-Y and F-Z add gate coverage; they change no product behavior.** The
  served DOM is untouched; the parity census cannot drift (test-only round).
- **No gate is weakened.** F-Z extends the brand-metadata gate (+1 case); the
  F-O string pins and the F-M cache pin are untouched; F-Y is a NEW spec file
  (no existing case modified); the fetch expectations derive from the SERVED
  artifacts where derivation is possible (F-Z from the DOM preload hrefs) and
  from the unit-pinned contracts where the wire is the only witness (F-Y's
  envelopes).
- **Doctrine constraints:** parity law (test-only — rest-invisible by
  construction, proven by the round-24b census anyway); no mutation-seam or
  client-state changes; no new npm dependencies; vitest/playwright configs
  untouched (F-Y is a new spec file matching the existing `tests/e2e/*.spec.ts`
  glob — zero config edits; F-Z lands inside the existing spec's describe
  contract); `.env.example` unchanged (no new env vars); money untouched (the
  search price assertion reads the seeded integer cents, it does not write).
- **The newsletter row is self-cleaned** (afterAll SQL delete via `prisma db
  execute --file`, spawnSync args-array per trap #34) — the shared-seeded-DB
  discipline (H-24) holds; the row is keyed to a spec-unique email so a
  crashed run leaves at most one orphan row that global-setup's next run
  tolerates (idempotent upsert on re-run).

## 5. Remediation design (TDD)

### ToDo

| # | Task | Layer | Gate |
|---|---|---|---|
| 1 | `tests/e2e/api-contract.spec.ts` — NEW spec, 9 unique cases: (a) health liveness envelope; (b) search empty-query fast path; (c) search hit shape (the five-field DTO + integer-cents price, asserted against the canonical seeded catalog); (d) search no-hit degradation (200 + [], F-12); (e) search limit=1 clamp; (f) newsletter valid POST success envelope; (g) newsletter idempotent double-POST (one row, both success); (h) newsletter invalid-email 400 + malformed-JSON 400; (i) the 405 method matrix (POST /api/search, GET /api/newsletter, POST /api/health). afterAll SQL-cleans the minted subscriber row (spawnSync args-array, trap #34) | E2E | playwright |
| 2 | `tests/e2e/brand-metadata.spec.ts` — the F-Z case: derive the fetch list from the SERVED DOM's preload hrefs (`link[rel="preload"][as="font"]`), fetch each, assert 200 + `font/woff2` + nonzero body; the spec header gains the session-29 note | E2E | playwright |
| 3 | Mutation demos (surgical, inverse-restore — traps #37/#39): F-Z — rename `public/fonts/montserrat-300.woff2` → REBUILD (trap #16: the standalone serves the assembled copy) → exactly the F-Z case fails while the F-O string pins stay green (the gap's exact shape) → restore by rename-back, `ls` verified, rebuild; F-Y — flip the newsletter invalid-email status 400→422 (the smallest honest mutation that proves the envelope pin bites) → rebuild → exactly the F-Y envelope case fails → restore, rebuild | process | playwright |
| 4 | Round-24b census — MUST be byte-stable vs the 24a ledger (test-only round; the verdict closes the rest-invariance claim) | parity | sweep tool (--shots for the screenshot refresh) |
| 5 | Final gates on the final tree: typecheck → lint → unit → build → full E2E | gates | npm run verify + test:e2e |
| 6 | Docs alignment: README (badge 173+240-ish E2E total, the API feature row gains the wire-contract pin, testing rows), CLAUDE.md (gate line + gate description gains the API contract gate), PAD (test table 17\|118\|236-ish, §7.1 session-29 paragraph), SKILL (frontmatter project_state, §2 E2E row, Appendix B session-29 rows for F-Y + F-Z), this file's execution record, worklog | docs | stale-count sweep |

### Count ledger (expected post-remediation)

| Metric | Before | After |
|---|---|---|
| unit files / tests | 19 / 173 | 19 / 173 (no new pure seam — both findings are wire-layer) |
| E2E spec files | 16 | 17 (api-contract.spec.ts NEW; brand-metadata extended) |
| unique E2E cases | 108 | 118 (+9 F-Y +1 F-Z) |
| E2E result | 216 passed + 2 skipped | 236 passed + 2 skipped (118 × 2 − 2 desktop-only skips + 2 setup) |

## 6. Validation of this plan against the codebase (pre-execution)

- The three route handlers read in full this round: health (GET only, the
  `{ok,db}` envelope), search (GET only, the empty-query fast path returns
  BEFORE the rate limiter's DB work — the 429 path exists but is not
  minted by this spec's 5-request budget), newsletter (POST only, the
  Zod 400 envelopes, the idempotent upsert, the `{ok:true}` success).
- The seeded catalog supports the search hit case: `silk` matches the
  canonical PDP (`silk-draped-evening-gown`, price 285000 cents — the wire
  probe's pinned `2850.00` display value); the DTO shape
  (`slug/name/brand/image/price`) matches the handler's select map.
- The 405 expectation is Next's route-handler contract for un-exported
  methods (framework behavior, stable across the 16-line — wire-verified
  first-hand by the round's plan probe `scripts/plan-probe-session29.cjs`:
  POST /api/search, GET /api/newsletter, and POST /api/health all return
  405; the response carries NO `Allow` header on Next 16.4 — the spec pins
  the status only, never the absent header).
- The newsletter spec email (`api-contract@example.com`) is spec-unique; the
  afterAll cleanup deletes exactly that row (the H-24 discipline); the
  limiter arithmetic: 4 (this spec) + 1 (home UI test) = 5 < 10 per run.
- The F-Z case derives hrefs from the SERVED DOM — the F-O pins (count 3 +
  the literal strings) remain the Drift-First alarm; F-Z closes the
  fetch-the-targets hop without duplicating literals.
- No schema/env/seed changes; money untouched; no revalidatePath surface;
  `.env.example` unchanged; `next.config.ts` untouched.
- The census measures the home page only — a test-only round cannot drift
  it; the ritual still runs as the verdict (trap #40's discipline).

## 7. Execution record

| # | Task | Result |
|---|---|---|
| 1 | F-Y spec (api-contract.spec.ts) | ✅ 9 unique cases GREEN both projects (20 passed incl. the 2 setup) — the four contract groups pinned over the wire exactly as designed (the health envelope, the search fast-path/DTO/degradation/clamp, the newsletter success/idempotency/400 envelopes, the 405 matrix); the idempotency case reads the row-count via the scratch-probe dbRead (spawnSync args-array, trap #34); afterAll SQL-cleans the spec-unique row (verified: zero rows left in db/e2e.db) |
| 2 | F-Z case (brand-metadata.spec.ts) | ✅ "every first-paint preload target serves over the wire" — the fetch list derived from the SERVED DOM's preload set, three fetches, 200 + font/woff2 (wire-verified content-type before pinning) + nonzero body; GREEN both projects (34 passed incl. the 2 setup; unique 15 → 16) |
| 3 | Mutation demos | ✅ F-Z: montserrat-300.woff2 renamed → REBUILD → exactly the F-Z case failed (2 projects; the F-O string pins stayed green — the gap's exact shape: the DOM href still says the right path) → restored by rename-back (ls verified) → rebuild → 34/34 green. F-Y: the newsletter invalid-email status 400→422 → rebuild → exactly the envelope case failed (2 projects; the other 8 cases × 2 stayed green) → restored (git diff clean) → rebuild → 20/20 green |
| 4 | Round-24b census (--shots) | ✅ ZERO DRIFT — byte-identical to 24a in ALL census fields (23rd/24th consecutive): mainKids 11 both sides both viewports; pageH 11079/11085 + 11257/11264; footers 444/1189; drawer objects char-identical (the v4 mobile-nav pin holds); ref console = the documented 2× 401 residue; clone console clean — the test-only round proven rest-invisible by measurement |
| 5 | Final gates on the final tree | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **236 passed + 2 skipped** (118 unique × 2 − 2 desktop-only skips + 2 setup; 4.6m) — the TWENTY-FIRST consecutive fully-green session |
| 6 | Docs alignment + stale-count sweep | ✅ README (badge 173+236, the API feature row + the wire-contract pin, testing/status rows); CLAUDE.md (gate line 118 + the API-contract gate description); PAD (test table 17\|118\|236, §7.1 session-29 paragraph); SKILL v1.22.0 (frontmatter version/project_state, §2 E2E row, Appendix B NEW session-29 row); this file's record; worklog. Stale-count sweep: zero stale counts |

## 8. Residual risks / next steps (post-F-Y/F-Z)

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
    stays mandatory. Three stable rounds since the round-21 move.
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
