# Session 22 — Eighth No-Drift Sweep, Retired-List Validation Track

> **Date:** 2026-10-13 · **Base:** `2c9450b` (session-20 docs push `baaf4f8` + its raw transcript) · **Remote:** pushed to `main`
> **Gate (no code change):** typecheck ✓ · lint ✓ · 95/95 unit ✓ · build 506.92 KB ✓ · **194/194 E2E** (97 specs × 2 projects) ✓

## Mandate

The session-22 instruction repeated the standing doctrine — workspace
refresh, root-document review, `docs/session_20.md` + `session_21.md` +
remediation plan + worklog review, skills-driven audit, reference parity
sweep with mobile-menu attention (Tailwind v4 trap watch), Sitemap/SEO
check, screenshots, docs alignment, worklog, SSH-wrapper push to `main`.
The message carried the uploaded operating standard
(`coding_agent_prompt.md`) — modes A–D, evidence-backed verification,
TDD, no unverified claims — consistent with how these sessions run.

## Workspace refresh & document review

`git pull` fast-forwarded `6e17492..2c9450b`; the remote had advanced by
exactly two commits over the session-18 push: `baaf4f8 "docs:
session-20 — seventh no-drift sweep, full re-validation,
candidate-list retirement"` (remediation §18, session record, README
rows, worklog Task 17, four session20-* captures) and `2c9450b "update
session log"` adding `docs/session_21.md` — the raw session-20
transcript (the established relationship). `git diff 168d2ec..HEAD
--stat` proves the only root-document change across both commits is the
README Documentation rows, so the full doc-suite review (AGENTS.md,
CLAUDE.md, README.md, PAD, SKILL.md, DEPLOYMENT.md) carries over
verbatim from session 18's review of the identical bytes.

`session_20.md` claims were re-validated against the codebase (this is
the review target): the PWA manifest artifacts (file, head link,
`absoluteManifestLink` transform hook, 3 manifest tests × 2 projects),
the §18 addendum, README rows, worklog Task 17 and the four session20-*
captures all present and consistent; `session_21.md` matches the pushed
session-20 summary exactly. Environment intact after re-provisioning:
node 24.21.0 + node_modules ✓, `.env` pinned contract ✓, paramiko 5.0.0
re-installed into the active interpreter (the sandbox reset had dropped
it; the 3.13 pip default doesn't serve the 3.12 interpreter — installed
via `python3 -m pip`), 11 persisted sweep/capture scripts, no stale key
material.

## Audit

- Relevant `skills/skills-catalog.md` entries consulted (catalog
  byte-identical to session 18): `tdd-workflow`, `webapp-testing`
  (production-build E2E doctrine), `agent-browser` (live sweeps; its
  DNS quirk persists — sweeps ran through repo Playwright Chromium with
  `--host-resolver-rules`), `code-review-and-audit` (gate structure),
  `tailwindcss-v4` (mobile-menu trap watch — portal-to-body remains
  defeated, no drift).
- `npm audit --omit=dev`: **0 vulnerabilities** in the production tree.
  The dev-chain `braces` advisory stands unchanged (3 high, fix requires
  `--force`) — the registered accepted risk. Zero TODO/FIXME markers in
  `src/`; worktree clean throughout.
- The candidate list is **retired** (§18.4): no agent-actionable
  remediation items exist, so no code change was indicated this session.

## Baseline gate (reproduced on `2c9450b`)

typecheck ✓ · lint ✓ (silent) · 95/95 unit ✓ · build 506.92 KB ✓ ·
SEO determinism (prebuild vs postbuild `dist/index.html` byte-identical;
sitemap 36 URLs; robots 5 disallows) · **194/194 E2E** (3.6 min) — the
session-18/20 ledger reproduced exactly before any docs-only work.

## Live sweeps (both sides, no drift — eighth consecutive)

- Reference (Playwright Chromium @390×844 with `--host-resolver-rules`,
  IP re-resolved 216.24.57.16 — the agent-browser Chromium DNS quirk
  from session 14 persists): trigger bare (`rgba(0,0,0,0)`, 0px border,
  no shadow, 36×36); sticky `NAV.bg-card/80 backdrop-blur-xl border-b`
  panel = `rgba(255,255,255,0.8)`, shadowless, `1px solid
  rgba(229,224,220,0.5)`; active row 14px/500 white on `rgb(217,110,38)`
  at 12px radius; inactive rows muted `rgb(126,111,103)`; **no** dialog
  role, focus stays on BODY on open. SEO posture unchanged: robots
  allows everything; sitemap 22 statics (8 admin + 4 private surfaces
  listed), **zero product-detail URLs**.
- Clone (production preview :4177, `sweep20-clone.js` reused unchanged —
  already carries the manifest pins): dialog contract verified live —
  `role="dialog"` + `aria-modal="true"` + `aria-label="Site menu"`,
  portaled to body (Tailwind v4 trap stays defeated), initial focus at
  the search pill, 7 × Tab trap with wrap, Escape restores the "Open
  menu" trigger; row pins exact + superset `Sign in` row (6 rows);
  served PDP head (title = h1, canonical, Product JSON-LD USD $54.99);
  robots 5 disallows; sitemap 36 URLs; **R14-01 live region announcing**
  (polite; no-results and empty branches correct); **R18-01 manifest
  contract green** (`/manifest.webmanifest` → 200
  `application/manifest+json`, all members correct, icons 192×192 +
  512×512, head link root-absolute on a deep route).
- Standing contracts re-verified: `.env` pinned `DATABASE_URL`
  ("file:../db/custom.db") with repo-root `db/`; `.env.example` in sync
  (VITE_SITE_URL guidance intact); ADR-002 schema-relative resolution
  (`src/lib/db-path.ts` + 8 contract tests); `db:` npm scripts correctly
  absent per ADR-001 — the `db:push`/`db:seed` pattern belongs to the
  rejected Prisma reference stack and the zero-server deployment
  contract is documented (PAD ADR-001/ADR-002, DEPLOYMENT.md).
- **Conclusion: no functional or visual gaps on either side.**

## Decision: validation track re-confirmed

With the candidate list formally retired in §18.4 (server-backed auth →
registered owner decision ADR-001) and the eighth consecutive no-drift
sweep on both sides, this session ran the validation track per the
standing doctrine: full ledger, bidirectional sweeps, captures, docs.
No new candidates were opened; server-backed auth stays an owner
decision and the dev-chain advisories stay a registered accepted risk.

## Follow-ups executed

- ✅ **R22-01 — session captures** (4, visually verified post-capture;
  byte-sizes identical to the session-14/16/18/20 sets — pixel-parity
  evidence): `session22-home-desktop`, `session22-pdp-desktop`,
  `session22-mobile-home`, `session22-mobile-menu-open` →
  `docs/screenshots/`; README Documentation rows extended.

## Docs aligned in the same change

`docs/remediation-plan.md` (§19 addendum), this file, `README.md`
(Documentation rows), `worklog.md` (Task ID 18). `DEPLOYMENT.md`,
`AGENTS.md`, `CLAUDE.md` and `PAD` §10 required no edits (no code
change; all rows already accepted/registered).

## Verification gate

typecheck ✓ · lint ✓ · 95/95 unit ✓ · build 506.92 KB ✓ · 194/194 E2E ✓
— all observed this session on the `2c9450b` tree; the docs-only
remainder sits outside every gate's file set.
