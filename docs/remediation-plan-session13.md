# Remediation Plan — Session 13 (AURELIA / VELOUR clone)

> **Status:** EXECUTED. **Mode:** Verify-first (Mode C) → cold-clone re-validation
> → TDD hardening. **Scope:** (1) fresh-clone re-validation of the pulled remote
> `8a87d6e` (session-12 work `af36925` + the user-added session-12 transcript) —
> the workspace had been RESET again, so the environment was rebuilt cold (npm
> install, `.env` re-pinned to `file:../db/custom.db`, `db:setup` → canonical
> 4/12/2/4, Playwright chromium v1248); (2) an audit of the session-12 commit
> `af36925` (skills: `code-review-checklist`, `security-and-hardening`,
> `code-quality-standards`, `tdd`, per `skills/skills-catalog.md`) — all 8
> commit-message claims verified TRUE with file:line evidence; findings: 3 LOW
> + 5 NIT, none Critical/HIGH/MEDIUM, **no production regressions** (the only
> `src/` change in `af36925` is the one-line L6 dead-class removal, verified
> behavior-neutral in the compiled v4 utilities); (3) a **live reference parity
> sweep round 8** (desktop 1440×900 + mobile 390×844, logged-out, FULL
> two-census ritual) — **ZERO drift**, the fifth consecutive same-day
> zero-drift sweep (sessions 9→10→11→12→13); (4) TDD remediation of the audit
> findings: the sweep tool's foreign-server poison window (F1), the spawn-error
> cleanup bypass (F2), the waitHealth hang (F3), the hardcoded-port triplication
> (F4), the double browser-close (F6), and the "sibling" mis-wording in the
> census spec (F7).

---

## 1. Starting state

Workspace RESET again (fresh sandbox: lone "Initial commit", no remote).
Re-cloned `https://github.com/nordeim/luxury-fashion-store.git` → HEAD `8a87d6e`
(session-12 `af36925` + its transcript), tree clean. Cold rebuild: `npm install`;
`.env` re-pinned `DATABASE_URL="file:../db/custom.db"` (+ dev `AUTH_SECRET`);
`npm run db:setup` verified live via seed output (4 categories / 12 products /
2 users / 4 orders); `npx playwright install chromium` (v1248 bundle — same
fresh-sandbox quirk as sessions 6–12).

**Baseline gates on the committed tree (all reproduce the session-12 ledger):**

| Gate | Result |
|---|---|
| typecheck | ✓ |
| lint | ✓ (H-70 fix confirmed working on a fresh clone) |
| unit | ✓ 113/113 (14 files) |
| build + assemble | ✓ |
| E2E | ✓ 132 passed + 2 skipped (66 unique × 2 − 2 viewport skips + 2 setup) |

This is the first session-12-mandate re-run whose baseline is **fully green on
every gate** — session 12's own baseline carried the H-70 red lint it then
fixed. `npm audit`: unchanged dev-toolchain findings — accepted with rationale
(carried since session 2; zero runtime exposure).

## 2. Audit of `af36925` (Explore full-diff + first-hand verification)

All 8 commit-message claims verified TRUE: (1) H-70 eslint ignore is scoped to
`scripts/**/*.cjs` with a rationale comment, zero rules touched, `src/`/`tests/`
unignored (`eslint.config.mjs:51-57`); (2) M1 hardening complete —
`assertPortFree` before spawn (`:138`), stderr piped + 40-chunk tail dumped on
health timeout, child `error` handler, `browser.close()` guarded and in
`finally`; (3) L1 census guard `toHaveCount(1)` before chip assertions
(`tests/e2e/product.spec.ts:66`) + L2 loop-trade-off comment — locator
robustness cross-checked against the live PDP markup (the only other `div.mb-6`
is the Color block, which contains no Size Guide button, so the `filter({ has })`
excludes it); (4) L6 dead `focus:z-[60]` removed — `not-sr-only` compiles to
`position: static` (verified in the compiled Tailwind v4 lib), z-index inert;
skip link still the literal first DOM node; (5) I1 `clone-size-chips.png` is now
a genuine 1,906-byte PDP element screenshot (was a 1,096,788-byte byte-copy of
the home shot); capture order home→deals→PDP preserved; (6) SKILL v1.7.0 with
trap #28 + §11 lint-last note; (7) commit footprint exactly docs+tooling+tests
except the one production line; (8) `.env.example` tracked, contract correct.

### Findings

| ID | Sev | Finding | Remediation (this session) |
|---|---|---|---|
| F1 | 🟢 LOW | **Poison window remains between probe and spawn.** If a process binds :3100 in the ~ms gap after `assertPortFree` closes its probe, the spawned server dies with EADDRINUSE (stderr captured but **never dumped — the dump fires only on health *timeout***) while `waitHealth` gets 200 from the foreign server → the exact confidently-wrong census M1 aimed to kill, through a narrower door. | **Fixed (see §4).** Child-liveness guard: `server.on("exit")` → death-promise; after health-green, race the death-promise against a 300ms grace window, then require the child alive (stderr dumped on violation). RED→GREEN demonstrated with a foreign 200-server + a child that exits(3) at boot. |
| F2 | 🟢 LOW | **`'error'` handler calls `process.exit(1)`** (`:151-154`), bypassing the `finally` — on a mid-run spawn error no `browser.close()`/`server.kill()` runs and the results file is skipped. | **Fixed.** The handler now records the error; `assertChildAlive()` throws it through the main catch → `finally` runs. Demo: spawn `/nonexistent-binary-xyz` → `SWEEP FAILED: standalone server failed to spawn: … ENOENT`, exit 1, cleanup intact. |
| F3 | 🟢 LOW | **`waitHealth` has no per-request timeout**: a socket that connects but never responds leaves one request pending forever — the 30s budget is only evaluated across retries, so the sweep can hang past its own timeout. | **Fixed.** `req.setTimeout(2000, () => req.destroy(...))` → surfaces as `'error'` → retry → global budget honored. Isolated harness: OLD hangs (killed at 15s), NEW rejects at ~7s with `server timeout` (5s budget in the harness). |
| F4 | ⚪ NIT | Port 3100 hardcoded three times; the sweep ignores `E2E_PORT` which `playwright.config.ts` honors. | **Fixed.** `const PORT = Number(process.env.E2E_PORT ?? 3100)` — one constant, config-aligned. |
| F5 | ⚪ NIT | POSIX-only paths (`cwd + "/docs/screenshots/"`, `/tmp/sweep-results.json`). | Accepted as documented (session-12 plan §6 #9); irrelevant in this sandbox. |
| F6 | ⚪ NIT | Double `browser.close()` (guarded path + `finally`). | **Fixed** (one guarded close removed; close is idempotent — kept the `finally` one). |
| F7 | ⚪ NIT | Census spec comment says "Size Guide **sibling**" — the button is a *descendant* of the size block (`filter({ has })` semantics). Code is correct; wording only. | **Fixed** (both comment occurrences reworded; no behavior change). |
| F8 | ⚪ NIT | Commit message/docs say ignore `scripts/*.cjs`; actual glob is `scripts/**/*.cjs` (equivalent today). | Noted; this plan uses the correct glob. |

**Accepted (documented, carried):** dev-toolchain npm-audit findings; real PSP
behind the checkout seam; nonce CSP; H-56/H-59 disclosed E2E gaps; E2E admin
rate budget exactly consumed (10/10); superset heading counts (13/42 vs 11/36);
`axe-core` unused devDependency; A-2 auth asymmetry; skip-link focus reflow.

## 3. Live reference sweep — round 8 (measured 2026-10-15): ZERO drift

Pre-change census with the committed (unmodified) tool (round 8a):

| Surface (ledger) | Reference (measured) | Clone (measured) | Verdict |
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
| Card-name h3 | Cormorant (72px desktop / 48px mobile) | identical | P-15 holds |
| Marquee | present, animating | present | P-3 holds |
| Console | 2 ref-side 401s (reference's own backend) | clean | — |

**The reference has now held still across FIVE consecutive same-day sweeps
(sessions 9→10→11→12→13); the two-census ritual keeps verifying it instead of
assuming it.** A post-change census (round 8b) re-runs after the F1–F4/F6 tool
changes to prove measurement rest-invariance BY MEASUREMENT (§4).

## 4. ToDo ledger (execution order)

| # | Item | Status |
|---|---|---|
| 1 | Cold env rebuild (clone → install → `.env` → `db:setup` → chromium) + baseline gates | ✅ |
| 2 | Baseline fully green — first session-12-mandate re-run with zero baseline defects | ✅ |
| 3 | Explore audit of `af36925` (8 claims + new-issue scan) | ✅ |
| 4 | Parity sweep round 8a (both viewports, zero drift) | ✅ |
| 5 | F1 RED demo: foreign 200-server on :3100 (health + poison page) + probe bypassed + child exits(3) → sweep **exits 0 with a census of the poison page** (pageH 1009, secs [999]) | ✅ |
| 6 | F1 fix v1 (bare `childDied` flag) → **GREEN demo exposed the guard's own race** (foreign 200 ≈10ms beat the exit event ≈50ms — guard passed vacuously) | ✅ |
| 7 | F1 fix v2: death-promise raced against a 300ms grace window → same harness → **fails in 1s** with the exact diagnosis | ✅ |
| 8 | F2: spawn-error recorded → thrown through the main catch (`SWEEP FAILED: … ENOENT`, finally intact) — demoed with `/nonexistent-binary-xyz` | ✅ |
| 9 | F3: per-request `req.setTimeout(2000)` in `waitHealth` — isolated harness: OLD hangs (killed at 15s), NEW rejects ~7s `server timeout` | ✅ |
| 10 | F4 port hoist (`E2E_PORT`-aware) + F6 single guarded close + F7 spec-comment wording | ✅ |
| 11 | Round 8b post-change census with the hardened tool: **byte-identical to 8a and all ledgers** (clone 11085/11264, deals 3174, drawer char-identical, gaps [20,20,20,20]) | ✅ |
| 12 | Screenshots refreshed (`--shots`, 9 surfaces; 4 byte-diffs are hero-slide/countdown choreography — verified visually) | ✅ |
| 13 | Full gates on the final tree (typecheck/lint/113 unit/build + E2E 132+2) | ✅ |
| 14 | Docs alignment (SKILL v1.7.1 trap #29, plan-session13) + worklog | ✅ |
| 15 | Commit to main; SSH-wrapper push (dry-run first); verify remote ref | ✅ |

## 5. Verification ledger (post-remediation, evidence-backed)

- **F1 RED (observed):** python 200-server serving `/` + `/api/health` on :3100,
  sweep harness with the probe bypassed and a child `process.exit(3)` →
  sweep **exit 0**, `desktop-clone.pageH: 1009, secs: [999]` — a confidently
  wrong census of the poison page (truth: 11085).
- **F1 fix v1 REJECTED by the demo (observed):** bare flag check → same
  harness → **exit 0 again** (health-green beat the exit event). The lesson is
  recorded as trap #29(a): a guard must not assume event delivery has
  completed.
- **F1 fix v2 GREEN (observed):** death-promise ∥ 300ms grace → same harness →
  **exit 1 in ~1s**: `standalone server exited during boot (code 3, signal
  null) — the health response came from a foreign process or the server
  crashed…`.
- **F2 GREEN (observed):** spawn `/nonexistent-binary-xyz` → `SWEEP FAILED:
  standalone server failed to spawn: spawn /nonexistent-binary-xyz ENOENT`
  through the main catch; `finally` path intact (old code: bare
  `SERVER SPAWN ERROR` + `process.exit(1)`, cleanup skipped).
- **F3 RED→GREEN (observed, isolated harness):** OLD `waitHealth` vs a
  connect-but-never-respond socket → hangs (killed at 15s, exit 124); NEW →
  `REJECTED after 7017ms: server timeout` (harness budget 5s + retry
  quantization).
- **Round 8b (observed):** hardened tool, free port → census byte-identical to
  8a and to the session-9/10/11/12 ledgers (ref 11079/11257 byte-equal; clone
  11085/11264, deals 3174, footer 444/1189, drawer panel class char-identical,
  nav gaps [20,20,20,20], fonts 100% Cormorant h1–h3 / Montserrat h4) — the
  tool changes are measurement-rest-invariant BY MEASUREMENT.
- **Final gates on the final tree (observed):** typecheck ✓ lint ✓ 113/113 unit
  (14 files) ✓ build + assemble ✓ E2E 132 passed + 2 skipped (arithmetic
  exact). NO production code changed this session — the only tree deltas are
  the sweep tool, the census-spec comment, SKILL.md, this plan, screenshots,
  and the worklog.
- Screenshots re-captured on the standalone; 4 PNGs byte-diff (hero auto-advance
  slide state + mount-relative countdown — the documented choreography class);
  `clone-size-chips.png` remains the genuine 1.9KB PDP close-up; mobile home +
  drawer captures verified visually (slide 01/03, five-item drawer).

## 6. Residual risks / next steps

1. F1's guard covers boot-death delivery within the 300ms grace window; a child
   that dies MID-census still fails loudly through the census's own connection
   errors (confusing but not silent) — scoped acceptance, documented in the
   tool comment.
2. F5 POSIX-only sweep paths — fix before using the tool on Windows (carried).
3. Dev-toolchain npm-audit findings — revisit when vitest 5 / prisma 7 land
   non-breaking paths (carried).
4. Real PSP behind the checkout seam (carried).
5. Nonce-based CSP to retire `'unsafe-inline'` (carried).
6. H-56/H-59 disclosed E2E gaps (DB-mocking harness) — unchanged, carried.
7. E2E admin rate budget remains EXACTLY consumed (10/10) — SQL-fixture
   pattern only (unchanged).
8. `axe-core` unused devDependency (I3) — adopt for automated a11y audits or
   remove in a dependency-hygiene pass.
9. Keep running the FULL two-census ritual every session — five same-day
   zero-drift sweeps is a streak, not a guarantee (session-10 §6 #5).
10. If the reference re-adds the drawer ACCOUNT/WISHLIST tail, restore the
    clone's tail and re-pin 7 items (session-8 §6 #7 — unchanged).
