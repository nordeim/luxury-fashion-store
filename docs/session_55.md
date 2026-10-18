# Session 55 — the session-43 round (F-NN: the expired-session denial — the TTL revoke half of the session denylist)

Resuming with the **Session 42 task book** (the user's latest directive). Per the
standing precedent, my round = the session-42 continuation auditing `0875d10`
(the parallel thread's session-log commit — docs-only) plus a full re-verification
of the committed tree. The workspace had been RESET again — **fresh clone** per
the task brief, with the known recovery set closed before any gate: `npm
install` (486 packages); the canonical 3-line `.env` with
`DATABASE_URL="file:../db/custom.db"`; `db:setup` materializing `db/custom.db`
at the canonical 4/12/2/4 by direct Prisma count (`env -u DATABASE_URL` — the
documented sandbox quirk: the parent-workspace `DATABASE_URL` override starves
the boot sweeper); Playwright **chromium-1248 reinstalled** (the cache shipped
only 1200 — the 2nd consecutive reset with this quirk, now fully expected).

**Step 1: Workspace refresh + audit of the pulled HEAD**

`git show --stat 0875d10` → 1 file, +85: `docs/session_54.md` only — the
parallel thread's raw narration transcript of the SAME session-42 round; its
ledger matches `e019a48`'s actual work (test-only, zero `src/`, the F-MM
describe + 13 screenshots + five-docs alignment + SKILL v1.35.0). Docs-only,
RETAINED. This round's narration ships as `docs/session_55.md`.

**Step 2: Baseline gates — re-proven from scratch on the fresh clone**

typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build + assemble ✓ E2E
**272 passed + 2 skipped** (137 unique × 2; 6.2m) — the 40th consecutive
session fully green at baseline, exactly matching session-42's final gates.

**Step 3: Fresh audit pass — the round's finding**

The session-42 plan §11 directive: the read/write-side seams are nearly
exhausted. This round's survey: **every non-transactional `db.*` write in
`src/` checked against its gate** (session-42 audited the writes inside
transactions; the single-write actions were surveyed as a class), plus the
read-time enforcement seams of the auth layer. The write census closed
cleanly on every seam (address CRUD H-4/H-8, cart merge H-8, wishlist merges
F-EE/F-GG, register/login behavioral, newsletter F-Y, admin H-7/H-15, the
placeOnce set F-MM) — EXCEPT one:

**F-NN — the expired-session denial seam** (`src/lib/auth.ts:132-135`,
`getCurrentUser`). The session table IS the denylist (ADR-006); its three
revoke halves: logout (F-KK gated, session-40), rotation (F-II gated,
session-38) — and **TTL expiry, gated by NOTHING**. Two separable halves,
each ungated: (1) the expiry CHECK (:132) — a dropped check lets an
expired-but-present row authenticate its bearer up to the next hourly sweep
(a zombie-auth window — the stolen-cookie threat model F-KK documents); (2)
the inline PRUNE (:133) — a dropped prune lingers the dead row while the
wire stays green (the F-KK silent-lingering class's sibling; the sweeper's
own comment documents the read-time contract). Wire-blindness verified
first-hand: ALL five offline-mint sites in the suite mint FUTURE expiry
(`datetime('now', '+1 day')` — F-II's hijack + resurrect, F-KK, F-HH, the
a11y M-1 gate); every login-minted session is +30d; the sweeper unit test
pins the PLAN shape only. HIGH severity class, zero product defect today.

**Step 4: Plan-probe discipline (BEFORE the spec)**

`scripts/plan-probe-session43.cjs` — a throwaway copy of `db/custom.db` +
the standalone on :3209: **7/7 checks passed**, wire-verifying: the
offline-minted EXPIRED james row (INSERT…SELECT, `datetime('now', '-1
day')`), the mint's WIRE DENIAL (/account bounces to
`/login?redirect=/account`), the bounce URL shape, **the CONTROL mint** (a
FUTURE-expiry row + cookie on a fresh context renders /account SIGNED-IN —
the denial is the EXPIRY, not a broken mint — the false-positive guard the
earlier F-xx probes never needed because their subjects WERE the future
mints), **the LOAD-BEARING prune** (the expired row GONE after the read —
auth.ts:133's inline delete), the control row NOT pruned, zero console
errors. Zero dev-DB writes, zero e2e.db writes.

**Step 5: The TDD spec**

NEW describe **"expired session denial (F-NN, session-43)"** at the END of
`tests/e2e/auth.spec.ts` (the OWNING spec — the auth seam's own; the file's
uniques 8 → 9). **ZERO logins, ZERO registers, ZERO limiter consumption**
(the F-KK shape — a describe-scoped minted-cookie storageState, the project's
setup session never ridden). The case: the precondition dbRead (the row
exists AND its expiry is PAST), **LOAD-BEARING 1** (the wire denial: /account
bounces to `/login?redirect=/account`), **LOAD-BEARING 2** (the prune: the
row is GONE after the read, server-truth dbRead — the sweeper runs boot+hourly,
never inside a 6-minute run, and the row was inserted after boot, so only
getCurrentUser's inline delete can produce the null). GREEN **20 passed**
(9 uniques × 2 + 2 setups; F-NN green on BOTH projects, 755ms).

**Step 6: TWO mutation demos — both halves independently gated**

1. **The check-drop** (the whole expiry block deleted — the zombie-auth
   shape) → REBUILD → **all 18 existing case-runs GREEN** (F-II, F-JJ,
   F-KK, every login/logout case — all future-expiry, the wire-blindness
   proof) while exactly the 2 F-NN case-runs failed at `toHaveURL` (the page
   stayed SIGNED-IN on /account).
2. **The prune-drop** (the `db.session.delete` line removed, the check +
   bounce kept — compiles clean) → REBUILD → **the wire denial stayed
   GREEN** while exactly the 2 F-NN case-runs failed at the prune dbRead
   (Expected null / Received `{"id": "fnn-james-…"}`).
3. Restored via inverse edit (`git diff --stat src/` empty — byte-identical)
   → rebuild → 20/20 green. **The denylist's three revoke halves each own a
   gate: F-KK (logout), F-II (rotation), F-NN (TTL expiry).**

**Step 7: Round-38 census + the reference posture**

Round-38a (`--shots`) + 38b (post-dev rebuild re-run): **ZERO DRIFT —
byte-identical to the round-34/35/36/37 ledger in ALL census fields
(51st/52nd consecutive sweep)**: desktop pageH 11079/11085, mobile
11257/11264, mainKids 11 both sides both viewports, footers 444/444 +
1189/1189, the drawer char-identical `w-80` + `flex flex-col gap-5 mt-4` +
gaps [20,20,20,20] — **the v4 mobile-nav pin holds** (the standing task
re-check); ref console = the documented 2× 401 residue; clone console
clean. The reference's WOMEN nav button confirmed INERT through
agent-browser after a real login with the task credentials — the clone stays
the functional superset. The clone's mobile-menu behavior verified
end-to-end on the dev server (`rm -rf .next` first, the session-39 lesson;
`env -u DATABASE_URL` boot): burger → drawer → scroll lock → Women →
`/shop?category=women` → menu closed → overflow restored → zero console
errors (the first run raced Turbopack's cold compile of `/shop`; the warm
re-run measured the navigation exactly — the documented session-40/41
measurement note reproduced). 13 screenshots refreshed (the sweep's 9 + the
dev-server login set; the dev cart's rows cleaned after the shot, canonical
4/12/2/4 re-verified).

**Step 8: Final gates + docs**

typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **274
passed + 2 skipped** (138 unique × 2; 6.3m) — the 41st consecutive
fully-green session, exactly the plan's count ledger (137→138 unique,
272→274 passed); the F-NN case-runs green on BOTH device projects. Docs
aligned: SKILL v1.36.0 (§2 E2E row + F-NN; §11 138; Appendix B NEW
session-43 row with the zombie-auth-window note), README (badge 173+274 +
the Auth row's F-NN pin + status rows 138), CLAUDE.md (gate line 138 + the
F-MM→F-NN chain + the NEW F-NN segment + commands 138), PAD (test table
18|138|274 + §7.3 command 138 + the coverage-map session-43 extension),
AGENTS.md (the security line + the E2E command row 138),
`docs/remediation-plan-session43.md` (the plan + this execution record),
worklog, this log; `.env.example` unchanged and matching the codebase;
stale-count sweep zero.

**Step 9: Commit + push (main only)**

One main-branch commit (test-only round — zero `src/` changes; the
artifacts: the F-NN describe + the plan + the probe script + the refreshed
screenshots + the five-docs alignment + the worklog + this log) pushed via
the SSH wrapper v3 with `--remote git@github.com:nordeim/luxury-fashion-store.git`,
verified on the remote, key shredded.
