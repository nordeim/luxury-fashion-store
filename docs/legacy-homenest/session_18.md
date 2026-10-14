# Session 18 — Sixth No-Drift Sweep, R18-01 PWA Manifest Superset (TDD), Docs, Push

> **Date:** 2026-10-13 · **Base:** `40f2710` (session-16 push `0c929b9` + its raw transcript) · **Remote:** pushed to `main`
> **Gate (post R18-01):** typecheck ✓ · lint ✓ · 95/95 unit ✓ · build 506.92 KB ✓ · **194/194 E2E** (97 specs × 2 projects) ✓

## Mandate

The session-18 instruction repeated the standing doctrine — workspace
refresh, root-document review, `docs/session_16.md` + `session_17.md` +
remediation plan + worklog review, skills-driven audit, reference parity
sweep with mobile-menu attention (Tailwind v4 trap watch), Sitemap/SEO
check, screenshots, docs alignment, worklog, SSH-wrapper push to `main`.

## Workspace refresh & document review

`git pull` fast-forwarded `0c929b9..40f2710`; the remote had advanced by
exactly one commit over the session-16 push: `40f2710 "update session
log"` adds only `docs/session_17.md` — the raw session-16 transcript
(the same relationship `session_15.md` has to the session-14 record).
The working tree was clean with no fileMode artifacts this time.
Environment fully intact: `.env` pinned contract (`DATABASE_URL
"file:../db/custom.db"`), `node_modules`, paramiko 5.0.0 importable, no
stale key material.

## Review targets validated against the codebase

- `docs/session_16.md` (146 lines) — the R16-01 work record. Every claim
  checked: `eslint.config.js` exists with the documented shape (global
  ignores incl. `skills/`, browser + node blocks, the three-module
  react-refresh carve-out); `package.json` carries `"lint": "eslint ."`
  and the four-stage `verify`; the AGENTS/CLAUDE/PAD/DEPLOYMENT edits
  are in place; the four `session16-*` captures exist.
- `docs/session_17.md` (44 lines) — the session-16 transcript, matching
  the pushed summary exactly.
- `docs/remediation-plan.md` §16 + `worklog.md` Task ID 15 — consistent
  with the record; residual candidates: server-backed auth, PWA
  manifest.

## Audit

- Relevant `skills/skills-catalog.md` entries consulted: `tdd-workflow`
  (RED→GREEN for R18-01), `webapp-testing` (production-build E2E
  doctrine), `agent-browser` (live sweeps; its DNS quirk persists, so
  the sweeps ran through repo Playwright Chromium with
  `--host-resolver-rules`), `code-review-and-audit` (gate structure),
  `tailwindcss-v4` (mobile-menu trap watch — portal-to-body remains
  defeated, no drift).
- The standing candidate list was down to two; this session closed the
  next-smallest: **the optional PWA manifest**. Server-backed auth
  remains open (now the only candidate).

## Baseline gate (pre-change)

typecheck ✓ · lint ✓ (silent) · 95/95 unit ✓ · build 506.59 KB ✓ (tree
clean — SEO artifacts byte-identical) · **188/188 E2E** (3.5 min) — the
session-16 ledger reproduced exactly before any change.

## R18-01 — PWA manifest superset, wired TDD-style

The reference ships no web app manifest (re-measured live 2026-10-13:
no `<link rel="manifest">` in its head; `/manifest.webmanifest` and
`/site.webmanifest` both answered by the SPA catch-all with
`text/html`). A valid manifest is a pure superset extension — zero
visual footprint, additive installability.

- **RED:** `tests/e2e/pwa-manifest.spec.ts` written first — 6/6 failing
  (3 specs × 2 projects): served MIME
  (`application/manifest+json`), manifest members (name "HomeNest
  Kitchen", short_name "HomeNest", root-relative `start_url`/`scope`,
  `standalone`, theme/background `#fbfaf9`, 192×192 + 512×512
  absolute-CDN PNG icons per the FAVICON-1 precedent — no shipped
  binary), and the static head link.
- **GREEN:** `public/manifest.webmanifest` + `<link rel="manifest">` in
  the `index.html` static head set (HeadManager is additive-only, so
  the static link survives route-head surgery).
- **Deep-route trap found and pinned:** `viteSingleFile`'s recommended
  config hard-sets `base: "./"`, rewriting the root-absolute href to
  `./manifest.webmanifest` — a 404 on 2-segment routes
  (`/products/<slug>` resolves it under `/products/`). Fixed with a
  10-line `transformIndexHtml` post-hook in `vite.config.ts`
  (`absoluteManifestLink`) restoring `href="/manifest.webmanifest"`;
  the single-file build carries no other asset URLs, so this is the
  only affected link. The head-link spec pins BOTH a real PDP route
  and the home route.
- **Result:** 6/6 manifest specs green; served MIME verified; robots/
  sitemap untouched; bundle 506.92 KB (+0.33 KB — head comment + link
  tag only; the manifest is a copied public asset, not inlined).

## Post-change gate

typecheck ✓ · lint ✓ · 95/95 unit ✓ · build 506.92 KB ✓ · **194/194
E2E** (97 specs × 2 projects = 188 prior + 6 manifest) re-observed on
the post-change build (3.6 min).

## Live sweeps (both sides, no drift — sixth consecutive)

- Reference (Playwright Chromium @390×844 with `--host-resolver-rules`,
  2026-10-13 — the agent-browser Chromium DNS quirk from session 14
  persists): trigger bare (`rgba(0,0,0,0)`, 0px border, no shadow,
  36×36); sticky `NAV.bg-card/80 backdrop-blur-xl border-b` panel =
  `rgba(255,255,255,0.8)`, shadowless, `1px solid
  rgba(229,224,220,0.5)`; active row 14px/500 white on
  `rgb(217,110,38)` at 12px radius; inactive rows muted
  `rgb(126,111,103)`; **no** dialog role, focus stays on BODY on open.
  SEO posture unchanged: robots allows everything; sitemap 22 statics
  (8 admin + 4 private surfaces listed), **zero product-detail URLs**.
- Clone (production preview :4177): dialog contract verified live —
  `role="dialog"` + `aria-modal="true"` + `aria-label="Site menu"`,
  portaled to body (Tailwind v4 trap stays defeated), initial focus at
  the search pill, 7 × Tab trap with wrap, Escape restores the "Open
  menu" trigger; row pins exact + superset `Sign in` row (6 rows);
  served PDP head (title = h1, canonical, Product JSON-LD USD $54.99);
  robots 5 disallows; sitemap 36 URLs; **R14-01 live region announcing
  live** ("bowl" → "3 products match your search.", "zzqqxx" → "No
  products match that search.", cleared → "", aria-live polite; a
  "kettle" probe correctly returns no-results — no kettle product
  exists in the 25-item catalog).
- **Conclusion: no functional or visual gaps on either side.**

## Follow-ups executed

- ✅ **R18-01** — PWA manifest superset (above).
- ✅ **R18-02 — session captures** (4, visually verified post-capture;
  byte-sizes identical to the session-14/16 sets — pixel-parity
  evidence): `session18-home-desktop`, `session18-pdp-desktop`,
  `session18-mobile-home`, `session18-mobile-menu-open` →
  `docs/screenshots/`; README Documentation rows extended.
- ✅ **Doc-drift fix** — PAD §10 row "Desktop search combobox options
  are not announced with result counts" still read "Open — cosmetic"
  although R14-01 closed it in session 14; struck and marked closed
  with the pinning-spec reference. PAD superset item 14 extended with
  the session-18 manifest posture.

## Docs aligned in the same change

`public/manifest.webmanifest` (new), `index.html` (+manifest link),
`vite.config.ts` (+`absoluteManifestLink` hook),
`tests/e2e/pwa-manifest.spec.ts` (new), `docs/DEPLOYMENT.md` (§7
checklist: 194 E2E + manifest curl), `Project_Architecture_Document.md`
(superset item 14 + §10 combobox row closed), `docs/remediation-plan.md`
(§17 addendum), this file, `README.md` (Documentation rows),
`worklog.md` (Task ID 16).

## Verification gate

typecheck ✓ · lint ✓ · 95/95 unit ✓ · build 506.92 KB ✓ · 194/194 E2E ✓
— all observed this session after the R18-01 change.
