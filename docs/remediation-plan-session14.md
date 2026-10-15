# Remediation Plan — Session 14 (AURELIA / VELOUR clone)

> **Status:** EXECUTED. **Mode:** Verify-first (Mode C) → cold-clone re-validation
> → audit → TDD hardening. **Scope:** (1) fresh-clone re-validation of the pulled
> remote `2d0ab6c` (session-13 work `7222408` + the user-added session-13
> transcript) — the workspace had been RESET again, so the environment was rebuilt
> cold (`npm install`, `.env` re-pinned to `file:../db/custom.db`, `db:setup` →
> canonical 4/12/2/4, Playwright chromium v1248); (2) an audit of the session-13
> commit `7222408` (skills: `code-review-checklist`, `security-and-hardening`,
> `code-quality-standards`, `tdd`, per `skills/skills-catalog.md`) — all 8
> commit-message claims verified TRUE first-hand with file:line evidence
> (F1 death-promise race, F2 spawn-error routing, F3 per-request deadline,
> F4 `E2E_PORT` alignment byte-identical to `playwright.config.ts:22`, F6 single
> guarded close, F7 comment wording, round-8/8b census numbers matching the
> ledger, footprint = tool + spec comment + docs + screenshots + worklog —
> **zero production code**); (3) a **live reference parity sweep round 9**
> (desktop 1440×900 + mobile 390×844, FULL two-census ritual) — **ZERO drift**,
> the sixth consecutive same-day zero-drift sweep (sessions 9→10→11→12→13→14);
> (4) TDD remediation of the audit findings: G-2 (the sweep tool's waitHealth
> still hangs forever against a slow-drip responder — F3's deadline is an
> INACTIVITY deadline, so a socket that never goes idle never fires any event
> and the budget inside `retry()` is never reached) and G-1 (SKILL.md carried
> three per-session "latest ledger" pointers, stale by 4–5 sessions — the
> pointer class itself is the defect; replaced with non-drifting pointers).

---

## 1. Starting state

Workspace RESET again (fresh sandbox). Re-cloned
`https://github.com/nordeim/luxury-fashion-store.git` → HEAD `2d0ab6c`
(session-13 `7222408` + its transcript), tree clean. Cold rebuild: `npm install`;
`.env` re-pinned `DATABASE_URL="file:../db/custom.db"` (+ dev `AUTH_SECRET`);
`npm run db:setup` verified live via seed output (4 categories / 12 products /
2 users / 4 orders); `npx playwright install chromium` (v1248 bundle — same
fresh-sandbox quirk as sessions 6–13). The sandbox still leaks a parent-workspace
`DATABASE_URL` — all DB/build commands run `env -u DATABASE_URL` (§9 #12).

**Baseline gates on the committed tree (all reproduce the session-13 ledger):**

| Gate | Result |
|---|---|
| typecheck | ✓ |
| lint | ✓ |
| unit | ✓ 113/113 (14 files) |
| build + assemble | ✓ |
| E2E | ✓ 132 passed + 2 skipped (66 unique × 2 − 2 viewport skips + 2 setup) |

`npm audit`: unchanged dev-toolchain findings — accepted with rationale (carried
since session 2; zero runtime exposure).

## 2. Audit of `7222408` (first-hand full-diff verification)

The commit's own claims, verified against the diff and the final tree:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | F1 poison-window guard: child `exit` → death-promise raced against a 300ms grace window; `assertChildAlive` after health-green and in the waitHealth-failure catch | `scripts/parity-sweep-session11.cjs:159-190` — `childDeath` promise, `Promise.race([childDeath, 300ms])`, dual `assertChildAlive` call sites, stderr tail dumped on violation | TRUE |
| 2 | F2: spawn `'error'` recorded (`spawnError`), thrown through `assertChildAlive` → main catch → `finally` intact | `:158,186-189` — no `process.exit` in the handler; main catch prints `SWEEP FAILED:` + exit 1 | TRUE |
| 3 | F3: per-request `req.setTimeout(2000)` inactivity deadline | `:59` (pre-G-2) — present; see G-2 for the residual hole this session closed | TRUE |
| 4 | F4: one `PORT` constant honoring `E2E_PORT` | `:14` is byte-identical to `playwright.config.ts:22` (`Number(process.env.E2E_PORT ?? 3100)`); used in CLONE, `assertPortFree`, spawn env | TRUE |
| 5 | F6: single guarded `browser.close()` in `finally` | `:290-294` — guarded-path close removed, comment explains idempotence | TRUE |
| 6 | F7: census comment "sibling" → "descendant (filter({ has }))" | `tests/e2e/product.spec.ts` — 2 comment occurrences reworded, zero code change | TRUE |
| 7 | Round-8/8b census numbers | match `docs/remediation-plan-session13.md` §3/§4 verbatim (ref 11079/11257, clone 11085/11264, deals 3174, gaps [20,20,20,20]) | TRUE |
| 8 | Footprint: tool + spec comment + SKILL v1.7.1 (trap #29) + plan + 4 screenshots + worklog; zero production code | `git show --stat` — exactly 9 files, none under `src/` | TRUE |

**Findings (new, this audit):**

| ID | Sev | Finding | Remediation (this session) |
|---|---|---|---|
| G-1 | ⚪ NIT | **Per-session "latest ledger" pointers drift by construction.** SKILL.md carried three: the header companion-docs line pointed at `remediation-plan-session8.md` (stale by 5 sessions), Appendix B "Latest remediation ledger" at `…session9.md` (stale by 4), and "Session history" ending at `session_8.md` (stale by 5). Sessions 10–13 each made them staler without noticing — a docs-drift class, not a one-off. | **Fixed.** All three replaced with non-drifting pointers: "per-session remediation ledgers `docs/remediation-plan-session<N>.md` (the highest N is latest)" and "session history `docs/session_<N>.md` (per-session transcripts) + `worklog.md`". SKILL bumped to v1.7.2. |
| G-2 | 🟢 LOW | **`waitHealth` still hangs past its own budget against a slow-drip responder.** F3's `req.setTimeout(2000)` is an INACTIVITY deadline; the 30s budget lives inside `retry()`, which only runs on `'end'`/`'error'`. A responder that sends non-200 headers and then dribbles one byte every <2s (never idle, never ends) fires NEITHER — the attempt hangs forever and the budget is dead code. Same "hang past its own timeout" family F3 targeted, one door narrower. | **Fixed (see §4).** An ABSOLUTE per-attempt deadline (4s `setTimeout` destroying the request; 4s > the 2s inactivity deadline so every normal path is unchanged) raced with settle-on-resolve/end/error + `clearTimeout`. RED: OLD vs a 404-dribbler (1 byte/s, never ends) → killed externally at 12s, exit 124. GREEN: NEW vs the same dribbler → `REJECTED after 8504ms: server timeout` (4s deadline + 500ms retry + 4s second attempt + budget check — exact). |
| G-3 | ⚪ NIT | `/tmp/sweep-results.json` POSIX-only path (F5 carried from session-13 §6 #2). | Unchanged — documented, irrelevant in this sandbox. |

**Accepted (documented, carried):** F1's guard covers boot-death delivery within
the 300ms grace window (a child dying MID-census still fails loudly through the
census's own connection errors — plan-session13 §6 #1); dev-toolchain npm-audit
findings; real PSP behind the checkout seam; nonce CSP; H-56/H-59 disclosed E2E
gaps; E2E admin rate budget exactly consumed (10/10); superset heading counts;
`axe-core` unused devDependency; A-2 auth asymmetry; skip-link focus reflow.

## 3. Live reference sweep — round 9 (measured 2026-10-15): ZERO drift

Pre-change census (9a, committed tool) and post-change census (9b, G-2-hardened
tool) — **byte-identical to each other and to every ledger**:

| Surface (ledger) | Reference (9a = 9b) | Clone (9a = 9b) | Verdict |
|---|---|---|---|
| Desktop page | **11079** | 11085 (+6) | known line-box rounding |
| Desktop sections | 810/70/835/706/835/835/3549/835/835/746/470 | 810/70/836/706/836/836/3551/836/836/746 | ≤ +2px each — byte-parity holds |
| Desktop footer | 444 | 444 | equal |
| Mobile page | **11257** | 11264 (+7) | known rounding |
| Mobile sections | 591/70/800/742/800/840/**3171**/800/800/774/569 | ≤ +1px each (deals **3174** — session-9 pinned residue) | holds |
| Mobile footer | 1189 | 1189 | equal |
| Font census h1/h2/h3 | 100% Cormorant (1/11/36) | 100% Cormorant (1/13/42 — superset counts) | families hold |
| Font census h4 | Montserrat ×3 | Montserrat ×3 | holds |
| Mobile drawer panel | `fixed left-0 top-0 h-full w-80 bg-background z-50 p-8 flex flex-col gap-6` | **char-identical** | holds |
| Mobile drawer nav | `flex flex-col gap-5 mt-4`, 5 items x=32/w=256/h=20, gaps [20,20,20,20] | **identical** | v4 pin intact |
| Size chips (resting) | 10px / 10px pad / 4px py / r0 / transparent / rgb(229,224,220) | identical | P-11 holds |
| Card-name h3 | Cormorant (48px mobile capture) | identical | P-15 holds |
| Marquee | present | present | P-3 holds |
| Console | 2 ref-side 401s (reference's own backend) | clean | — |

**The reference has now held still across SIX consecutive same-day sweeps
(sessions 9→10→11→12→13→14).** The 9b census doubles as the success-path
verification of the G-2-hardened `waitHealth` (health-green → settle → resolve,
measurement rest-invariance proven BY MEASUREMENT).

## 4. ToDo ledger (execution order)

| # | Item | Status |
|---|---|---|
| 1 | Cold env rebuild (clone → install → `.env` → `db:setup` → chromium) + baseline gates | ✅ |
| 2 | Baseline fully green on every gate (second consecutive session) | ✅ |
| 3 | First-hand audit of `7222408` (8 claims + new-issue scan) | ✅ |
| 4 | Parity sweep round 9a (both viewports, zero drift) | ✅ |
| 5 | G-2 RED demo v1 — 204 dribbler **REJECTED BY THE DEMO**: a 204 is body-less by spec; the client completes the message at headers, `'end'` fires at once, OLD rejects at ~7s | ✅ |
| 6 | G-2 RED demo v2 — 404 dribbler (chunked body, 1 byte/s, never ends) → OLD hangs, killed at 12s, exit 124 (the 6s budget is dead code) | ✅ |
| 7 | G-2 GREEN — NEW (absolute 4s attempt deadline) vs the same dribbler → `REJECTED after 8504ms: server timeout` (arithmetic exact); scratch harness deleted | ✅ |
| 8 | G-2 fix applied to the real tool (settle-guard + `clearTimeout` on resolve/end/error; comment records the RED/GREEN numbers and why 4s > 2s keeps normal paths unchanged) | ✅ |
| 9 | G-1 — SKILL.md's three per-session pointers replaced with non-drifting pointers; SKILL v1.7.2 | ✅ |
| 10 | Round 9b post-change census with the hardened tool: byte-identical to 9a and all ledgers | ✅ |
| 11 | Screenshots refreshed (`--shots`, 9 surfaces; 4 byte-diffs are the documented choreography class — hero slide state behind the drawer overlay + countdown ticks; both drawer captures visually verified: five-item panel pixel-identical) | ✅ |
| 12 | Full gates on the final tree (typecheck/lint/113 unit/build + E2E 132+2) | ✅ |
| 13 | Docs alignment (SKILL v1.7.2, plan-session14) + worklog | ✅ |
| 14 | Commit to main; SSH-wrapper push (dry-run first); verify remote ref | ✅ |

## 5. Verification ledger (post-remediation, evidence-backed)

- **G-2 RED (observed):** node 404-dribbler (chunked body, `res.write(".")`
  every 1s, never `res.end()`) on :3555; OLD `waitHealth(url, 6000)` → no
  resolution, no rejection; external `timeout 12` killed it (exit 124). The
  6s budget is unreachable in this scenario.
- **G-2 RED demo v1 rejection (observed):** the first dribbler used status 204 —
  body-less by RFC; the HTTP client completed the message at headers, `'end'`
  fired immediately, and OLD rejected at ~7s. The demo corrected the harness
  before any fix was written — the same classify-before-accepting discipline the
  SKILL §12 #10 mandates for parity variances.
- **G-2 GREEN (observed):** NEW `waitHealth` vs the same 404-dribbler →
  `REJECTED after 8504ms: server timeout` = 4s attempt deadline + 500ms retry
  delay + 4s second attempt + budget check. The absolute deadline cannot stall
  past 4s per attempt, so the global budget is now ALWAYS reachable.
- **Round 9b (observed):** hardened tool, free port → census byte-identical to
  9a and to the session-9..13 ledgers (ref 11079/11257; clone 11085/11264; deals
  3174; footer 444/1189; drawer panel class char-identical; nav gaps
  [20,20,20,20]; fonts 100% Cormorant h1–h3 / Montserrat h4; chips identical;
  console clean) — the G-2 change is measurement-rest-invariant BY MEASUREMENT,
  and its success path (health 200) is exercised by every sweep by construction.
- **Final gates on the final tree (observed):** typecheck ✓ lint ✓ 113/113 unit
  (14 files) ✓ build + assemble ✓ E2E 132 passed + 2 skipped (arithmetic exact).
  NO production code changed this session — the only tree deltas are the sweep
  tool's `waitHealth`, SKILL.md's pointers/version, this plan, screenshots, and
  the worklog.
- Screenshots re-captured on the standalone (9 surfaces); 4 PNGs byte-diff —
  the documented choreography class (hero auto-advance slide state behind the
  drawer overlay, mount-relative countdown); both mobile drawer captures
  verified visually: five-item panel, logotype, 20px gaps — pixel-identical
  between clone and reference.

## 6. Residual risks / next steps

1. G-2's absolute deadline (4s) bounds each attempt; the global budget (30s) is
   now reachable from every path. The F1 mid-census death acceptance (plan-
   session13 §6 #1) is unchanged.
2. G-3 POSIX-only sweep paths — fix before using the tool on Windows (carried).
3. Dev-toolchain npm-audit findings — revisit when vitest 5 / prisma 7 land
   non-breaking paths (carried).
4. Real PSP behind the checkout seam (carried).
5. Nonce-based CSP to retire `'unsafe-inline'` (carried).
6. H-56/H-59 disclosed E2E gaps (DB-mocking harness) — unchanged, carried.
7. E2E admin rate budget remains EXACTLY consumed (10/10) — SQL-fixture
   pattern only (unchanged).
8. `axe-core` unused devDependency (I3) — adopt for automated a11y audits or
   remove in a dependency-hygiene pass.
9. Keep running the FULL two-census ritual every session — six same-day
   zero-drift sweeps is a streak, not a guarantee (session-10 §6 #5).
10. If the reference re-adds the drawer ACCOUNT/WISHLIST tail, restore the
    clone's tail and re-pin 7 items (session-8 §6 #7 — unchanged).
