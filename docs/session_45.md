# Session 45 — the session-38 round (F-II: the password rotation's session-revocation contract)

Resuming with the **Session 38 task book** (trace `1a14c892e09a4a61`). Per the standing
precedent, my round = the session-37 continuation auditing `9bb8751` (the parallel
thread's narration-log commit — docs-only) plus a full re-verification of the committed
tree.

**Step 1: Workspace refresh + sandbox state check**

Pulled `9bb8751` (fast-forward `3f1f27a..9bb8751` — brought ONLY `docs/session_44.md`,
the parallel thread's narration of the same session-37 round; local main = remote main).
Sandbox/recovery incidents — **ZERO** (the warm workspace survived; every reset-set item
re-checked per the standing rule: node_modules, skills/ tree, no bun.lock, chromium-1248,
the ssh shim + paramiko 5.0.0, the canonical `.env`, db/custom.db at 4/12/2/4 by direct
Prisma count). One NEW sandbox fact measured first-hand: the sandbox kills detached
process groups (both `nohup` background E2E attempts died right after the setups —
the log ends mid-worker with no summary; long gates run in the foreground).

**Step 2: Baseline gates — re-verified**

typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build + assemble ✓ E2E **262 passed +
2 skipped** (132 unique × 2; 5.5m) — the THIRTY-FIRST consecutive session fully green at
baseline.

**Step 3: First-hand audit of `9bb8751`**

Docs-only (1 file, +95 — `docs/session_44.md`; its ledger matches `3f1f27a`'s actual
diff: the test-only F-HH round re-narrated). The session-37 round itself verified via
the worklog + plan + `git show --stat` (19 files, +712/−17, the only code-adjacent
change `tests/e2e/admin.spec.ts` +209; zero `src/`) and the F-HH describe re-ran green
inside the baseline E2E.

**Step 4: Fresh audit pass — the round's finding**

The standing residual list re-triaged first-hand. The strongest remaining candidate —
verified by exhaustive search: `rg "changePassword|currentPassword|newPassword" tests/`
→ **NOTHING**. **F-II** — `changePasswordAction`'s **F-4 session-revocation contract**
(`src/lib/actions/account.ts:54-61`): the password rotation updates the hash AND then
revokes every OTHER session (`db.session.deleteMany({ where: { userId, token: { not:
keepToken } } })`), keeping the caller's own session so the user isn't logged out
mid-flow. The F-4 comment documents the exact regression class as having SHIPPED
before ("a hijacked session previously survived the change", session-3) — the session
table IS the denylist (ADR-006), and the rotation is the moment that denylist gets
exercised. Yet NO gate ever verified it: the Settings-tab password form is driven by
zero specs; a dropped `deleteMany` leaves the toast green ("Password changed.") while
a hijacked session survives the rotation — the same toast-blind silent class F-HH
pinned on the admin seam, now on the security-critical auth seam. LOW gate-coverage,
zero product defect. Competing leads carried: the search-429 limiter harness
(tooling), the merge's H-29 tx half (not wire-reachable), the foreign-owner row
(covered-by-shape), the `updateProfileAction` write (cosmetic class, weaker).

**Step 5: Plan-probe discipline (BEFORE the spec)**

`scripts/plan-probe-session38.cjs` — a throwaway copy of `db/custom.db` + the
standalone on :3209: **18/18 checks passed**, wire-verifying every assumption: the real
login (session A), the cookie's `token.hmac` shape, the OFFLINE-minted hijacked session
row (the a11y/F-HH pattern's first customer-side use), **the mint's wire validity** (a
context carrying its cookie renders /account signed-in), the pre-rotation count, the
real form's "Password changed.", **the F-4 REVOKE half** (the hijacked row GONE),
**the F-4 KEEP half** (session A's row still present), the count arithmetic, the wire
keep-half (signed-in after rotation), **the offline scrypt verification** (the
`verifyPassword` replication — new password verifies, old fails), the hash rotation,
the revoked cookie bouncing to /login, the captured-hash restore, the byte-identical
restore, the no-leftover check, zero console errors. Zero dev-DB writes, zero e2e.db
writes.

**Step 6: Remediation plan + TDD**

Plan saved → validated against the codebase → NEW describe "password rotation (F-II,
session-38)" in `tests/e2e/auth.spec.ts` (the OWNING spec — the auth mutation surface's
own; the spec count stays 18), ONE case riding the per-project storageState + the
offline-minted hijacked session (ZERO logins, ZERO registers — the james/admin buckets
stay exactly consumed; the register bucket stays 8 < 10): the case captures james's
runtime passwordHash, drives the REAL form (Settings tab → current/new/confirm →
Update Password), asserts the hijacked row GONE (LOAD-BEARING), the caller's session
row STILL present BY TOKEN (LOAD-BEARING — the keep half), a fresh signed-in /account
render (wire-real), and the offline scrypt verification (the write half, LOAD-BEARING);
the finally restores the captured hash byte-identically + drops the minted row.
**One mid-execution design correction, first-hand**: the first draft asserted the keep
half by session COUNT — it failed on BOTH projects because Playwright runs BOTH setup
projects up-front, so james holds the OTHER project's setup session too and F-4
lawfully revokes it (Expected 2 / Received 1). The count was scheduling-dependent and
never the contract — replaced by the BY-TOKEN assertion + the
**resurrect-in-finally** discipline (insert-if-missing rows for the `.auth` files'
cookie tokens, keeping the later project's specs signed-in — the
finally-restores-captured-state rule extended to session rows). Typecheck ✓ eslint ✓;
GREEN **14 passed** (6 existing uniques + 1 F-II unique) × 2 + 2 setups.

**Step 7: Mutation demo (surgical, inverse-restore)**

The `db.session.deleteMany` revocation dropped from `changePasswordAction` (the exact
hijack-survival regression shape F-4 documents) → REBUILD → **exactly the 2 F-II
case-runs failed** (the failure landing at `expect(hijackGone).toBeNull()` — the row
STILL THERE, the dbRead server-truth witness; all 12 other cases stayed green: the
toast still says "Password changed." — the silent class) → restored via inverse edit
(git diff on src/ empty; deleteMany rg-verified at :59) → rebuild → 14/14 green.

**Step 8: Round-33 census + the standing mobile-nav re-check + screenshots**

**ZERO DRIFT — byte-identical to the round-32 ledger in ALL census fields (41st/42nd
consecutive sweep), both censuses on the final tree**: desktop pageH 11079 (ref) /
11085 (clone), mobile 11257 / 11264, mainKids 11 BOTH sides both viewports, footers
444/1189, the drawer char-identical (panelCls `fixed left-0 top-0 h-full w-80
bg-background z-50 p-8 flex flex-col gap-6` + navCls `flex flex-col gap-5 mt-4`, 5
items, gaps [20,20,20,20]) — **the v4 mobile-nav pin holds**. The reference's
functional posture re-confirmed through agent-browser (logged in with the task
credentials): the WOMEN nav button is INERT (click → URL unchanged) — the clone stays
the functional superset. The clone's mobile-menu behavior verified end-to-end on the
dev server through real Playwright (`scripts/dev-hydration-probe-session38.cjs`):
burger visible → drawer opens → body overflow `hidden` → Women click →
`/shop?category=women` → menu closed → overflow restored → zero console errors.
**One harness lesson first-hand**: the dev server went inert mid-round (burger
unfound, clicks dead) — running `npm run build` while `npm run dev` is live CLOBBERS
the shared `.next/` and breaks the dev session's hydration; a fresh dev-server restart
restored full interactivity (the product was never broken — the standalone was census-
and E2E-green throughout). Screenshots: 13 refreshed (the sweep's 9 + the dev-server
login set: clone-login, clone-cart, clone-account, clone-admin-dashboard).

**Step 9: Final gates**

typecheck ✓ lint ✓ 173/173 unit ✓ build ✓ **E2E 264 passed + 2 skipped** (133 unique ×
2 − 2 desktop-only skips; 5.7m) — the THIRTY-SECOND consecutive fully-green session,
exactly the plan's count ledger (132→133 unique, 262→264 passed); the F-II case-runs
green on BOTH projects.

**Step 10: Docs + commit + push**

SKILL v1.31.0 (frontmatter 133+264+2, §2 E2E row + F-II, §11 133, Appendix B NEW
session-38 row with the customer-side offline-session + resurrect + offline-scrypt
patterns); README (badge 173+264, the Auth row + the rotation pin, testing/status
rows 133); CLAUDE.md (gate line 133 + the F-II gate in the chain, NEW F-II testing
bullet, commands 133); PAD (test table 18|133|264, §7.3 command 133, the §7.1
coverage-map session-38 extension); AGENTS.md (the security line gains the F-II gate);
the plan's execution record; worklog; this narration log (`docs/session_45.md` —
session_44.md taken by the pulled commit); `.env.example` re-verified matching the
codebase (unchanged). Stale-count sweep clean. Commit → SSH wrapper v3 push to
`git@github.com:nordeim/luxury-fashion-store.git` (the `--remote` flag per the
session-42 lesson) → remote verified → key shredded.

**Session 38 (session-37 continuation) complete** — the 32nd consecutive fully-green
session.

**What happened this round:**
- **Pulled `9bb8751`** (docs-only); ZERO sandbox incidents (all reset-set items
  re-checked and green); one new harness fact: the sandbox kills detached process
  groups — foreground gates only
- **Baseline re-verified**: typecheck ✓ lint ✓ 173/173 unit ✓ build ✓ E2E 262 + 2 —
  the 31st consecutive green baseline
- **Round-33 census: ZERO DRIFT** (41st/42nd) — the mobile drawer's Tailwind v4
  `flex gap-5` pin char-identical; the reference's nav buttons confirmed inert; the
  clone's mobile menu verified end-to-end on the dev server (opens → navigates →
  closes → scroll restored)
- **Found + closed F-II via TDD**: the password rotation's F-4 session-revocation
  contract — zero coverage, security-critical (the hijack-survival bug class F-4
  documents as having shipped) — now pinned with server-truth dbRead on an
  offline-minted hijacked session (zero logins, zero registers), the keep half by
  token + on the wire, and the hash rotation by offline scrypt; the mutation demo
  failed exactly the 2 new case-runs while the toast stayed green
- **Final gates**: typecheck ✓ lint ✓ 173/173 unit ✓ build ✓ **E2E 264 passed + 2
  skipped** (133×2); SKILL v1.31.0, all five living docs aligned, 13 screenshots
  refreshed, worklog updated

**Suggested next steps:** pull fresh next round and re-check ALL reset-set items
(zero-incident rounds are luck, not a trend — this round's new fact: foreground gates
only, the sandbox kills detached process groups); residual candidates in
`docs/remediation-plan-session38.md` §8 (the search-429 limiter-reset harness,
`updateProfileAction`'s write — the sibling seam, cosmetic class; the merge's H-29
transaction-atomicity half — not wire-reachable; the success gate's foreign-owner row
— covered-by-shape); the customer-side offline-session mint + the resurrect-in-finally
+ the offline scrypt verification are the three NEW reusable patterns (zero-budget
auth-seam pins); running `npm run build` while `npm run dev` is live breaks the dev
session — restart the dev server after any build.
