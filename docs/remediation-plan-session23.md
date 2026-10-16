# Remediation Plan — Session 23 (AURELIA / VELOUR clone)

> **Status:** EXECUTED. **Mode:** Verify-first (Mode C) → cold-clone
> re-validation → audit → sweep → TDD remediation. **Scope:** (1) reconciliation
> of the pulled remote `ef4b960` (the user-added `docs/session_22.md` transcript
> on top of the round-17 commit `cc34734`; docs only, no code); (2) an audit of
> the never-first-hand-audited round-17 commit `cc34734` (skills:
> `code-review-checklist`, `security-and-hardening`, `tdd`, per
> `skills/skills-catalog.md`) — the F-H/F-H2 SEO round: test+routes+deletions,
> every claim verified against source; (3) a **live reference parity sweep
> round 18** (desktop 1440×900 + mobile 390×844, FULL two-census ritual) —
> **ZERO drift, the FIFTEENTH consecutive**; (4) a fresh audit pass (error
> surfaces, sweeper boot wiring, proxy/config/api seams, npm audit) yielding
> **F-I / F-I2 / F-J — the failure-surface catch-up**: the error-boundary
> surfaces the framework renders by default, the unpinned 404 card, and the
> sweeper's noisy boot race — TDD-remediated with zero visual change at rest.

---

## 1. Starting state

Cold clone at `ef4b960` (`main`, remote-verified). Environment rebuilt from the
worklog's incident playbook:

| Step | Result |
|---|---|
| `npm install` | ✓ |
| `.env` re-pinned (`DATABASE_URL="file:../db/custom.db"` + dev `AUTH_SECRET` + `NEXT_PUBLIC_SITE_URL`) | ✓ untracked/ignored |
| `npx playwright install chromium` (headless shell v1248 — cache was wiped) | ✓ |
| `git config core.fileMode false` + `.git/info/exclude` (`bin/`, `.deploy/`) restored | ✓ |
| `bin/ssh` paramiko shim — rebuilt at push time (Appendix A recipe) | pending |
| `npm run db:setup` (the fresh clone ships no `db/`) — canonical 4/12/2/4, zero transient | ✓ |

**Baseline gates on the committed tree (TWELFTH consecutive session fully
green):** typecheck ✓ · lint ✓ · **151/151 unit (18 files)** ✓ · build +
assemble ✓ · **E2E 182 passed + 2 skipped** ✓ (91 unique × 2 − 2 viewport
skips + 2 setup).

`npm audit`: 11 findings (1 moderate, 8 high, 2 critical) — re-verified
unchanged; all dev-toolchain; accepted with rationale — carried.

**New observation at baseline (became F-J):** the E2E webServer log opens with
`[sweeper] boot sweep failed … The table main.Session does not exist in the
current database` (P2021). Chronology verified in the log: Playwright launches
the webServer BEFORE the worker that runs `global-setup` — the standalone
boots and `instrumentation.ts` fires the boot sweep against a schema-less
`db/e2e.db`, deterministically, on every E2E run. Fail-open (caught; the
hourly interval covers the rest; global-setup wipes transient tables anyway)
— but it stack-dumps on every run and would do the same on a real production
deploy that boots before its migrations.

## 2. Audit of `cc34734` (first-hand full-source verification)

Composition (`git show --name-status`): 3 src files + 1 E2E spec + 2 `public/`
deletions + docs/screenshots — `ef4b960` verified docs-only. Claims verified
against the final tree:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | Pure SEO seam (`siteOrigin` / `buildSitemapEntries` / `buildRobots`) | `src/lib/sitemap.ts` read in full: default-origin fallback + trailing-slash strip, statics-first canonical order (`/`, `/shop`, `/login`, `/register`), ACTIVE-only filter inside the seam, `lastModified` passthrough, exact 6-path disallow set, sitemap URL on the same origin | TRUE |
| 2 | Metadata routes `force-dynamic`, build stays DB-free | `src/app/sitemap.ts` + `src/app/robots.ts` both carry `export const dynamic = "force-dynamic"`; the route reads active products (`orderBy sortOrder`) and delegates; robots is a pure delegate | TRUE |
| 3 | 9 unit cases pin the seam | `src/lib/sitemap.test.ts`: 2 + 5 + 2 = 9 cases incl. the honest `Robots["rules"]` array narrowing | TRUE |
| 4 | E2E asserts the SERVED BODY (never just status) | `tests/e2e/seo.spec.ts`: 2 unique cases — robots exact disallow set + sitemap URL; sitemap statics-first order, 12 product locs, canonical slug, no noindex surface, `<lastmod>` present; default-origin pin (webServer runs with the env var unset) | TRUE |
| 5 | F-H2: the foreign statics deleted in-commit | `D public/robots.txt`, `D public/sitemap.xml` in the commit; `public/` holds only fonts + images + favicon now | TRUE |
| 6 | Proxy matcher unchanged (F-G note true) | matcher still `/((?!api|_next/static|_next/image|favicon.ico).*)` — the metadata routes receive the nonce CSP | TRUE |
| 7 | Docs aligned (SKILL v1.15.0, README/CLAUDE/PAD counts) | stale-count sweep this session: only the plan's own historical baseline rows | TRUE |
| 8 | Round-17 zero drift + rest-invariance | round-18a below re-measures the same values — the SEO addition remains rest-invisible | TRUE |

**Verdict: 8/8 claims TRUE, zero production regressions.** One INFO-level note
(`seo.spec.ts:52` `ORIGIN.replace(".", "\\.")` — a no-op on the dot-less
default origin; benign defensiveness, tests-only, left untouched per parity
law).

## 3. Live reference sweep — round 18a (measured 2026-10-17): ZERO drift

The full two-census ritual (boot → census → drawer → pinned surfaces → fonts,
both viewports, both sides). **Every ledger field byte-matches the recorded
round-17 values** — the reference has held still across FIFTEEN consecutive
sweeps:

- desktop: ref 11079 / clone 11085 (clone deals residue 3551 pinned); footers 444/444
- mobile: ref 11257 / clone 11264 (clone deals residue 3174 pinned); footers 1189/1189
- drawer: `panelCls` / `navCls` CHAR-IDENTICAL both sides (`…w-80 bg-background
  z-50 p-8 flex flex-col gap-6` / `flex flex-col gap-5 mt-4`); 5 items x=32 /
  w=256 / h=20 at y=104/144/184/224/264; gaps [20,20,20,20] — **the Tailwind v4
  mobile-drawer pin intact** (the task's standing mobile-nav re-check)
- fonts: ref h1×1 / h2×11 / h3×36 / h4 Montserrat×3 — clone superset h1×1 /
  h2×13 / h3×42 / h4×3 (the documented superset deltas)
- chips identical (fs 10px, px 10px/10px, py 4px, radius 0, transparent bg,
  border rgb(229,224,220)); nameH3 desktop 72px / mobile 48px Cormorant;
  marquee present on all four censuses
- clone console clean (the two `ref:` 401s are the reference site's own auth pings)

## 4. Fresh audit pass — findings (the round's targets)

Seams opened this session that the round-17 audit did not: `error.tsx` /
`global-error.tsx` existence, the not-found surface's gate coverage, the
sweeper's boot wiring under the E2E boot order, proxy/config/api seams (all
clean), npm audit composition (unchanged).

1. **F-I — no error boundaries exist.** `src/app/` carries `not-found.tsx` but
   NO `error.tsx` and NO `global-error.tsx` (verified: zero hits under `src/`).
   Any uncaught render fault — an RSC throw at document time (DB hiccup, disk
   full, a bug), a client-island exception during hydration — renders Next's
   framework-default error surface: unstyled, unbranded, English-only, no
   recovery affordance. The repo's own standard for failure surfaces is
   already set by `not-found.tsx` (measured slate card, chrome-less, with a
   "Go Home" escape); the error path never got the same treatment. Same class
   as F-B/F-H: **the production-ready superset claim catches up to the failure
   paths — code catches up to the doctrine, zero visual change at rest.**
2. **F-I2 — the existing 404 card is E2E-unpinned.** `not-found.tsx` is the
   one shipped failure surface and no spec asserts it; a refactor could
   restyle it silently. Same gate family as the rest of the pinned surfaces.
3. **F-J — the sweeper's boot pass races the E2E schema push (observed at
   baseline, deterministic).** Playwright boots the webServer before
   `global-setup` pushes the schema; the boot sweep's `prisma.session.deleteMany`
   hits P2021 and stack-dumps on EVERY E2E run — and would on any production
   boot that precedes migrations. Remediation: classify schema-not-ready at
   the boot catch (a pure, unit-pinned seam — `isSchemaNotReady`) and downgrade
   to a single soft line; the hourly interval already provides the retry. The
   hourly catch itself is left loud (by then a missing schema IS a real error).

### Evidence spike (run before planning — the honest-gate decision)

Driving `error.tsx` over the wire was spiked FIRST (`scripts/spike-rsc-500.cjs`
against the built standalone, request logging on): a 500'd RSC payload AND a
corrupt-200 payload during client navigation BOTH fall back to a **hard
document navigation** (two RSC attempts, then a full document GET; the user
always lands on the real page). Consequences, honestly weighed:

- The router's MPA fallback is itself a production resilience property worth
  PINNING (the user never sees a dead end or a raw body on RSC failure).
- `error.tsx`'s render cannot be wire-driven by interception; the only
  remaining vector is a fault-injection backdoor in production code
  (a test-only throwing route or env-gated fault) — **explicitly rejected**
  (anti-slop doctrine: no speculative configurability; production surface
  must not carry test paths). The boundaries are therefore verified by
  typecheck/lint + the framework contract, and their SSR document-path
  behavior is labeled **Reasoned, not Verified** in the docs. The wire gate
  pins what the wire can honestly reach: the 404 card (F-I2) and the RSC
  fallback resilience (the spike, made permanent).

## 5. Remediation design (TDD)

**Doctrine constraints:** parity law (all three fixes are rest-invisible —
error surfaces render only on faults, the sweeper change touches one log
line; the census MUST stay byte-equal); no client-state or mutation-seam
changes; the failure surfaces reuse the not-found card's measured slate
language (chrome-less, display serif, uppercase-tracked labels); no new
dependencies; vitest/playwright configs untouched (both new test files land
in the existing include/testDir contracts).

### ToDo

| # | Task | Layer | Gate |
|---|---|---|---|
| 1 | `src/lib/sweeper.test.ts` — extend with the `isSchemaNotReady` contract FIRST: P2021-shaped errors → true; other Prisma codes + non-object values → false (RED by absence — collection fails on the missing export) | unit (RED) | vitest |
| 2 | `src/lib/sweeper.ts` — export `isSchemaNotReady(error: unknown): boolean` (the pure classifier); `src/instrumentation.ts` — the BOOT catch downgrades P2021 to one soft line (`boot sweep skipped: database schema not ready yet (retries hourly)`), other errors stay loud; the hourly catch stays loud | production seam | vitest GREEN + the final-gate E2E log shows the soft line |
| 3 | `src/app/error.tsx` — client boundary in the not-found card's slate language: kicker + display-serif headline ("Something went wrong") + body copy + "Try again" (`reset()`) + "Go Home" link; `useEffect` console.error for observability (lint-clean); `digest` NOT displayed (not-found parity: minimal card) | production surface | typecheck + lint |
| 4 | `src/app/global-error.tsx` — the root boundary (renders its own `<html>/<body>`, imports `globals.css` for the fonts/tokens, `<a href="/">` home escape — no router dependence at root failure) | production surface | typecheck + lint |
| 5 | `tests/e2e/error-surfaces.spec.ts` — 2 unique cases × 2 projects: **404 card** (`/definitely-not-a-route` → status 404 + the measured copy + "Go Home" navigates home) and **RSC-failure resilience** (intercept PDP RSC payloads with a 500 → click through → the user still lands on the fully-rendered PDP; the raw body never renders). GREEN-first (both behaviors exist) — they are regression guards, RED-demonstrated by the mutation demos | E2E | playwright |
| 6 | Mutation demos (surgical): (a) the classifier drops its P2021 check → exactly the new unit cases fail; (b) the 404 card's headline is reworded → exactly the 404 E2E case fails; both restored → GREEN | process | vitest + playwright |
| 7 | Round-18b census — MUST be byte-equal to 18a (rest-invariance by measurement) | parity | sweep tool |
| 8 | Screenshots refresh (`--shots`), mobile drawer visual verify | evidence | files |
| 9 | Docs alignment: SKILL v1.16.0 (project_state 154 + 186+2, §2 rows, §5 error-boundary note, §10 symptom rows, Appendix B failure-surfaces row), README (badge/counts + features/testing rows), CLAUDE.md (gate line 154/93 + the failure-surfaces gate + the sweeper seam note), PAD (test table 18/154 + 15/93/186, §7.1 coverage map, §3.2 directory rows, §10 known-issues note), this file's execution record, worklog | docs | stale-count sweep |

### Count ledger (expected post-remediation)

| Metric | Before | After |
|---|---|---|
| unit files | 18 | 18 (`sweeper.test.ts` extended) |
| unit tests | 151 | 154 (3 new classifier cases) |
| E2E spec files | 14 | 15 |
| unique E2E cases | 91 | 93 (2 new failure-surface cases × both projects) |
| E2E result | 182 passed + 2 skipped | 186 passed + 2 skipped |

## 6. Validation of this plan against the codebase (pre-execution)

- `src/lib/sweeper.test.ts` exists (buildSweepPlan pinned) — the classifier
  cases extend it; vitest `include` picks `src/lib/*.test.ts` with zero config
  change; playwright `testDir` picks `tests/e2e/*.spec.ts` likewise.
- `not-found.tsx`'s exact copy ("404" / "Page Not Found" / "Go Home") read
  first-hand — the E2E pins assert THIS copy (the measured surface, not a
  paraphrase).
- The E2E 404 case needs no auth (default per-project storageState is fine —
  the 404 renders for any session state); the resilience case navigates from
  the home product row (the canonical seed slug `silk-draped-evening-gown` is
  on the home rows — verified by the spike).
- The spike's route-interception pattern (`rsc: "1"` header predicate + a
  mutable flag) is deterministic on the built standalone (observed twice).
- `instrumentation.ts` already catches the boot sweep's rejection — the
  downgrade is a 3-line change in the catch, no scheduling changes (the
  hourly interval and `.unref()` stay).
- The storefront layout composes chrome BELOW the root boundary — an error in
  any storefront segment renders the chrome-less card (consistent with the
  not-found posture); `global-error.tsx` covers the root-layout class.
- No schema/env/seed changes; money untouched; no `revalidatePath` surface.

## 7. Execution record

Filled in as the work proceeds (see the worklog entry for the final ledger).

| # | Task | Result |
|---|---|---|
| 1 | sweeper classifier unit contract | ✅ RED by absence — 3 new cases fail on the missing export (5 existing pass); the module-header comment ships with the test |
| 2 | `isSchemaNotReady` + instrumentation downgrade | ✅ GREEN 8/8 in the file; 154/154 unit (18 files); the boot catch downgrades P2021 to one soft line, hourly catch stays loud |
| 3 | `src/app/error.tsx` | ✅ shipped (slate card, reset + Go Home); lint drove one correction — the root-boundary `<a>` became `Link` (`no-html-link-for-pages`, no rule weakened) |
| 4 | `src/app/global-error.tsx` | ✅ shipped (own `<html>/<body>`, imports globals.css for tokens/fonts, Link home escape) |
| 5 | `tests/e2e/error-surfaces.spec.ts` | ✅ 6/6 (2 setups + 2 cases × 2 projects). En-route fix: the "SIZE" label pin — DOM text is "Size" (uppercase is CSS transform) → case-insensitive locator. First gate run ALSO caught a stale :3100 spike server adopted by `reuseExistingServer` (trap #36 family; killed by listening pid) |
| 6 | Mutation demos | ✅ surgical: (a) classifier returns false → exactly the recognize case fails (1/8, others green) — restored; (b) 404 headline reworded → exactly the 404 case fails (resilience case unaffected) — restored, 6/6 GREEN. (The (a) demo en-route incident — `git checkout` reverted the UNCOMMITTED export and the build caught the missing import loudly — is logged as a process note in the worklog) |
| 7 | Round-18b census | ✅ byte-equal to 18a on EVERY field (77/77 compared programmatically) — the failure-surface additions are rest-invisible; ZERO drift, 15th consecutive |
| 8 | Screenshots + drawer verify | ✅ 9 re-captures refreshed via the sweep --shots mode (clone+ref, desktop+mobile incl. the drawer); the mobile drawer capture visually verified pixel-identical (VELOUR logotype, five flush-left items, w-80 panel, dimmed backdrop) |
| 9 | Docs alignment + stale-count sweep | ✅ SKILL v1.16.0 (project_state 154 + 186+2, §2 rows, §5 app-tree + sweeper note, §10 rows, Appendix B sweeper + failure-surfaces rows); README (badge 154+186, architecture/testing rows, verify line, status row); CLAUDE.md (gate line 154/93 + the failure-surfaces gate, unit-list classifier row, commands block); PAD (tree rows, test table 18\|154 + 15\|93\|186, §7.1 coverage-map F-I/F-I2/F-J paragraph, §7.3); this file's record; worklog entry. Stale-count sweep: ZERO stale counts (see worklog) |
| — | Final gates on the final tree | typecheck ✓ lint ✓ 154/154 unit ✓ build ✓ **E2E 186 passed + 2 skipped ✓** — the THIRTEENTH consecutive fully-green session. (This run's boot sweep won the schema race — no sweeper line in the log; the soft-line path is exercised by the unit contract, the losing side evidenced by the baseline log quoted in §1) |

## 8. Residual risks / next steps (post-F-I/F-J)

1. `error.tsx`'s SSR document-path render remains **Reasoned** (the
   framework contract), not wire-Verified — the honest alternative (a
   fault-injection backdoor in production code) was rejected; revisit only if
   a real fault class ever needs a drill.
2. `style-src 'unsafe-inline'` remains the documented CSP exception (carried).
3. Real PSP behind the checkout seam (carried).
4. Dev-toolchain npm-audit findings (11, all dev-only) — carried.
5. G-3 POSIX-only sweep paths (carried).
6. The action-seam gate couples to the standalone manifest shape — fails loud
   at the canary by design (carried).
7. The zero-drift streak is a streak, not a guarantee — the two-census ritual
   stays mandatory before every commit.
