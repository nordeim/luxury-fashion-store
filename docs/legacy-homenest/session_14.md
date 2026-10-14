# Session 14 — Fourth No-Drift Sweep, R14-01 Screen-Reader Search Announcements (TDD), Docs, Push

> **Date:** 2026-10-13 · **Base:** `01259a1` (session-12 push `3d40509` + its raw transcript) · **Remote:** pushed to `main`
> **Gate (post R14-01):** typecheck ✓ · 95/95 unit ✓ · build 506.59 KB ✓ · **188/188 E2E** (94 specs × 2 projects) ✓

## Mandate

The session-14 instruction repeated the standing doctrine — workspace
refresh, root-document review, `docs/session_12.md` + `session_13.md` +
remediation plan + worklog review, skills-driven audit, reference parity
sweep with mobile-menu attention (Tailwind v4 trap watch), Sitemap/SEO
check, screenshots, docs alignment, worklog, SSH-wrapper push to `main`.

## Workspace refresh & document review

`git pull` on the persisted checkout fast-forwarded `3d40509..01259a1`;
the remote had advanced by exactly one commit over the session-12 push:
`01259a1 "update session log"` adds only `docs/session_13.md` — the raw
session-12 execution transcript (the same relationship `session_11.md`
has to the session-10 record). One sandbox quirk surfaced first: the
working tree reported 1659 spurious "modifications" that were pure file-
mode flips (100644→100755, zero insertions/deletions) — resolved with
`git config core.fileMode false`; content was byte-clean throughout.

`git diff 7a67fc1..HEAD --stat` proves everything outside the session-12
work product (README session rows, remediation §14, session_11/12/13
docs, 3 session-12 captures, worklog Task 13) is byte-identical to the
session-10-reviewed suite, so the root-document review (AGENTS.md,
CLAUDE.md, README.md, PAD, SKILL.md v1.3.0, DEPLOYMENT.md) carries over
verbatim. `docs/session_12.md` re-read as the mandated review target;
remediation plan §14 and worklog Task 13 confirmed against the tree.

Environment state: the persisted checkout survived this time (unlike
session 12's reset) — `.env` still carries the pinned contract
`DATABASE_URL="file:../db/custom.db"`, `node_modules` intact, the
Appendix-A paramiko shim still deployed at `/home/z/my-project/bin/ssh`,
no stale key material.

## Audit

- Relevant `skills/skills-catalog.md` entries consulted: `tdd-workflow`
  (drove R14-01 below), `webapp-testing` (production-build E2E
  doctrine), `agent-browser` (live sweeps — plus its SKILL.md `--args`
  launch-arg reference, which enabled the DNS workaround below),
  `code-review-and-audit` (gate structure), Tailwind v4 skills (trap
  re-check on the menu portal).
- One open item from the standing candidate list was pulled into this
  session: **aria-live combobox announcements** (the smallest of the
  four, decorative, zero visual risk). The other three (server-backed
  auth, ESLint flat config, PWA manifest) remain open.

### Sandbox quirk: agent-browser Chromium DNS

agent-browser 0.39.0 began failing `nest-culinary-hub.base44.app` with
`ERR_NAME_NOT_RESOLVED` while OS-level DNS (`nslookup`, `curl`) resolved
fine — Chromium's internal resolver, not the sandbox's, was broken.
Workarounds tried and rejected: `/etc/hosts` (no write permission),
`AGENT_BROWSER_ARGS` env (not honored). **Working fix:** repo-installed
Playwright Chromium with the launch arg
`--host-resolver-rules=MAP nest-culinary-hub.base44.app 216.24.57.16`;
all reference-side sweeps this session ran through that path (sweep
scripts persisted under `/home/z/my-project/scripts/`).

## Reference re-sweep (Playwright @390×844, 2026-10-13)

**No visual drift — fourth consecutive sweep.** All pins re-measured
against the live reference:

- Trigger: bare dark button — `rgba(0,0,0,0)` background, no border, no
  shadow, 36×36. (Reference has no aria-labels on its nav icons; the
  hamburger is targeted positionally right-most.)
- Panel: the sticky `NAV.bg-card/80` — `rgba(255,255,255,0.8)`,
  `box-shadow: none`, `border-bottom: 1px solid rgba(229,224,220,0.5)`.
- Rows: active `Home` = 14px/500, white `rgb(255,255,255)` on primary
  orange `rgb(217,110,38)`, 12px radius, 44px height; inactive rows
  (`Products`, `Track Order`, `About`, `Contact`) = 14px/500, muted
  `rgb(126,111,103)`, 12px radius, 44px.
- Reference a11y posture unchanged: no `role="dialog"`, no
  `aria-modal`, no focus management on open (focus stays on BODY), no
  Escape handling — the clone's dialog contract remains the superset.
- Reference SEO posture unchanged: robots.txt = `Allow: /` plus a
  sitemap line, disallows nothing; sitemap.xml = 22 static URLs
  (including 7 `/admin/*` and the 4 private surfaces) with **zero
  product-detail URLs**.

## Clone-side sweep (parity + function)

Production preview (`vite preview` :4177; still IPv6-only in this
sandbox — `localhost` works, raw `127.0.0.1` refuses):

- **Mobile menu contract verified live**: `role="dialog"` +
  `aria-modal="true"` + `aria-label="Site menu"`, portaled to body
  (Tailwind v4 containing-block trap stays defeated), focus enters at
  the search pill, 7 × Tab cycles inside the panel (search control +
  6 links) with the 8th wrapping to `Home`, Escape closes and restores
  the "Open menu" trigger; row pins match the reference exactly, plus
  the superset `Sign in` row.
- **Served SEO re-probed**: PDP title = h1 ("Ceramic Mixing Bowl Set |
  HomeNest Kitchen"), canonical present, og:title synced, Product
  JSON-LD with USD offers ($54.99); robots.txt disallows the 5 private
  surfaces; sitemap.xml serves 36 URLs (12 statics + 24 products).
  Static-curl of a PDP shows the base shell head (expected for the
  single-file SPA — the route-head contract is applied client-side and
  is covered by the browser-level sweeps and the seo-head E2E spec).
- **Conclusion: no functional or visual gaps found on either side.**

## R14-01 — combobox result announcements (TDD)

The standing candidate list shrank by one this session. The desktop
search combobox was fully operable (APG combobox, listbox-popup variant:
arrow keys, activedescendant, Escape — session 5, R5-02) but silent:
screen-reader users got no announcement that the suggestion list
appeared or changed, because focus never leaves the input and the
visual list is not announced.

- **RED** — three specs appended to `tests/e2e/search-keyboard.spec.ts`
  (scoped to `getByRole("search").getByRole("status")` for uniqueness
  against other pages' status regions): result-count announcement
  matching the option count, "no results" announcement, and
  empty-until-queried with `aria-live="polite"`. Observed failing
  against the then-current build (6 failures across both projects,
  10 pre-existing combobox specs still green).
- **GREEN** — `src/components/chrome.tsx` gains a visually-hidden
  (`sr-only`) `role="status" aria-live="polite"` region inside the
  search form, announcing `N products match your search.` /
  `1 product matches your search.` / `No products match that search.`
  only while a query is non-empty. Zero visual footprint: served-page
  probe shows a 1×1 px clipped box (Tailwind `sr-only`), and the
  live-region spec file plus the full visual-parity suite stay green.
- **Gate re-run after the code change** (production build first):
  typecheck ✓ · 95/95 unit ✓ · build 506.59 KB (+0.22 KB over the
  506.37 KB session-12 ledger) ✓ · **188/188 E2E** (91 + 3 specs × 2
  projects) ✓ · regenerated SEO artifacts byte-identical to the
  committed ones (`git status` clean apart from the two intended
  source files) ✓.
- **Post-change clone re-sweep** re-confirmed every menu pin, the
  dialog contract, the served PDP head, and the live announcement
  ("3 products match your search." observed in the production build).

## Follow-ups executed

- ✅ **R14-01** — combobox result announcements (above): one standing
  candidate closed via RED→GREEN TDD.
- ✅ **R14-02 — session captures** (4, visually verified post-capture):
  `session14-home-desktop`, `session14-pdp-desktop`,
  `session14-mobile-home`, `session14-mobile-menu-open` →
  `docs/screenshots/`; README Documentation list extended with the
  session_12/13/14 rows.

## Verification gate

typecheck ✓ · 95/95 unit ✓ · build 506.59 KB ✓ · **188/188 E2E** ✓ —
all observed this session after the R14-01 change (baseline ledger
reproduced before it: typecheck ✓ · 95/95 ✓ · 506.37 KB ✓ · 182/182 ✓).
The post-gate change set is the R14-01 source pair plus docs-only files
(session record, remediation §15, README rows, worklog entry, 4
captures) — all covered by the observed gate or outside every gate's
file set.

## Docs aligned in the same change

`docs/remediation-plan.md` (§15 addendum), this file, README.md
(Documentation rows), `worklog.md` (Task ID 14). `docs/DEPLOYMENT.md`
needs no change — the sr-only live region introduces no new build,
runtime, or deployment contract.
