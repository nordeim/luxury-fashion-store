# Session 26 — Tenth Sweep: Reference Drift Found, TDD Remediation, db Scripts Workstream

> **Date:** 2026-10-14 · **Base:** `ea4edca` (session-24 push `d29eb0f` + transcript commit `c44b79f`, merged) · **Remote:** pushed to `main`
> **Gate (baseline, pre-change):** typecheck ✓ · lint ✓ · 95/95 unit ✓ · build 506.92 KB ✓ · **194/194 E2E** ✓
> **Gate (post-change):** typecheck ✓ · lint ✓ · **104/104 unit** ✓ · build 506.93 KB ✓ · **196/196 E2E** ✓

## Mandate

The standing doctrine — workspace refresh, root-document review,
`docs/session_22.md` + `session_23.md` + remediation plan + worklog
review (the session-24 record carried the review target), skills-driven
audit, reference parity sweep with mobile-menu attention (Tailwind v4
trap watch), Sitemap/SEO check, db-scripts item, screenshots, docs
alignment, worklog, SSH-wrapper push to `main`.

## Workspace refresh & document review

Fresh clone (the sandbox had been reset): `git clone` → `ea4edca`
(2806 files, clean tree, HTTPS remote). Environment re-provisioned:
node 24.21.0 + `npm install` ✓, `.env` recreated with the pinned
contract (`DATABASE_URL="file:../db/custom.db"`, repo-root `db/` with
`catalog.json`) ✓, Playwright chromium re-fetched ✓.

Root docs reviewed (AGENTS.md, CLAUDE.md, README.md, PAD,
`homenest-store-g_SKILL.md`, DEPLOYMENT.md); session records reviewed
(`docs/session_24.md` + the `session_23.md` transcript, remediation plan
§1–§20, worklog Tasks 1–19). The session-24 claims re-validated against
the tree: §20 addendum, README rows, worklog Task 19, four session24-*
captures all present and consistent.

One environment quirk found and handled: the sandbox shell exports
`DATABASE_URL=file:/home/z/my-project/db/custom.db` (parent-workspace
scope). A shell-level env var overrides the repo default in
`scripts/db-setup.mjs`, so the repo-root materialization ran with
`env -u DATABASE_URL` — documented in AGENTS.md/DEPLOYMENT.md.

## Audit

- Relevant `skills/skills-catalog.md` entries consulted: `tdd-workflow`
  (RED-GREEN cycle for all three remediation items), `webapp-testing`
  (production-build E2E doctrine), `agent-browser` (live sweeps — the
  session-14 DNS quirk did NOT reproduce this session; the reference
  host resolved directly), `code-review-and-audit` (gate structure,
  native-CLI fallback), `tailwind-patterns` (trap watch on the trigger
  disc change — `rounded-[9999px]` vs `rounded-full` computed values).
- `npm audit --omit=dev`: **0 vulnerabilities** in the production tree;
  dev-chain `braces` advisory unchanged (registered accepted risk).
  Zero TODO/FIXME markers in `src/`.
- Standing contracts verified: `.env` pinned contract ✓, `.env.example`
  in sync (extended this session with the db-setup note) ✓, vitest +
  playwright configs present and green ✓, sitemap/SEO superset served
  ✓ (robots 5 disallows, sitemap 36 URLs, PDP head + manifest).

## Live sweeps (tenth bidirectional — DRIFT FOUND)

Reference side (agent-browser @390×844, logged in with the owner-supplied
credentials; CDN resolved 216.24.57.18/216.24.57.16 directly):

- **F26-01 — the mobile menu trigger is a GREEN disc in BOTH states**
  (`bg rgb(69,161,130)`, 36×36, `radius 9999px`, white lucide-menu / X
  glyph). The session-5 "bare dark icon in BOTH states" measurement no
  longer describes the reference — the session-3/4 green disc is back.
- **F26-02 — the header account button is a PLAIN dark lucide-user
  glyph** while logged in (transparent 36×36 round button) — no green
  avatar disc (the session-2 measurement no longer holds).
- All other pins held: body `rgb(251,250,249)`, footer `rgb(29,24,22)`,
  headings Playfair Display 700, panel `rgba(255,255,255,0.8)`
  shadowless, active row 14px/500 white on `rgb(217,110,38)` at 12px,
  inactive muted `rgb(126,111,103)`, catalog 8 products, robots
  allows-all, sitemap 22 statics / 0 product URLs.

Clone side (production preview :4173): dialog contract (portal, focus
trap, Escape restore) ✓, panel/row pins ✓, PDP head + JSON-LD ✓, robots
5 disallows + sitemap 36 URLs ✓, manifest 200 `application/manifest+json`
✓ — but the two drift surfaces above mismatched (bare-icon trigger,
green avatar disc).

**Decision: the validation track was exited** — per the §20.4 doctrine
("future sessions continue on the validation track unless the reference
drifts"), the drift re-opened the candidate list for exactly these
items, plus the standing db-scripts mandate (F26-03, never implemented
across sessions 1–24).

## Remediation (TDD — RED observed before every GREEN)

- **R26-01 — trigger green disc, both states.** RED: rewrote the
  `menu trigger renders a bare dark icon` spec in
  `tests/e2e/mobile-navigation.spec.ts` (8 failing assertions observed
  on the pre-change build). GREEN: `src/components/chrome.tsx` renders
  the glyph inside an `h-9 w-9 rounded-[9999px] bg-accent text-white`
  span within the unchanged `h-11 w-11` touch-target button — 36px
  visual disc parity + 44px touch-target posture (search-pill
  precedent); icons normalized to `h-5 w-5` stroke 2.
- **R26-02 — plain account icon.** RED: new spec in
  `tests/e2e/mobile-header-parity.spec.ts` (logged-in header account
  button transparent + no span; observed failing). GREEN: removed the
  logged-in `bg-accent` disc from `chrome.tsx` — both auth states
  render the plain `UserRound` glyph.
- **R26-03 — db scripts workstream.** RED:
  `tests/db-scripts.test.ts` (9 tests: materialization, row counts
  cross-checked against the catalog import, field fidelity, digest
  format, idempotency, --init/--seed modes, package wiring — 8 failing
  observed). GREEN: `scripts/db-setup.mjs` (node:sqlite, zero
  dependencies, ADR-002-mirroring URL resolution, flat-object catalog
  extraction with a brace-matched DEMO_USERS scanner, INSERT OR REPLACE
  idempotency) + `db:init` / `db:seed` / `db:setup` in `package.json`
  (ecommerce-store naming, Prisma-free implementation per ADR-001).
  Repo db materialized: `db/custom.db` — 24 products / 8 categories /
  2 users, verified via node:sqlite.

## Verification gate (post-change, all observed)

typecheck ✓ · lint ✓ · **104/104 unit** ✓ · build 506.93 KB ✓ ·
**196/196 E2E** (98 specs × 2 projects, 3.6 min) ✓. Post-change
re-sweep: trigger disc green both states (`rgb(69,161,130)`, white
glyph, 9999px radius, 36px), account icon plain both states, dialog
contract intact, login flow green, served SEO + manifest supersets
green.

## Follow-ups executed

- ✅ **R26-04 — session captures** (4): `session26-home-desktop`,
  `session26-pdp-desktop`, `session26-mobile-home`,
  `session26-mobile-menu-open` → `docs/screenshots/`; plus the drift
  evidence capture `_ref-sweep26-mobile-menu-open.png` (the reference's
  green-disc menu, following the `_ref-sweep8-*` convention).

## Docs aligned in the same change

`docs/remediation-plan.md` (§21 addendum), this file, `README.md`
(badges, feature/testing rows, env table, Documentation rows),
`AGENTS.md` (command table, environment contract, testing quirks —
trigger + account-icon pins, db-scripts entry), `Project_Architecture_
Document.md` (§5.6-adjacent token usage, §7.1 distribution, §7.4
checklist, §10 rows, ADR-002 consequences), `docs/DEPLOYMENT.md`
(§4.1 db materialization), `.env.example` (db-setup note), `worklog.md`
(Task 20).
