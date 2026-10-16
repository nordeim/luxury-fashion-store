Starting **Session 21**. Establishing the todo list, then refreshing the workspace and checking for the sandbox-reset incidents logged in the worklog (browser cache, ssh shim, `.env` pin).
Fast-forwarded to `71d0f32` — docs-only (`docs/session_21.md`, 108 lines), matching the established cadence. Reading the transcript and verifying environment warmth.
Environment is fully WARM this time (`.env` pinned, shim present, chromium v1248, excludes intact) — no reinstall needed. `session_21.md` is the transcript of the previous thread's round. Following the cadence: absorb the plan + worklog, then audit `ac304d9`.
Docs absorbed — SKILL v1.14.0 aligned, worklog current. Now reading the session-21 plan's carried-findings section (the input for this round's remediation scoping).
The carried items are all documented with rationale (style-src exception, PSP credentials, dev-toolchain audit, POSIX sweep paths). A candidate for this round: whether the session/cart sweeper is actually wired for periodic execution. First, cadence order — seed verification + baseline gates.
Need an async wrapper for tsx eval (CJS mode). Retrying.
`db/custom.db` has the schema but ZERO rows — the sandbox reset wiped the seed data (new environment incident). Re-seeding with the canonical idempotent seed.
Seed restored (4/12/2/4). Verifying final counts, then baseline fast gates.
Seed canonical (4/12/2/4, zero transient), tree clean, verify chain green. Full E2E baseline now (expecting 178+2).
**Baseline: 11th consecutive fully green** (typecheck ✓ lint ✓ 142/142 unit ✓ build ✓ E2E 178+2 ✓). Now the first-hand audit of the never-audited `ac304d9`.
Composition confirmed: `ac304d9` = test + docs only. Now reading the new gate's full source to verify its four cases first-hand.
Spec verified line-by-line — all four cases as claimed (manifest canary, write-free P1/P2/P3 ladder, IDOR census with finally-cleanup, fail-closed surface sweep; spawnSync args-array + headersArray discipline throughout). **Audit of `ac304d9`: all claims TRUE, zero production regressions.** Now the round-17 parity sweep — locating the sweep tooling.
The sweep boots the production server which needs `AUTH_SECRET` — my earlier minimal `.env` re-pin dropped the dev secret the canonical `.env` also carried (per the session-21 plan: "DATABASE_URL (+ dev AUTH_SECRET, NEXT_PUBLIC_SITE_URL)"). Restoring the full canonical `.env`, then reading the sweep script's interface.
`.env` fully restored. Checking the sweep's server-boot env handling, then running round-17a.
Sweep spawns the standalone with `process.env` — so `AUTH_SECRET` must be exported in the shell. Running **round-17a census** (both viewports, clone + live reference).
**ROUND-17A: ZERO DRIFT — 14th consecutive.** Every ledger field matches the recorded round-16 values (ref 11079/11257; clone 11085/11264 with the 3551/3174 residues; footers 444/1189; drawer char-identical with gaps [20,20,20,20]; fonts/chips/marquee hold; clone console clean — the two `ref:` 401s are the reference site's own auth pings). The Tailwind v4 mobile-drawer pin is intact.

Now scoping the remediation. The top unaddressed carried item: whether the session/cart sweeper is actually wired for periodic execution in production.
K-1 is genuinely closed — the sweeper runs at boot + hourly via `instrumentation.ts` with `.unref()`. All top carried items are external-dependency or credentials-bound. Before picking this round's target, a quick fresh audit of seams not yet re-verified this session (`next.config.ts` headers, sitemap/robots, newsletter route).
New finding: `next.config.ts` already carries the full header set (Option D moot), **but `sitemap.ts` and `robots.ts` don't exist** — while CLAUDE.md's env table documents "NEXT_PUBLIC_SITE_URL … + sitemap origin" and the proxy matcher note references sitemap/robots. Verifying rigorously before declaring docs drift.
**Finding F-H confirmed — docs/code drift, same class as F-B**: four documents (README:90, CLAUDE:77, PAD:453, SKILL:123) advertise `NEXT_PUBLIC_SITE_URL` as the "sitemap origin", and the F-G note references sitemap/robots — but neither route exists in `src/app/`. Checking how the env var is consumed today before planning the TDD closure.
`process.env.n` in the output looks like a display artifact — reading the actual lines to confirm the env var usage.
Confirmed: `metadataBase` works via the env var, the PDP JSON-LD consumes it, but **no sitemap/robots routes exist** — F-G's note currently describes 404s. This is the round's remediation target (**F-H**: code catches up to the documented sitemap contract — same class as F-B). Re-checking the npm-audit composition for the round record, then writing the plan.
Audit composition unchanged (11 findings, all dev-toolchain — carried). Before writing the plan, validating its assumptions: the Product model's fields (for `lastModified`) and the seed's active count.
All 12 products active; schema supports the plan. Writing the session-22 remediation plan now.
Plan saved (the execution record will be corrected to observed facts as each step lands). Validating the last plan assumptions: `Product.sortOrder`/`updatedAt` in the schema, and the playwright config's `baseURL` (decides how the SEO gate addresses the server).
All assumptions hold (`sortOrder`/`isActive`/`updatedAt` exist; config `baseURL` present). **TDD Step 1 — the unit contract first (RED by absence).**
RED confirmed (module absent, collection fails). **Step 2 — implement the pure seam (GREEN).**
**GREEN — 151/151 unit (18 files)** — 9 new SEO cases (the plan predicted 7; observed 9, will correct the ledger). **Step 3 — the metadata routes (force-dynamic, build stays DB-free).**
Routes wired. **Step 4 — the E2E gate** (test-scoped `request` fixture rides the config's `baseURL`).
Rebuilding the production bundle (trap #16 — E2E tests the built artifact), then running verify.
Next's `Robots` type unions a single rule with an array — the test needs honest narrowing. Fixing.
Verify chain green. Confirming the routes registered in the build and running the new SEO gate GREEN-first against the built standalone.
"2 passed" with 4 tests listed — the tail is hiding something. Full output now.
All 4 SEO cases failed (the "2 passed" were the setups). Getting the failure detail.
The response is a **foreign robots.txt** — `User-agent` (lowercase), a `/order-success` route this codebase doesn't have, and a `:4173` (Vite preview) origin. Something else is squatting on the E2E port and `reuseExistingServer` adopted it. Investigating the listener.
Setup logins passed (our server booted) yet the SEO requests got a foreign body referencing `:4173` and `/order-success` — a route this repo doesn't have. Reading the playwright config to see where the `request` fixture actually points.
Config is clean — the body must have come from something else entirely. Empiricism: booting our standalone manually and curling the routes directly.
**Our own standalone serves the foreign artifact** — `.next` contains build output from a DIFFERENT app (`/order-success`, `changefreq daily`, `:4173` — that's the ecommerce-store reference implementation). The sandbox didn't just wipe data, it contaminated the build directory. Forensics:
No `order-success` under `.next/server/app` — yet the server serves it. Checking the standalone's metadata-route artifacts directly.
**Root cause found: `.next/standalone/public/robots.txt` — a STALE FOREIGN static file in our own `public/`** (lineage of the ecommerce-store scaffold: `/order-success`, `:4173` Vite origin). Static `public/` files shadow metadata routes — so this repo has served a foreign robots/sitemap since session 1, while the docs advertised the real contract. The finding is bigger than "missing routes": **stale foreign SEO statics must be deleted so the routes can serve.** Checking `public/` fully.
Fully confirmed and git-tracked since the scaffold commit — the served SEO metadata was foreign AND wrong (wrong origin, routes this app doesn't have, `/api` + `/wishlist` missing from the disallow list). The finding upgrades: not "404s" but **stale foreign 200s shadowing the contract**. Executing the fix: delete the statics, correct the seam/spec comments to the observed truth.
Now correcting the plan doc to the observed truth (the shadowing statics, the F-H2 deletion task).
Fixing the count ledger to observed values (9 new cases → 151), then rebuilding and re-running the gate.
Setup logins now fail — a new obstruction. Checking for a lingering :3100 listener and the full failure detail.
**Found it: my probe's `next-server` child (pid 18481) survived the `pkill` of its parent** and still holds :3100 — the seo run adopted it via `reuseExistingServer`, and that zombie boots WITHOUT a working DATABASE_URL (the standalone re-anchors the relative URL — the documented trap). Killing the child and re-running.
**SEO gate 6/6 GREEN** — the routes serve the real contract. Now the **mutation RED demo**: dropping the active-only filter in the seam must fail exactly one unit case.
The file is untracked so `git checkout` can't restore it — the mutation is still in place. Reverting via inverse sed and completing the demo.
Mutation demo complete: **2 surgical failures in the SEO file only** (the inactive case + the ordering case both catch the dropped filter), all other 149 tests unaffected; restored → **151/151 GREEN**. Now **round-17b census** — the SEO change must be rest-invisible.
**ROUND-17B: byte-equal to 17a on all 77/77 fields — rest-invariance proven; ZERO drift, 14th consecutive.** Now refreshing screenshots and visually verifying the mobile drawer.
Checking whether the shots actually refreshed (mtime vs now).
All fresh (09:43 = now). Visually verifying the mobile drawer capture per the ritual.
Drawer verified pixel-perfect (VELOUR logotype, five flush-left items, 20px gaps, w-80 panel, dimmed backdrop). Now docs alignment. Gathering the exact anchors in SKILL/README/CLAUDE/PAD.
9 shots refreshed. Reading the exact trap #34 → §10 boundary and Appendix B tail for clean insertions.
Applying the SKILL.md v1.15.0 edits (header, §2, traps #35/#36, §10 rows, §11, Appendix B).
SKILL v1.15.0 complete. Now README, CLAUDE.md, and PAD.
All anchors mapped (PAD:513 is an LOC count — untouched). Applying README, CLAUDE.md, and PAD edits.
README + CLAUDE.md aligned. Now the PAD (table, checklist, coverage map).
PAD aligned. Correcting the plan's execution record to observed facts, then the worklog.
Plan record accurate. Final stale-count sweep, then the worklog entry.
The four hits are legitimate historical baseline records in the plan (pre-remediation state), not stale counts. Zero real drift. Writing the worklog entry.
Working tree exactly as intended. **Final gates on the final tree** (trap #28) — verify first, then the full E2E expecting 182+2.
**Final E2E: 182 passed + 2 skipped — arithmetic exact. 12th consecutive fully-green session.** Committing to main and pushing via SSH wrapper v3.
Committed `cc34734` on main (17 files). Now the push — write the operator key, dry-run first.
**Session 22 complete — pushed to `main` @ `cc34734` (remote-verified, key shredded, tree clean).**

What this round delivered:

1. **Re-validation + audit** — pulled `71d0f32` (docs-only transcript); audited the round-16 commit `ac304d9` first-hand: test+docs only, **9/9 claims TRUE**. Baseline gates: 11th consecutive fully green.
2. **Environment forensics** — two NEW sandbox incident classes caught and repaired: `db/custom.db` emptied (re-seeded canonical 4/12/2/4) and `.env` stripped to one line (restored dev `AUTH_SECRET` + site URL).
3. **Round-17 parity sweep** — ZERO drift, 14th consecutive; 17b byte-equal to 17a on all 77 fields (the new work is rest-invisible by measurement). Mobile drawer pin intact.
4. **The round's catch — F-H/F-H2** — four documents advertised a sitemap contract that never existed; live measurement revealed something worse: the scaffold's **foreign `public/robots.txt` + `public/sitemap.xml` (a Vite `:4173` artifact) had shadowed the paths for 21 sessions**. TDD-fixed: pure SEO seam (9 unit cases) + force-dynamic `/sitemap.xml` + `/robots.txt` routes + a served-BODY E2E gate + the statics deleted. Mutation demo surgical.
5. **Ledger** — 151/151 unit, 182+2 E2E, SKILL v1.15.0 (traps #35/#36), README/CLAUDE/PAD aligned, plan + worklog committed.

Suggested next steps: pull fresh next round; watch for the two new incident classes (DB wipe, `.env` truncation) logged in the worklog. Remaining carried items (style-src exception, real PSP, dev-toolchain audit) are documented with rationale in the session-22 plan.
