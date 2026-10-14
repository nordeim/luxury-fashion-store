# Session 28 — Eleventh Sweep: Trigger Drift AGAIN (Oscillation), TDD Revert, Doc-Count Refresh

> **Date:** 2026-10-14 · **Base:** `ef6789b` (session-26 push `31504bb` + the owner's `docs/session_27.md` transcript commit) · **Remote:** pushed to `main`
> **Gate (baseline, pre-change):** typecheck ✓ · lint ✓ · 104/104 unit ✓ · build 506.93 KB ✓ · **196/196 E2E** ✓
> **Gate (post-change):** typecheck ✓ · lint ✓ · 104/104 unit ✓ · build **506.80 KB** ✓ · **196/196 E2E** ✓

## Mandate

The standing doctrine — workspace refresh (`git pull` fast-forwarded
`31504bb..ef6789b`, remote added only `docs/session_27.md`, the raw
session-26 transcript), root-document review, `docs/session_26.md` +
`docs/session_27.md` + remediation plan + worklog review, skills-driven
audit, reference parity sweep with mobile-menu attention (Tailwind v4
trap watch), Sitemap/SEO check, db-scripts/env contract verification,
screenshots, docs alignment, worklog, SSH-wrapper push to `main`.

## Workspace refresh & document review

`git pull` → `ef6789b` (1 file: the 109-line session-26 narrative
transcript — consistent with the pushed session-26 record line for line).
Root docs reviewed (AGENTS.md, CLAUDE.md, README.md, PAD,
`homenest-store-g_SKILL.md`, DEPLOYMENT.md); session records reviewed
(session_26.md + session_27.md, remediation plan §1–§21, worklog Tasks
1–20). Session-26 claims re-validated against the tree: trigger-disc span
in `chrome.tsx`, plain account glyph, `scripts/db-setup.mjs`, db scripts
in `package.json`, `tests/db-scripts.test.ts`, `.env` + `.env.example`
pinned contract, repo-root `db/custom.db` (24 products / 8 categories /
2 users) — all present and consistent. Doc drift found: `CLAUDE.md` §5
still carried pre-session-26 counts (95 unit / 91 specs) — fixed this
session (R27-03).

## Audit

- Relevant `skills/skills-catalog.md` entries consulted: `tdd-workflow`
  (RED-GREEN for the trigger revert), `webapp-testing`
  (production-build E2E doctrine), `agent-browser` (live sweeps; the DNS
  quirk did NOT reproduce — the reference host resolved directly),
  `code-review-and-audit` (gate structure), `tailwind-patterns` (trap
  watch — the v4 `rounded-full` vs `rounded-[9999px]` computed-value trap
  became moot with the disc's removal; the portal trap #5 re-verified
  live).
- Baseline gate on `ef6789b` reproduced the ledger exactly: typecheck ✓ ·
  lint ✓ · 104/104 unit ✓ · build 506.93 KB ✓ · **196/196 E2E** (3.7 min) ✓.
- Standing contracts verified: `.env` pinned
  `DATABASE_URL="file:../db/custom.db"` + repo-root `db/` ✓, `.env.example`
  in sync ✓, `db:init`/`db:seed`/`db:setup` wired ✓, vitest + playwright
  configs green ✓, sitemap/SEO superset served ✓ (robots 5 disallows,
  sitemap 36 URLs, PDP head + JSON-LD, manifest 200).

## Live sweeps (eleventh bidirectional — DRIFT FOUND, AGAIN)

Reference side (agent-browser @390×844 + 1440×900, logged in with the
owner-supplied credentials):

- **F27-01 — the mobile menu trigger is a BARE DARK ICON in BOTH
  states** (36×36 transparent button, `rgb(29,24,22)` glyph, 16px
  lucide-menu / X, stroke 2, no inner span — verified on `/`,
  `/products`, `/product/1`, closed and open). The session-26 green-disc
  measurement no longer holds. The surface has now measured green (s3/4)
  → bare (s5) → green (s26) → bare (s27) — an oscillating reference.
- All other pins held: account plain dark glyph (logged-in), desktop row
  geometry (account 44×44/20px, cart 44×44/24px, search 185px muted pill
  with 16px glyph), body `rgb(251,250,249)`, footer `rgb(29,24,22)`,
  headings Playfair Display 700, panel `rgba(255,255,255,0.8)` (inline
  expanded sticky nav on the reference), active row 14px/500 white on
  `rgb(217,110,38)` radius 12px 358×44, inactive muted
  `rgb(126,111,103)`, catalog 8 products, robots allows-all, sitemap 22
  statics.

Clone side (production preview :4173): dialog contract (portal, focus
trap, scroll lock, aria-modal) ✓, panel/row pins exact ✓, account icon
plain both auth states ✓, PDP head + canonical + og + Product JSON-LD ✓,
robots 5 disallows + sitemap 36 URLs + manifest 200 ✓ — but the trigger
still rendered the session-26 green disc (the only mismatch).

**Decision: validation track exited** — per the §20.4 doctrine, the drift
re-opened the candidate list for exactly this item.

## Remediation (TDD — RED observed before GREEN)

- **R27-01 — trigger bare dark icon, both states.** RED: rewrote the
  session-26 disc spec in `tests/e2e/mobile-navigation.spec.ts` back to
  the bare-icon pins (transparent bg, `rgb(29,24,22)` color, zero spans,
  both states) with the session-27 measurement comments; observed failing
  on the pre-change build (1 failed). GREEN: removed the
  `h-9 w-9 rounded-[9999px] bg-accent text-white` span from
  `src/components/chrome.tsx` — the glyph renders directly in the
  unchanged 44px touch-target button at 20px, keeping the header row's
  proportional language (account 20px, cart 24px — the clone's row uses
  the reference's desktop geometry uniformly, a registered superset).
- **R27-03 — CLAUDE.md count refresh.** 95 → 104 unit tests, 91 specs /
  182 runs → 98 specs / 196 runs, plus the db-scripts and PWA-manifest
  rows in the E2E inventory.

## Verification gate (post-change, all observed)

typecheck ✓ · lint ✓ · **104/104 unit** ✓ · build **506.80 KB** (the disc
span's removal trims ~130 bytes) ✓ · **196/196 E2E** (98 specs × 2
projects, 3.6 min) ✓. Post-change re-sweep: closed + open trigger both
transparent with the dark glyph and zero spans, dialog contract intact,
served SEO + manifest supersets green.

## Follow-ups executed

- ✅ **R27-02 — session captures** (4): `session27-home-desktop`,
  `session27-pdp-desktop`, `session27-mobile-home`,
  `session27-mobile-menu-open` → `docs/screenshots/`; plus the drift
  evidence capture `_ref-sweep27-mobile-menu-open.png`. Pixel-sampled
  trigger zones of the clone + reference captures: identical visual
  signature (white panel, dark glyph, zero green pixels).

## Docs aligned in the same change

`docs/remediation-plan.md` (§22 addendum), this file, `AGENTS.md` (trigger
trap-log line → session-27 measurement + oscillation history),
`Project_Architecture_Document.md` (§5.5 accent usage, §7.4 test table,
§10 risk register, §11 spec map), `CLAUDE.md` (§5 count refresh),
`README.md` (Documentation rows), `worklog.md` (Task 21).
