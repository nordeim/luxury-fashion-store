# Session 49 — the session-40 round (F-KK: the logout's session-row revocation)

Resuming with the **Session 40 task book** (the user's latest directive). Per the
standing precedent, my round = the session-39 continuation auditing `535a339`
(the parallel thread's session-log commit — docs-only) plus a full re-verification
of the committed tree. The sandbox workspace had been **reset** — the fresh-clone
recovery set re-run first.

**Step 1: Workspace refresh (fresh clone) + recovery set**

`git clone https://github.com/nordeim/luxury-fashion-store.git` (HEAD `535a339`
= remote `main`). The fresh-clone incidents all closed before any gate:
`npm install` ✓ · the canonical 3-line `.env` written with
`DATABASE_URL="file:../db/custom.db"` ✓ · `npm run db:setup` materializing
`db/custom.db` at the canonical **4/12/2/4** by direct Prisma count
(`env -u DATABASE_URL`) ✓ · Playwright chromium-1248 reinstalled ✓ · the ssh
shim + paramiko venv rebuilt for the push (step 10) ✓.

**Step 2: Baseline gates — re-verified from scratch**

typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build + assemble ✓ E2E
**266 passed + 2 skipped** (134 unique × 2; 5.8m) — the THIRTY-FIFTH
consecutive session fully green at baseline, exactly matching the session-39
final gates.

**Step 3: First-hand audit of `535a339`**

`git show --stat` → 1 file, +81: `docs/session_48.md` only — the parallel
thread's narration of the SAME session-39 round; its ledger matches `0726926`'s
actual diff (test-only, zero `src/`, the F-JJ describe in `auth.spec.ts`);
docs-only, RETAINED. This round's narration ships as `docs/session_49.md`.

**Step 4: Fresh audit pass — the round's finding**

The session-39 plan §8 directive: "account.ts is now FULLY gated — look at
other files' un-exercised WRITE halves next." A systematic seam-by-seam sweep
(account/admin/auth/cart/checkout/wishlist × write half × gate) found ONE
ungated write: **F-KK — `destroySession`'s ROW-REVOCATION half**
(`src/lib/auth.ts:105` — `db.session.deleteMany({ where: { token } })`).
The existing logout case (auth.spec.ts:70) asserts only the wire half — the
redirect to `/` and the post-logout `/account` → `/login` bounce — and the
bounce is driven by the **COOKIE CLEAR ALONE**: a dropped deleteMany leaves
every existing assertion green while the Session row (the ADR-006 denylist —
the auth.ts header says so verbatim) lingers up to ~30d, and a cookie stolen
BEFORE the logout survives it (the hijack-survival class F-4 documents at the
password seam, at the logout seam instead). Security-bearing, LOW
gate-coverage, zero product defect. Exhaustive verification: the only Session
reads in the suite are the F-II/a11y/F-HH fixture MINTS — none reads the row
state after a logout.

**Step 5: Plan-probe discipline (BEFORE the spec)**

`scripts/plan-probe-session40.cjs` — a throwaway copy of `db/custom.db` + the
standalone on :3209: **11/11 checks passed**, wire-verifying: the offline-minted
row (INSERT…SELECT, james's id resolved by the DB), the mint's WIRE VALIDITY
(the cookie + row render /account signed-in), the tabs' mount, the REAL Sign
out control, the redirect to `/`, **the REVOKE half (LOAD-BEARING — the row
GONE after the logout)**, the cookie-clear bounce, the cookie gone from the
context, james can log in again afterwards (no collateral damage), the
afterAll belt-and-braces DELETE is a no-op on the healthy logout, zero console
errors. Zero dev-DB writes, zero e2e.db writes. (One probe-harness fix en
route: the tabs-mount check needed the Profile tab's Radix activation click —
the contract checks all passed first run.)

**Step 6: The TDD spec**

NEW describe **"logout row revocation (F-KK, session-40)"** at the END of
`tests/e2e/auth.spec.ts` (the OWNING spec — with F-II/F-JJ, auth.ts's three
mutation seams each own a gate in it; the spec count stays 18). **ZERO logins,
ZERO registers, ZERO limiter consumption** (logoutAction carries no limiter —
verified by source read): the session under test is minted OFFLINE (the
F-II/F-HH/a11y-M-1 family's second customer-side use — a random 256-bit token,
the cookie signed `token.hmac` with the shared E2E_AUTH_SECRET, the row via
`prisma db execute`), and the describe rides a **describe-scoped storageState
carrying ONLY the minted cookie** — the project's setup session never ridden,
never destroyed (the H-24 trap). The case: renders `/account` on the minted
session (SUPPORTING — wire validity), clicks the REAL Sign out control,
asserts the redirect (SUPPORTING), the server-truth dbRead — the minted row
GONE (LOAD-BEARING), the fresh `/account` bounce + the cookie cleared
(SUPPORTING — re-asserted so a both-halves-dropped regression fails visibly).
GREEN **18 passed** (8 existing + 1 F-KK unique) × 2 + 2 setups (42.4s; F-KK
green on BOTH projects, 1.3s/1.4s).

**Step 7: The mutation demo**

The `db.session.deleteMany` dropped from `destroySession` → REBUILD → **the
existing logout case STAYED GREEN** (the wire-blind gap's proof — the bounce
is driven by the cookie clear alone) while **exactly the 2 F-KK case-runs
failed** at `expect(revoked).toBeNull()` — Received `{"id":"fkk-james-…"}`,
the row STILL THERE, the dbRead server-truth witness → restored via inverse
edit (git diff on src/ empty; the deleteMany rg-verified at :105) → rebuild →
18/18 green.

**Step 8: Round-35 census + the reference posture**

Round-35a (`--shots`) + 35b (post-rebuild): **ZERO DRIFT — byte-identical to
the round-34 ledger in ALL census fields (45th/46th consecutive sweep)**:
desktop pageH 11079/11085, mobile 11257/11264, mainKids 11 both sides both
viewports, footers 444/1189, the drawer char-identical `w-80` + `flex flex-col
gap-5 mt-4` + gaps [20,20,20,20] — **the v4 mobile-nav pin holds** (the
standing task re-check); ref console = the documented 2× 401 residue; clone
console clean. The reference's functional posture re-confirmed first-hand
through agent-browser (logged in with the task credentials): the WOMEN nav
button is INERT (click → URL unchanged) — the clone stays the functional
superset. The clone's mobile-menu behavior verified end-to-end on the dev
server (`rm -rf .next` first, the session-39 lesson): burger → drawer →
scroll lock → Women → `/shop?category=women` → menu closed → overflow
restored → zero console errors. **ONE NEW harness fact, measured first-hand**:
the pre-dev `rm -rf .next` deletes the STANDALONE too — the sweep run
afterwards failed fast at the tool's own `assertChildAlive` guard while the
stale `/tmp/sweep-results.json` from the earlier census masqueraded as
results; **rebuild FIRST, then re-run the second census** after any
`rm -rf .next` (35b re-measured true zero drift). One measurement note: the
hydration probe's first URL read raced Turbopack's cold compile of `/shop`
(the 800ms window) — the warm re-run measured the navigation exactly.

**Step 9: Final gates + docs**

typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **268
passed + 2 skipped** (135 unique × 2; 5.9m) — the THIRTY-SIXTH consecutive
fully-green session, exactly the plan's count ledger (134→135 unique,
266→268 passed); the F-KK case-runs green on BOTH projects. Screenshots: 13
refreshed (the sweep's 9 + the dev-server login set: clone-login, clone-cart,
clone-account, clone-admin-dashboard — zero console errors; the dev cart's
item rows cleaned after the shot, canonical 4/12/2/4 re-verified). Docs
aligned: SKILL v1.33.0 (§2 E2E row + F-KK; §11 135; Appendix B NEW session-40
row), README (badge 173+268 + the Auth row's logout pin), CLAUDE.md (gate
line 135 + the F-KK bullet), PAD (test table 18|135|268 + the coverage-map
session-40 extension + §7.3 135), AGENTS.md (the security line + the E2E
command row), `docs/remediation-plan-session40.md` (§7 execution record),
worklog, this log; `.env.example` unchanged and matching the codebase;
stale-count sweep zero.

**Step 10: Commit + push (main only)**

One main-branch commit (test-only round — zero `src/` changes; the artifacts:
the F-KK describe + the plan + the probe script + the 13 screenshots + the
five-docs alignment + the worklog + this log) pushed via the SSH wrapper v3
with `--remote git@github.com:nordeim/luxury-fashion-store.git`, verified on
the remote, key shredded.
