# Remediation Plan — Session 45 (F-PP: the login/register limiter floors — a throwaway healthy-DB server)

The session-44 continuation round. Per the standing precedent: audit the pulled
HEAD (`2daaeca` — the parallel thread's session-log commit), re-verify the
baseline, run the fresh audit pass, then close the strongest finding with a
TDD gate.

## 1. Starting state

- FRESH CLONE this round (the sandbox workspace had been reset — `git clone`
  per the task brief). The known recovery set, all closed BEFORE any gate:
  `npm install` ✓; the canonical 3-line `.env` with
  `DATABASE_URL="file:../db/custom.db"` ✓; `db:setup` materializing
  `db/custom.db` at the canonical 4/12/2/4 (the seed's own completion print)
  ✓; Playwright **chromium-1248 reinstalled** ✓ (the cache shipped only 1200
  headless-shell — the 4th consecutive reset with this quirk).
- HEAD `2daaeca` = remote `main` (the parallel thread's session_58.md — the
  raw transcript of the SAME session-44 round, +82 docs-only).
- The committed tree's contract: 173 unit (19 files) · 139 unique E2E × 2
  device projects − 2 desktop-only skips = **276 passed + 2 skipped** ·
  typecheck ✓ lint ✓ build ✓.

## 2. Audit of `2daaeca` (the pulled HEAD) — first-hand

`git show --stat 2daaeca` → 1 file, +82: `docs/session_58.md` only — the
parallel thread's raw narration transcript of the same session-44 round; its
ledger matches `d4b44f0`'s actual work (test-only, zero `src/`, the F-OO
describe + 11 screenshots + five-docs alignment + SKILL v1.37.0). Docs-only,
RETAINED (never overwrite another thread's log). This round's narration ships
as `docs/session_59.md` (session_58.md taken by the pulled commit).

## 3. Baseline re-verification (fresh clone, recovery closed)

- typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build + assemble ✓
- E2E **276 passed + 2 skipped** (139 unique × 2; 6.2m) — the 44th
  consecutive session fully green at baseline, exactly matching session-44's
  final gates.

## 4. Fresh audit pass — the round's finding

The session-44 plan §11 named this round's candidates directly: item 3 —
"the login/register limiter 429 floors stay unpinned … a throwaway burst
would close them the same way F-OO closes search's; candidate for a future
round, now that the harness shape exists"; item 16 — "the NEXT round should
re-run the FULL two-sided sweep + the agent-browser posture check FIRST THING
if the platform has recovered." The standing Tailwind v4 / mobile-nav pins
re-verified first-hand during the audit (the drawer's `flex flex-col gap-5
mt-4` at mobile-nav.tsx:76, the `w-80` panel; every `@theme` token a full
`hsl()` literal in globals.css; zero `space-y` on parity surfaces).

**Reference platform status at census time: STILL DOWN.** The live reference
(Base44) answered HTTP 503 on both `/` and `/login` at the round's start —
the same outage session-44 documented (§11 item 16). Re-probed twice more
across the round; handled per the session-44 honest-outage precedent
(§9 below).

**F-PP — the login/register limiter floors.** Both auth mutation actions
carry the same abuse floor, unpinned since the limiter's introduction
(session-5 era) and carried in every residual ledger since:

| Seam | The floor (src/lib/actions/auth.ts) | The ungated shape |
|---|---|---|
| `loginAction:32-35` | `rateLimit(`login:${ip}:${email}`, 10, 15min)` → the 11th same-IP+email attempt answers `fail("Too many attempts. Try again in N seconds.")` | the `if (!limiter.allowed)` block dropped → a burst rides through to the credential check with every existing gate green |
| `registerAction:73-76` | `rateLimit(`register:${ip}`, 10, 15min)` → the same floor shape | the same drop → an unbounded enumeration/creation burst |

**Wire-blindness (verified against the committed suite):** every existing
login consume is lawful and far under the floor — the two setup projects log
in james once each (bucket key `login:local:james@example.com`), the F-EE /
F-GG register-door cases and the H-24 logout case's throwaway login add a
handful more; the register bucket (`register:local`) sees the H-8 register
case + the F-EE/F-GG doors. All « 10. A dropped limiter block keeps every
existing gate green — the silent-abuse class (brute-force enumeration of the
login, bulk register spam), exactly the shape F-OO closed for `/api/search`.

**Why these were carried:** tripping either floor on the MAIN suite server
would poison the shared buckets for 15 minutes and break every later lawful
login/register (the H-24 logout case, the storageState setups on a re-run)
— the same pollution objection that kept the search-429 carried until F-OO's
process-isolation insight dissolved it: **a throwaway standalone gets its own
module-scope `buckets` Map** (`rate-limit.ts:10` — per-process state), so a
burst on the throwaway consumes nothing on `:3100`.

**The F-PP twist vs F-OO:** the auth actions need a WORKING database (the
login's user lookup and the register's existing-check must answer envelopes,
not raw 500s — the deliberate-failure design never extended to server
actions, where the RSC page itself fails on a down DB). So the throwaway
spawns with a **healthy THROWAWAY COPY of `db/custom.db`** (the exact
F-NN/F-LL/F-MM probe pattern: `copyFileSync` to a tmpdir + an absolute
`file:` URL, which the pinned db-path resolver passes through untouched).
Zero dev-DB writes, zero e2e.db writes — the throwaway file is deleted with
its tmpdir.

**The wire shape (React 19 progressive enhancement, measured first-hand):**
the auth forms are `useActionState` + `<form action={formAction}>`
(auth-form.tsx:28,100) — the no-JS contract makes both actions plain HTTP
endpoints: a multipart/form-data POST to the page route carrying the form
fields plus the hidden fields the SSR'd form renders (measured on the
standalone's `/login` HTML): `$ACTION_REF_1`, `$ACTION_1:0` =
`{"id":"<hex>","bound":"$@1"}` (the action binding), `$ACTION_1:1` =
`[null]` (the bound prev-state), `$ACTION_KEY` (the state re-attach key).
The login/register page manifests
(`.next/standalone/.next/server/app/(auth)/{login,register}/page/server-reference-manifest.json`)
expose exactly TWO action ids (both pages import both actions via the
shared auth-form component); the gate discriminates them by response (the
unknown-email login shape answers the anti-enumeration envelope; the same
shape against the sibling id fails registerSchema's Zod gate BEFORE its
limiter — the "Check the highlighted fields" copy, zero bucket
consumption). The SSR form's `$ACTION_1:0` binding is asserted to match
the discriminated loginAction (a build-shape canary).

**The register burst's zero-write trick:** the limiter fires BEFORE the
existing check (auth.ts:73 before :80), so 10 register posts with an EXISTING
email (james@example.com on the throwaway copy) each lawfully consume the
bucket and answer "An account with this email already exists." — no row is
ever created, even on the throwaway. The login burst uses an UNKNOWN email
(10× the anti-enumeration envelope — no session, no cookie, no write).

HIGH-value coverage class (the auth mutation seams' abuse floors — the
brute-force/spam guard), zero product defect today (both floors are correct
in source; nothing asserts them).

## 5. Plan-probe discipline (run BEFORE the spec)

`scripts/plan-probe-session45.cjs` — a throwaway standalone on :3209 with a
healthy copy of `db/custom.db`, wire-verifying every F-PP assumption
(**15/15 checks passed**):

1. the server BOOTS and LISTENS against the healthy throwaway copy
   (`/api/health` → 200 + `{"ok":true,"db":true}` — the F-OO control
   discipline: the spawn works);
2. the login page's SSR HTML carries the `$ACTION_1:0` action binding
   (exactly one — the measured no-JS wire shape; a naive `$ACTION_ID_`
   guess answered 400 "Invalid Server Action request" — the probe caught
   it and the real encoding was extracted from the rendered form);
3. the login page manifest exposes exactly TWO action ids (40+ hex each);
4. the unknown-email login shape identifies `loginAction` over the wire
   (the anti-enumeration envelope);
5. the sibling id identifies `registerAction` (the login shape against it
   fails registerSchema's Zod gate BEFORE its limiter — the "Check the
   highlighted fields" copy — zero register-bucket consumption);
6. the SSR `$ACTION_1:0` binding matches the discriminated loginAction
   (the build-shape canary);
7. the existing-email register shape answers the "already exists" envelope;
8. the LOGIN burst: iterations 1..10 all answer the anti-enumeration
   envelope (the lawful window — iteration 1 is the discrimination probe;
   the bucket key includes the email), the 11th → the floor envelope with
   a bounded retry-seconds value (900 measured);
9. the REGISTER burst: iterations 1..10 all answer "already exists" (the
   register bucket is per-IP — every register post counts), the 11th →
   the floor envelope;
10. the per-bucket control: a login post with a DIFFERENT email answers
    the anti-enumeration envelope (NOT the floor — the key includes the
    email);
11. zero writes: the throwaway copy's User count is unchanged (2) after
    the whole ladder; the tmpdir deleted with the child killed.

## 6. Remediation design (TDD)

NEW describe **"auth limiter floors (F-PP, session-45)"** at the END of
`tests/e2e/auth.spec.ts` (the OWNING spec — the auth actions' own; the
F-II/F-JJ/F-KK/F-NN chain lives there; the file's uniques 9 → 10).

- **ONE case**, request-level (no browser surface — mirrors the F-OO /
  action-seam shapes): copy `db/custom.db` to a tmpdir; spawn the throwaway
  standalone (`node .next/standalone/server.js`, `PORT=3212`,
  `NODE_ENV=production`, `AUTH_SECRET=E2E_AUTH_SECRET`, `DATABASE_URL` = the
  absolute throwaway copy URL) inside a try/finally; poll `/api/health`
  until it answers; read the login manifest's two ids; discriminate them
  with ONE write-free probe each; then the LOAD-BEARING assertion groups:
  - **LB1 (the login floor)**: 10 posts with an unknown email → all answer
    the anti-enumeration envelope (the lawful window — the floor must not
    fire early); the 11th → the floor envelope with a bounded
    retry-seconds number;
  - **LB2 (the register floor)**: 10 posts with an existing email → all
    answer the "already exists" envelope; the 11th → the floor envelope;
  - the per-bucket control (a different email's login is NOT floored);
  - the zero-writes proof (the throwaway's user count unchanged);
  - the finally SIGTERMs the child and removes the tmpdir.
- **ZERO logins, ZERO registers, ZERO limiter consumption on the MAIN
  server** (the case never touches :3100's buckets — the throwaway process
  owns fresh `login:local:*` / `register:local` buckets).
- **Zero DB writes anywhere**: the login burst is an unknown email (no
  session rows); the register burst is an existing email (no user rows);
  the throwaway copy is deleted; the main e2e.db is untouched; no SQL
  fixtures, no afterAll cleanup.
- **Count ledger**: 139 → 140 unique cases; 276 → 278 passed + 2 skipped.
  The F-PP case-runs green on BOTH device projects (a request-level seam —
  no viewport dependence). Port 3212 (distinct from the suite's :3100, the
  F-OO case's :3211, and the probe's :3209; workers:1 serial topology).

## 7. Mutation demos (the regression shapes, proven RED — both halves)

1. **The login limiter-drop**: the `if (!limiter.allowed) { … }` block
   deleted from `loginAction` → REBUILD → the 11th login post rides through
   to the credential check and answers the anti-enumeration envelope — all
   existing case-runs GREEN (every existing login consume is lawful « 10)
   while exactly the 2 F-PP case-runs fail at LB1's floor assertion.
2. **The register limiter-drop**: the same block deleted from
   `registerAction` → REBUILD → the 11th register post answers the "already
   exists" envelope — all existing runs GREEN while exactly the 2 F-PP
   case-runs fail at LB2's floor assertion.

All restored via inverse edit (`git diff --stat src/` empty) → rebuild →
green.

## 8. Validation of this plan against the codebase (pre-execution)

- `auth.ts` read first-hand: the limiter ordering (Zod → headers →
  `rateLimit` → the floor check → the DB lookup / existing check) — the
  burst composes with zero writes on BOTH seams; the anti-enumeration
  copy; the register H-3 unique-violation guard (not reached — the existing
  pre-check answers first).
- `rate-limit.ts` read first-hand: the module-scope `buckets` Map
  (per-process state — the throwaway's buckets are disjoint from :3100's);
  `clientIpFrom` returns `"local"` without `TRUST_PROXY` (bucket keys
  `login:local:<email>` / `register:local`).
- `auth-form.tsx` read first-hand: `useActionState` + `<form action>` — the
  no-JS progressive-enhancement contract; the field names (email, name,
  password, confirmPassword, redirect); the general error renders
  `state.error.message` into the response body (the floor envelope is
  assertable on the wire).
- `validation.ts` read first-hand: `loginSchema` (email + password ≥ 1) and
  `registerSchema` (email + password ≥ 8 + matching confirmPassword) — the
  burst payloads pass Zod and reach the limiter lawfully.
- The login/register manifests read first-hand: exactly TWO ids each (both
  pages import both actions via the shared auth-form).
- `playwright.config.ts` read first-hand: the webServer env shape
  (`node .next/standalone/server.js` + `PORT` + `NODE_ENV` +
  `DATABASE_URL` + `AUTH_SECRET`) — the throwaway spawn mirrors it exactly;
  `workers: 1, fullyParallel: false` (the serial topology).
- `auth.spec.ts` read first-hand: 9 uniques counted; the F-NN describe's
  spawn/dbRead helper shapes; the `E2E_AUTH_SECRET` import path.
- `db-path.ts` contract pinned by its own unit test: absolute `file:` URLs
  pass through untouched — the throwaway copy URL stays absolute inside the
  standalone.
- The standalone exists post-`npm run build` (the E2E suite's own
  prerequisite — the throwaway spawns the same artifact).
- Trap #13 honored: `process.cwd()`-based paths in the spec (the Playwright
  loader compiles TS as CJS; `import.meta` unavailable).

## 9. Round-40 parity census (the standing ritual)

**ENVIRONMENT: the live reference (Base44) answered HTTP 503 at the round's
start and stayed down across re-probes** (the session-44 outage, unbroken).
Handled per the session-44 honest-outage precedent: the census runs
CLONE-side ×2 (40a with `--shots` on the post-restore build; 40b re-run
after the post-dev rebuild), both viewports, against the round-38/39
clone-side ledger (desktop 11085, mobile 11264, mainKids 11, footers
444/1189, the drawer's `flex flex-col gap-5 mt-4` + gaps [20,20,20,20] —
the v4 mobile-nav pin); the reference-side fields CARRY BY DOCUMENTATION
from the round-38 live measurement; the WOMEN-inert posture re-check + the
2 ref screenshots stay DEFERRED while the platform is down. The clone's
mobile-menu behavior verified end-to-end on the dev server (`rm -rf .next`
first; `env -u DATABASE_URL` boot). The reference gets one final re-probe
before the final gates; if it recovered mid-round, the full two-sided sweep
runs then.

## 10. Final gates + docs

- typecheck ✓ lint ✓ 173/173 unit ✓ build ✓ E2E **278 passed + 2 skipped**
  (140 unique × 2) — the 45th consecutive fully-green session.
- Screenshots refreshed (the sweep's clone shots + the dev-server login
  set).
- Docs aligned: SKILL (§2 E2E row + F-PP; §11 140; Appendix B NEW session-45
  row), README, CLAUDE.md, PAD, AGENTS.md, this plan's execution record,
  worklog, `docs/session_59.md`; `.env.example` unchanged and matching the
  codebase; stale-count sweep zero.
- One main-branch commit pushed via the SSH wrapper v3
  (`--remote git@github.com:nordeim/luxury-fashion-store.git`).

## Execution record

| # | Task | Result |
|---|---|---|
| 1 | Plan probe | ✅ `scripts/plan-probe-session45.cjs` — **15/15 checks passed** on the throwaway healthy-copy standalone on :3209: boots + `{"ok":true,"db":true}`; the SSR form's `$ACTION_1:0` binding (exactly one — the measured no-JS wire shape; a naive `$ACTION_ID_` guess answered 400 "Invalid Server Action request" — the probe caught it and the real encoding was extracted from the rendered form: `$ACTION_REF_1` + `$ACTION_1:0` `{id,bound}` + `$ACTION_1:1` `[null]` + `$ACTION_KEY`); the manifest's exactly TWO ids; loginAction discriminated by the anti-enumeration envelope; registerAction by its pre-limiter Zod copy (zero register-bucket consumption); the SSR binding == the discriminated loginAction (build-shape canary); the existing-email register envelope; the login burst 1..10 all lawful + the 11th → the floor (retry seconds 900, bounded); the register burst 1..10 all lawful + the 11th → the floor; the per-bucket control (a different email NOT floored); the copy's User count unchanged (2). Zero dev-DB writes, zero e2e.db writes |
| 2 | auth.spec.ts describe | ✅ NEW describe "auth limiter floors (F-PP, session-45)" at the END of `tests/e2e/auth.spec.ts` (the file's uniques 9 → 10), ONE request-level case spawning the throwaway healthy-copy standalone on :3212 (a tmpdir COPY of db/e2e.db — the serial topology keeps the suite DB quiescent at copy time; the delta-form zero-writes proof reads the copy's user count through Prisma before/after): the manifest canary (exactly two 40-hex ids) → discrimination (the login probe IS login burst iteration 1; the register probe fails registerSchema's Zod gate pre-limiter) → the SSR binding canary → register iteration 1 (the exists envelope) → **LOAD-BEARING 1** (login iterations 2..10 lawful + not-floored, the 11th → the floor envelope with bounded retry seconds 1..900) → **LOAD-BEARING 2** (register iterations 2..10 lawful + not-floored, the 11th → the floor) → the per-bucket control (a different email's login answers the enumeration envelope, NOT the floor) → the zero-writes delta (usersAfter == usersBefore); the finally SIGTERMs the child (SIGKILL escalation) and removes the tmpdir. ZERO logins, ZERO registers, ZERO main-server limiter consumption, zero DB writes. typecheck ✓ eslint ✓; GREEN **22 passed** (10 uniques × 2 + 2 setups; 51.9s; F-PP green on BOTH projects, ~1.2s each) |
| 3 | Mutation demo 1 (login limiter-drop) | ✅ the `if (!limiter.allowed) { … }` block replaced by a bare `limiter.allowed;` expression (the floor check dropped) → REBUILD → **all 20 existing case-runs GREEN** (every existing login consume is lawful « 10 — the wire-blindness proof) while **exactly the 2 F-PP case-runs failed** at LOAD-BEARING 1 (the 11th answered the credential check instead of the floor) → restored via inverse edit |
| 4 | Mutation demo 2 (register limiter-drop) | ✅ the same drop in `registerAction` → REBUILD → **the 20 existing runs GREEN** while **exactly the 2 F-PP case-runs failed** at LOAD-BEARING 2 ("the 11th register answers the floor envelope" — Received: null; LB1 stayed green, the halves are independently gated) → restored via inverse edit → `git diff --stat src/` empty (byte-identical) → rebuild → **22/22 green**. The auth actions' two abuse floors each own a gate half |
| 5 | Round-40 census + screenshots | ✅ **ENVIRONMENT: the reference (Base44) answered 503 at the round's start and stayed down across re-probes** (the session-44 outage unbroken; one final re-probe before the final gates also 503) — handled per the session-44 honest-outage precedent. **CLONE-side ×2 (40a on the post-restore build + 40b on the post-dev rebuild): ZERO DRIFT — byte-identical to the round-38/39 clone-side ledger in ALL census fields**: desktop pageH 11085, mobile pageH 11264, mainKids 11 both viewports, footers 444 (desktop) / 1189 (mobile), the drawer char-identical (panelCls `fixed left-0 top-0 h-full w-80 bg-background z-50 p-8 flex flex-col gap-6` + navCls `flex flex-col gap-5 mt-4`, 5 items, gaps [20,20,20,20]) — **the v4 mobile-nav pin holds** (the standing task re-check); clone console clean both censuses. The reference-side fields CARRY BY DOCUMENTATION from the round-38 live measurement; the WOMEN-inert posture re-check + the 2 ref screenshots stay DEFERRED (§11 item 14). The clone's mobile-menu behavior verified end-to-end on the dev server through real Playwright (`scripts/dev-hydration-probe-session38.cjs`, `rm -rf .next` first per the session-39 lesson; `env -u DATABASE_URL` boot): burger visible → drawer opens (dialog:1) → overflow hidden → Women → `/shop?category=women` → menu closed → overflow restored → zero console errors (the first run raced Turbopack's cold compile of /shop — the warm re-run measured the navigation exactly, the documented session-40/41/43/44 note reproduced). Screenshots: 11 refreshed (the sweep's 7 clone shots via `scripts/clone-census-session44.cjs` + the dev-server login set via `scripts/dev-shots-session39.cjs`: clone-login, clone-cart, clone-account, clone-admin-dashboard — zero console errors); 7 of the 11 byte-identical (deterministic rendering — itself a zero-drift signal); the dev cart's rows cleaned after the shot, canonical 4/12/2/4 re-verified by direct Prisma count |
| 6 | Final gates on the final tree | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **278 passed + 2 skipped** (140 unique × 2 − 2 desktop-only skips; 6.3m) — the FORTY-FIFTH consecutive fully-green session, exactly the §6 count ledger (139→140 unique, 276→278 passed); the F-PP case-runs green on BOTH device projects (~1.2s each) |
| 7 | Docs alignment + stale-count sweep | ✅ SKILL v1.38.0 (frontmatter 278/140 + the F-PP gate; §2 E2E row + F-PP; §11 140; Appendix B NEW session-45 row with the measured wire-shape note); README (badge 173+278, the Testing row's F-PP pin + the status row's F-PP entry, testing/architecture/status rows 140); CLAUDE.md (gate line 140 + the F-NN→F-OO→F-PP chain + the NEW F-PP segment + commands 140); PAD (test table 18\|140\|278, §7.3 command 140, the coverage-map session-45 extension); AGENTS.md (the security line gains the F-PP gate; the E2E command row 140); docs/remediation-plan-session45.md (this record); scripts/plan-probe-session45.cjs (the round's probe artifact). `.env.example` unchanged and matching the codebase. Stale-count sweep over the five living docs: zero stale counts |

## 11. Residual risks / next steps (post-F-PP)

1. The merge's H-29 transaction-atomicity half stays source-read-only
   (wire fault-injection into a SQLite tx is not Playwright-reachable;
   carried).
2. The success gate's foreign-owner row stays covered-by-shape (carried).
3. The checkout limiter floor (`checkout:${ip}`, 10/10min) stays unpinned —
   the same throwaway harness closes it, but each burst post needs a
   full checkout payload + a valid cart; candidate for a future round
   (carried, now with the harness precedent two rounds deep).
4. The PDP og:image annotation / og:type union / `style-src
   'unsafe-inline'` exceptions (carried, sessions 26–44).
5. Real PSP behind the checkout seam (carried).
6. Dev-toolchain npm-audit findings (11, all dev-only) — carried.
7. The cart/wishlist sweeper-anchor touch writes (cart.ts:39/41) stay
   source-read-only (carried).
8. The zero-drift streak is a streak, not a guarantee — the census ritual
   stays mandatory.
9. security.txt `Expires` (2027-11-01) renewal cadence (carried).
10. `NewsletterSubscriber` stays outside global-setup's wipe list
    (carried).
11. The sandbox kills detached process groups — long gates in the
    foreground (carried, honored again this round).
12. `rm -rf .next` before `npm run dev` after build-heavy rounds, then
    rebuild before re-running the sweep (the session-39/40 lessons,
    honored again this round).
13. The F-OO/F-PP throwaway-server harnesses spawn a child process per
    case-run (4 per full suite run now, ~2s boot each) — if a future round
    adds more throwaway-server cases, consider a describe-scoped beforeAll
    spawn to amortize (carried).
14. The reference platform's 503 outage (Base44 — down through session-44
    AND session-45's census windows) keeps the two-sided census's
    reference half, the WOMEN-inert posture re-check, and the 2 ref
    screenshots DEFERRED; the NEXT round re-runs the full two-sided sweep
    FIRST THING if the platform recovered (carried forward).
