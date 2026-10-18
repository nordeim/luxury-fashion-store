# Session 57 — the session-44 round (F-OO: the API deliberate-failure shapes + the search limiter floor — a throwaway broken-DB server)

Resuming with the **Session 43 task book** (the user's latest directive). Per the
standing precedent, my round = the session-43 continuation auditing `068b0d4`
(the parallel thread's session-log commit — docs-only) plus a full re-verification
of the committed tree. The workspace had been RESET again — **fresh clone** per
the task brief, with the known recovery set closed before any gate: `npm
install` (486 packages); the canonical 3-line `.env` with
`DATABASE_URL="file:../db/custom.db"`; `db:setup` materializing `db/custom.db`
at the canonical 4/12/2/4 (the seed's own completion print); Playwright
**chromium-1248 reinstalled** (the cache shipped only 1200 — the 3rd
consecutive reset with this quirk, now fully expected).

**Step 1: Workspace refresh + audit of the pulled HEAD**

`git show --stat 068b0d4` → 1 file, +72: `docs/session_56.md` only — the
parallel thread's raw narration transcript of the SAME session-43 round; its
ledger matches `b60c39c`'s actual work (test-only, zero `src/`, the F-NN
describe + 13 screenshots + five-docs alignment + SKILL v1.36.0). Docs-only,
RETAINED. This round's narration ships as `docs/session_57.md`.

**Step 2: Baseline gates — re-proven from scratch on the fresh clone**

typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build + assemble ✓ E2E
**274 passed + 2 skipped** (138 unique × 2; 6.2m) — the 42nd consecutive
session fully green at baseline, exactly matching session-43's final gates.

**Step 3: Fresh audit pass — the round's finding**

The session-43 plan §11 directive: the app's read/write seams are exhausted;
the strongest residual candidates are the deliberate-failure shapes and the
search-429 limiter. The standing Tailwind v4 / mobile-nav pins re-verified
first-hand (the drawer's `flex flex-col gap-5 mt-4` at mobile-nav.tsx:76, the
`w-80` panel, every `@theme` token a full `hsl()` literal, zero `space-y` on
parity surfaces).

**F-OO — the API deliberate-failure shapes + the search 429 limiter floor.**
The F-Y gate (session-29) pinned every HEALTHY shape of the three REST route
handlers and its own spec header documents the deliberate rejection: *"ok
stays true even when the DB read fails, db:false carrying the diagnosis —
that failure shape is fault-injection territory, rejected per the F-I
precedent."* The residual ledger carried the search-503 / health-db:false
shapes as source-read-only and the search-429 as pollution-blocked ever
since.

**The design insight: the fault injection never touches the shared suite
server.** The gate's case spawns the SAME `.next/standalone/server.js`
artifact the suite boots, as a child process on :3211 whose `DATABASE_URL`
points at a NONEXISTENT directory (absolute `file:` URLs pass the db-path
resolver untouched; SQLite cannot create a file inside a nonexistent
directory — every DB read throws; instrumentation's boot-sweep failure is
caught + logged, never fatal). The isolated process gets its OWN module-scope
in-memory rate-limiter buckets — the 60/min search floor trips with ZERO
pollution of the main server's shared bucket. The F-I objection dissolves by
process isolation.

**Step 4: Plan-probe discipline (BEFORE the spec)**

`scripts/plan-probe-session44.cjs` — the throwaway broken-DB standalone on
:3209: **8/8 checks passed**: the server boots and LISTENS; `/api/health` →
200 + `{"ok":true,"db":false}`; `/api/search?q=silk` → 503 +
`{ok:false,results:[]}`; `POST /api/newsletter` (valid email) → 503 + the
H-20 envelope; the 61-request burst → first=503, last=429, exactly 59× 503 +
1× 429; the 429 envelope; **the CONTROL server** (the same spawn shape, a
healthy throwaway copy of `db/custom.db`) serves `{"ok":true,"db":true}` —
the denial is the DB, not a broken spawn; the broken path's directory never
materialized. Zero dev-DB writes, zero e2e.db writes.

**Step 5: The TDD spec**

NEW describe **"api deliberate-failure shapes (F-OO, session-44)"** at the
END of `tests/e2e/api-contract.spec.ts` (the OWNING spec — the API routes'
own; the file's uniques 9 → 10). **ZERO logins, ZERO registers, ZERO
main-server limiter consumption, zero DB writes** (the broken URL's
directory never exists — nothing to clean, H-24's cleanest shape). ONE
request-level case: spawn → poll health → **LOAD-BEARING 1** (health 200 +
`{"ok":true,"db":false}`) → **LOAD-BEARING 2** (search 503 + the F-12
envelope) → **LOAD-BEARING 3** (newsletter 503 + the H-20 envelope — a VALID
email must reach the upsert) → **LOAD-BEARING 4** (the 60-burst: first=503,
last=429, exactly 59× 503 + 1× 429 — the bucket pre-seeded by LB2; plus the
still-denied 62nd + the 429 envelope) → the finally kills the child. GREEN
**22 passed** (10 uniques × 2 + 2 setups; F-OO green on BOTH projects,
~830ms each).

**Step 6: FOUR mutation demos — all four halves independently gated**

1. **The health LYING shape** (the catch swapped to `{ok:true,db:true}` — a
   monitor shows green with the DB down) → REBUILD → **all 20 existing
   case-runs GREEN** (incl. the F-Y health case asserting `db:true` on the
   healthy server — the wire-blindness proof) while exactly the 2 F-OO
   case-runs failed at LOAD-BEARING 1.
2. **The search raw-500** (the F-12 documented shipped-before class) →
   REBUILD → 20 green, exactly the 2 F-OO runs RED at LOAD-BEARING 2.
3. **The newsletter raw-500** (the H-20 class) → REBUILD → 20 green, exactly
   the 2 F-OO runs RED at LOAD-BEARING 3.
4. **The limiter-drop** (the `if (!limiter.allowed)` block deleted — the
   burst rides through to the DB path) → REBUILD → 20 green (≤9 search
   requests on the healthy server « 60), exactly the 2 F-OO runs RED at
   LOAD-BEARING 4.

All restored via inverse edit (`git diff --stat src/` empty — byte-identical)
→ rebuild → 22/22 green.

**Step 7: Round-39 census — the reference OUTAGE handled honestly**

**ENVIRONMENT: the LIVE reference (Base44) served HTTP 503 throughout the
census window** — 10+ minutes of probes on `/` and `/login` (a platform
outage; the two-sided sweep crashed at the ref's null `<main>`). The census
split accordingly:

- **Clone-side ×2 (39a + 39b post-rebuild): ZERO DRIFT — byte-identical to
  the round-38 clone-side ledger in ALL census fields**: desktop pageH
  11085, mobile pageH 11264, mainKids 11 both viewports, footers 444/1189,
  the drawer char-identical (`w-80` panel + `flex flex-col gap-6` +
  `flex flex-col gap-5 mt-4` + gaps [20,20,20,20]) — **the v4 mobile-nav pin
  holds**; clone console clean both censuses.
- The reference-side fields **carry by documentation** from the round-38
  live measurement (desktop 11079, mobile 11257, the documented 2× 401
  residue); the WOMEN-inert posture re-check + the 2 ref screenshots
  **deferred** pending the platform's recovery (§11 item 16; the next round
  re-runs the full two-sided sweep first thing if the platform recovered).
- The clone's mobile-menu behavior verified end-to-end on the dev server
  (`rm -rf .next` first; `env -u DATABASE_URL` boot): burger → drawer →
  scroll lock → Women → `/shop?category=women` → closed → overflow restored
  → zero console errors (the first run raced Turbopack's cold compile of
  `/shop` — the warm re-run measured the navigation exactly, the documented
  note reproduced).
- 11 screenshots refreshed (the sweep's 7 clone shots + the dev-server login
  set: clone-login, clone-cart, clone-account, clone-admin-dashboard); the
  dev cart's rows cleaned after the shot, canonical 4/12/2/4 re-verified.

**Step 8: Final gates + docs**

typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **276
passed + 2 skipped** (139 unique × 2; 6.2m) — the 43rd consecutive
fully-green session, exactly the plan's count ledger (138→139 unique,
274→276 passed); the F-OO case-runs green on BOTH device projects. Docs
aligned: SKILL v1.37.0 (§2 E2E row + F-OO; §11 139; Appendix B NEW
session-44 row with the reference-outage note), README (badge 173+276 + the
F-OO pins + status rows 139), CLAUDE.md (gate line 139 + the F-NN→F-OO chain
+ the NEW F-OO segment + commands 139), PAD (test table 18|139|276 + §7.3
command 139 + the coverage-map session-44 extension), AGENTS.md (the
security line + the E2E command row 139),
`docs/remediation-plan-session44.md` (the plan + this execution record),
worklog, this log; `.env.example` unchanged and matching the codebase;
stale-count sweep zero.

**Step 9: Commit + push (main only)**

One main-branch commit (test-only round — zero `src/` changes; the
artifacts: the F-OO describe + the plan + the probe script + the
clone-census script + the refreshed screenshots + the five-docs alignment +
the worklog + this log) pushed via the SSH wrapper v3 with
`--remote git@github.com:nordeim/luxury-fashion-store.git`, verified on the
remote, key shredded.
