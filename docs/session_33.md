Resuming with the **Session 31 task book** (trace `1a149c0c1fc9a0d9`). Per the standing precedent, my round = the session-32 continuation auditing `52b4d73` plus the newly-landed `23f618c` dependency bump.

**Step 1: Workspace refresh + sandbox state check**
Workspace intact; pull fast-forwarded `7681451..23f618c` — brought `docs/session_32.md` (the session-31 round's narration log, via the `5e01d09` session-log commit) AND `23f618c` "update package versions" (package.json + package-lock.json ONLY: next ^16.0.0→^16.4.2, react/react-dom ^19.2.0→^19.3.1, @playwright/test ^1.56.0→^1.64.1, tailwind ^4.1.14→^4.3.3, prisma ^6.16.2→^6.19.3, eslint/axe-core/tsx/vitest minors). Sandbox reset incidents this round — **TWO + the empty-DB** (the reset set fired again): `skills/` pruned → restored; stray `bun.lock` → deleted; **`.env` rewritten to the absolute path** → re-pinned to `DATABASE_URL="file:../db/custom.db"`; **`bin/ssh` shim gone + paramiko missing** → rebuilt from the how-to skill doc Appendix A + paramiko 5.0.0 reinstalled into the venv; **Playwright v1248 pruned** → `npx playwright install chromium` after the 1.64.1 sync; **`db/custom.db` EMPTY (0/0/0/0)** → `npm run db:setup` re-materialized 4/12/2/4.

**Step 2: The census caught the empty DB live**
The FIRST round-27a run measured the clone at pageH 7162/7358 vs the ledger's 11085/11264 (the ref side byte-matched; mainKids 11 held — the section structure is static, the product grids collapsed). Root cause verified by direct Prisma count, fixed, census re-run green. The two-census ritual did exactly its job — the anomaly never reached a pin.

**Step 3: Dependency sync + baseline gates**
`npm install` synced node_modules to the new lockfile (16.4.2 / 19.3.1 / 1.64.1; tree stayed clean). Baseline gates on the BUMPED toolchain: typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build + assemble ✓ — the TWENTY-FOURTH consecutive session green at baseline.

**Step 4: First-hand audit of `52b4d73` + `23f618c`**
Session-31: 5/5 claims TRUE — the F-BB describe read in full AND re-run green on the bumped toolchain (security gate **24 passed** = 5 N-1/F-B + 3 F-AA + 3 F-BB × 2 + 2 setup — the hardened cookie/transport contracts survive the framework patch bumps). The bump: behavior-neutral (full verify + security gate green on the synced toolchain). Doc-drift finding: the bump moved the lockfile-resolved versions past the docs' stack tables (16.4.0/19.3.0/1.64.0 → 16.4.2/19.3.1/1.64.1) — fixed in this round's docs pass.

**Step 5: Round-27a census**
**ZERO DRIFT** (29th consecutive) — all fields byte-match the ledger (11079/11085 · 11257/11264, mainKids 11, footers 444/1189, drawer char-identical `w-80` + `flex flex-col gap-5`, gaps [20,20,20,20]; ref console = documented 2× 401 residue; clone clean). Seven stable rounds since the round-21 move.

**Step 6: Fresh audit pass — the round's finding**
The unexercised-contract census surfaced **F-CC**: the guest order-view capability gate (`/checkout/success?order=N&t=<hmac>`) is declared twice in prose (CLAUDE.md "sequential order numbers are not capability tokens"; the order-token module header) and unit-pinned at the pure layer — yet ZERO wire pins (the checkout E2E only FOLLOWS the placement redirect; no test fetches the URL with an absent/wrong/cross-order token or an unknown order number; no 404-card or no-PII assertions). A dropped `isGuestWithToken` check would expose every guest order's email/name/address with every gate green. LOW gate-coverage, zero product defect. Competing leads dismissed first-hand: open-redirect validator unit-pinned (9-case describe); robots.txt wire-pinned; TRUST_PROXY unit-pinned (carried).

**Step 7: Plan-probe discipline (the throwaway-DB-copy harness reused)**
`scripts/plan-probe-session32.cjs` — **19/19 checks passed** before the spec: the URL shapes, the OFFLINE-HMAC reproduction check (the minted token reproducible from the boot secret alone — the load-bearing assumption for the offline cross-order negative), the positive path (200 + order + guest email), the four rejected variants → 404, the not-found card, zero PII leakage.

**Step 8: Remediation plan + TDD**
Plan saved → validated. The checkout gate's NEW describe in `cart-checkout.spec.ts` (the OWNING spec): one case — fresh logged-out context, the real guest COD flow, capture the minted pair, direct-fetch the capability matrix (captured pair 200 + PII; absent/flipped/cross-order/unknown → 404 × not-found card × no-PII); the cross-order token computed OFFLINE with the shared `E2E_AUTH_SECRET` (one checkout-bucket slot saved; budget 3/project, 6 < 10 documented). Typecheck ✓; GREEN **26 passed** (12 unique) × 2 + 2 setup. Mutation demo surgical: the gate's verification dropped (`!!tokenValue ||`, type-safe with `?? ""` — the first mutant shape failed the BUILD's typecheck on an unnarrowed tokenValue and was corrected before any test ran) → exactly the 2 F-CC case-runs failed while all placement-redirect cases stayed green (they never exercise the verification) → restored → 26/26.

**Step 9: Round-27b census + final gates**
**ROUND-27B: ZERO DRIFT** (29th/30th) — byte-identical to 27a; the test-only round proven rest-invisible; 4 screenshots refreshed. Final gates: typecheck ✓ lint ✓ 173/173 unit ✓ build ✓ **E2E 250 passed + 2 skipped** (126 unique × 2; 5.1m) — the TWENTY-FOURTH consecutive fully-green session, exactly the count ledger.

**Step 10: Docs + commit + push**
SKILL v1.25.0 (frontmatter 126+250+2, §2 stack versions + E2E row + F-CC, §11, Appendix B NEW session-32 row); README (badge 173+250, the Orders row + the capability pin, stack versions, testing/status rows); CLAUDE.md (stack table, gate line 126, NEW F-CC bullet); PAD (stack versions, test table 17|126|250, §7.1 session-32 paragraph, the caret-ranges risk row rewritten); AGENTS.md (the security line + F-CC). Stale-count sweep clean. Committed (13 files) → SSH wrapper v3 dry-run (`23f618c..1c7fb3d`) → real push → **remote verified: `refs/heads/main @ 1c7fb3d == local HEAD`** (also independently via the HTTPS ls-remote) → key shredded. This session log ships as the follow-up "update session log" commit.

**Session 32 (session-31 continuation) complete** — the 24th consecutive fully-green session.

**What happened this round:**
- **Pulled `23f618c`** (the dependency bump); TWO + empty-DB sandbox incidents, all resolved (the census caught the empty DB live — the ritual works)
- **Audited `52b4d73`: 5/5 TRUE** (the F-BB gate re-run green: 24 passed on the bumped toolchain); **audited `23f618c`: behavior-neutral** (full gates green on the synced toolchain)
- **Round-27 census: ZERO DRIFT** (29th/30th sweeps) — the mobile drawer's Tailwind v4 `flex gap-5` pin holds char-identical
- **Found + closed F-CC via TDD**: the guest order-view capability contract (`?order=N&t=<hmac>`) now pinned end-to-end — the minted pair serves with the PII it protects; absent/wrong/cross-order/unknown variants all 404 with no existence leak and no PII leakage; the offline-HMAC probe check is the reusable pattern for future credential-shaped negatives
- **Final gates**: typecheck ✓ lint ✓ 173/173 unit ✓ build ✓ **E2E 250 passed + 2 skipped** (126×2) — SKILL v1.25.0, all docs aligned

**Next steps:** pull fresh next round (check ALL reset-set items INCLUDING db row counts — this round proved the census catches a silent empty DB); the offline-HMAC reproduction probe check is reusable for any negative that needs a valid-shaped credential without minting a real resource; residual items (the signed-in-OWNER positive path pin, the search-429 harness, real PSP, the limiter-reset harness) remain documented in `docs/remediation-plan-session32.md` §8.
