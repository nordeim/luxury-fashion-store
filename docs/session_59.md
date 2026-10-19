# Session 59 — the session-45 round (F-PP: the login/register limiter floors — a throwaway healthy-DB server)

Resuming with the **Session 44 task book** (the user's latest directive). Per the
standing precedent, my round = the session-44 continuation auditing `2daaeca`
(the parallel thread's session-log commit — docs-only) plus a full
re-verification of the committed tree. The workspace had been RESET again —
**fresh clone** per the task brief, with the known recovery set closed before
any gate: `npm install` (486 packages); the canonical 3-line `.env` with
`DATABASE_URL="file:../db/custom.db"`; `db:setup` materializing `db/custom.db`
at the canonical 4/12/2/4 (the seed's own completion print); Playwright
**chromium-1248 reinstalled** (the cache shipped only the 1200 headless-shell —
the 4th consecutive reset with this quirk, now fully expected).

**Step 1: Workspace refresh + audit of the pulled HEAD**

`git show --stat 2daaeca` → 1 file, +82: `docs/session_58.md` only — the
parallel thread's raw narration transcript of the SAME session-44 round; its
ledger matches `d4b44f0`'s actual work (test-only, zero `src/`, the F-OO
describe + 11 screenshots + five-docs alignment + SKILL v1.37.0). Docs-only,
RETAINED. This round's narration ships as `docs/session_59.md`.

**Step 2: Baseline gates — re-proven from scratch on the fresh clone**

typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build + assemble ✓ E2E
**276 passed + 2 skipped** (139 unique × 2; 6.2m) — the 44th consecutive
session fully green at baseline, exactly matching session-44's final gates.

**Step 3: Fresh audit pass — the round's finding**

The session-44 plan §11 named this round's candidates directly: item 3 —
the login/register limiter floors ("a throwaway burst would close them the
same way F-OO closes search's; candidate for a future round, now that the
harness shape exists"); item 16 — the reference-outage two-sided sweep
re-check. The standing Tailwind v4 / mobile-nav pins re-verified first-hand
(the drawer's `flex flex-col gap-5 mt-4` at mobile-nav.tsx:76, the `w-80`
panel; every `@theme` token a full `hsl()` literal in globals.css; zero
`space-y` on parity surfaces). The reference re-probed at the round's start
and twice more: **STILL 503** (the Base44 outage unbroken) — handled per the
session-44 honest-outage precedent.

**F-PP — the auth seam's limiter floors.** Both auth mutation actions carry
the same abuse floor, unpinned since the limiter's introduction:
`loginAction`'s `rateLimit("login:"+ip+":"+email, 10, 15min)` (auth.ts:32) and
`registerAction`'s `rateLimit("register:"+ip, 10, 15min)` (auth.ts:73) — the
11th same-key attempt must answer the "Too many attempts. Try again in N
seconds." envelope. Wire-blind: every existing login/register consume in the
suite is lawful and far under 10, so a dropped `if (!limiter.allowed)` block
rides every burst through with all gates green — the brute-force /
bulk-register silent-abuse class F-OO closed for `/api/search`. Carried
because tripping either floor on the MAIN server would poison the shared
buckets for 15 minutes and break every later lawful login/register.

**The F-OO harness insight, applied to the auth seam — with a twist:** the
auth actions need a WORKING database (the login's user lookup and the
register's existing-check must answer envelopes, not raw 500s), so the
throwaway spawns against a **healthy THROWAWAY COPY of `db/e2e.db`**
(the copyFile + absolute-URL pattern the F-LL/F-MM/F-NN probes already use).
The isolated process owns its own module-scope limiter buckets — the 11+11
burst consumes ZERO of :3100's buckets.

**Step 4: Plan-probe discipline (BEFORE the spec) — the round's discovery**

`scripts/plan-probe-session45.cjs` — the throwaway healthy-copy standalone
on :3209. **The probe caught a real protocol fact:** a naive `$ACTION_ID_<id>`
form field answers **400 "Invalid Server Action request"** — that is NOT the
Next 16 encoding. The real no-JS wire shape was extracted from the rendered
`/login` HTML: the SSR'd form carries `$ACTION_REF_1`, `$ACTION_1:0` =
`{"id":"<hex>","bound":"$@1"}` (the action binding), `$ACTION_1:1` =
`"[null]"` (the bound prev-state), and `$ACTION_KEY` — a multipart POST
carrying those plus the form's own fields invokes the action server-side
exactly as a browser without JS does (wire-verified: 200 + the re-rendered
HTML carrying the envelope in the response body). A second probe lesson: the
first probe run HUNG — a zombie `next-server` from an earlier diagnostic
still held :3209 and Node's `fetch` has no default timeout; the probe was
hardened with a 15s per-request AbortController (the harness now can never
hang). **Final: 15/15 checks passed** — boot + `{"ok":true,"db":true}`; the
SSR `$ACTION_1:0` binding (exactly one); the manifest's exactly TWO ids;
loginAction discriminated by the anti-enumeration envelope; registerAction
by its pre-limiter Zod copy (zero register-bucket consumption); the SSR
binding == the discriminated loginAction; the existing-email register
envelope; the login burst 1..10 lawful + the 11th → the floor (retry seconds
900, bounded); the register burst 1..10 lawful + the 11th → the floor; the
per-bucket control (a different email NOT floored); the copy's User count
unchanged. The probe also caught TWO off-by-one miscounts in its own first
draft (the discrimination probes consumed burst iterations 1) — restructured
so the login probe IS login burst iteration 1 and the register
existing-email probe IS register burst iteration 1.

**Step 5: The TDD spec**

NEW describe **"auth limiter floors (F-PP, session-45)"** at the END of
`tests/e2e/auth.spec.ts` (the OWNING spec — the F-II/F-JJ/F-KK/F-NN chain's
home; the file's uniques 9 → 10). ONE request-level case: copy `db/e2e.db`
to a tmpdir (the serial topology keeps the suite DB quiescent at copy time);
spawn the throwaway on :3212 (the webServer env shape mirrored); poll
health; the manifest canary (exactly two 40-hex ids); discrimination (the
login probe IS burst iteration 1); the SSR `$ACTION_1:0` binding canary;
register iteration 1 (the exists envelope); **LOAD-BEARING 1** (login
iterations 2..10 lawful + NOT floored, the 11th → the floor envelope with
bounded retry seconds 1..900); **LOAD-BEARING 2** (register iterations 2..10
lawful + NOT floored, the 11th → the floor); the per-bucket control (a
different email's login answers the enumeration envelope, NOT the floor);
the zero-writes delta (usersAfter == usersBefore on the copy, read through
Prisma); the finally SIGTERMs the child (SIGKILL escalation) and removes the
tmpdir. **ZERO logins, ZERO registers, ZERO main-server limiter consumption,
zero DB writes anywhere.** GREEN **22 passed** (10 uniques × 2 + 2 setups;
F-PP green on BOTH projects, ~1.2s each).

**Step 6: TWO mutation demos — both halves independently gated**

1. **The login limiter-drop** (the `if (!limiter.allowed)` block replaced by
   a bare expression) → REBUILD → all 20 existing case-runs GREEN (every
   existing consume lawful « 10 — the wire-blindness proof) while exactly
   the 2 F-PP case-runs failed at LOAD-BEARING 1.
2. **The register limiter-drop** (the same drop in `registerAction`) →
   REBUILD → the 20 green while exactly the 2 F-PP case-runs failed at
   LOAD-BEARING 2 ("the 11th register answers the floor envelope" —
   Received: null; LB1 stayed green).

All restored via inverse edit (`git diff --stat src/` empty — byte-identical)
→ rebuild → 22/22 green.

**Step 7: Round-40 census — the reference outage handled honestly (again)**

**ENVIRONMENT: the LIVE reference (Base44) answered HTTP 503 at the round's
start and stayed down across re-probes** (including one final re-probe
before the final gates) — the session-44 platform outage, unbroken. The
census ran **clone-side ×2** (40a on the post-restore build + 40b on the
post-dev rebuild): **ZERO DRIFT — byte-identical to the round-38/39
clone-side ledger in ALL census fields**: desktop pageH 11085, mobile pageH
11264, mainKids 11 both viewports, footers 444/1189, the drawer
char-identical (`w-80` panel + `flex flex-col gap-6` + `flex flex-col gap-5
mt-4` + gaps [20,20,20,20]) — **the v4 mobile-nav pin holds**; clone console
clean both censuses. The reference-side fields carry by documentation from
the round-38 live measurement; the WOMEN-inert posture re-check + the 2 ref
screenshots stay DEFERRED (§11 item 14, carried). The clone's mobile-menu
behavior verified end-to-end on the dev server (`rm -rf .next` first;
`env -u DATABASE_URL` boot): burger → drawer → scroll lock → Women →
`/shop?category=women` → closed → overflow restored → zero console errors
(the first run raced Turbopack's cold compile of `/shop` — the warm re-run
measured the navigation exactly, the documented note reproduced). 11
screenshots refreshed (the sweep's 7 clone shots + the dev-server login
set); 7 of the 11 byte-identical (deterministic rendering — itself a
zero-drift signal); the dev cart's rows cleaned after the shot, canonical
4/12/2/4 re-verified.

**Step 8: Final gates + docs**

typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **278
passed + 2 skipped** (140 unique × 2; 6.3m) — the 45th consecutive
fully-green session, exactly the plan's count ledger (139→140 unique,
276→278 passed); the F-PP case-runs green on BOTH device projects. Docs
aligned: SKILL v1.38.0 (frontmatter 278/140 + F-PP; §2 E2E row + F-PP;
§11 140; Appendix B NEW session-45 row with the measured wire-shape note),
README (badge 173+278 + the F-PP pins + status rows 140), CLAUDE.md (gate
line 140 + the F-OO→F-PP chain + the NEW F-PP segment + commands 140), PAD
(test table 18|140|278 + §7.3 command 140 + the coverage-map session-45
extension), AGENTS.md (the security line + the E2E command row 140),
`docs/remediation-plan-session45.md` (the plan + this execution record),
worklog, this log; `.env.example` unchanged and matching the codebase;
stale-count sweep zero.

**Step 9: Commit + push (main only)**

One main-branch commit (test-only round — zero `src/` changes; the
artifacts: the F-PP describe + the plan + the probe script + the refreshed
screenshots + the five-docs alignment + the worklog + this log) pushed via
the SSH wrapper v3 with
`--remote git@github.com:nordeim/luxury-fashion-store.git`, verified on the
remote, key shredded.
