# Remediation Plan — Session 12 (AURELIA / VELOUR clone)

> **Status:** EXECUTED. **Mode:** Verify-first (Mode C) → cold-clone re-validation
> → TDD hardening. **Scope:** (1) fresh-clone re-validation of the pulled remote
> `260ce8b` (session-11 work `f93033b` + the user-added session-11 transcript) —
> the workspace had been RESET again, so the environment was rebuilt cold (npm
> install, `.env` re-pinned to `file:../db/custom.db`, `db:setup` → canonical
> 4/12/2/4, Playwright chromium); (2) an audit of the session-11 commit
> `f93033b` (skills: `code-review-checklist`, `security-and-hardening`,
> `code-quality-standards`, `tdd`, per `skills/skills-catalog.md`) — all 8
> commit-message claims verified TRUE; findings: 1 HIGH (H-70, mine, found by
> running the gates on the fresh clone), 1 MEDIUM, 5 LOW, 5 INFORMATIONAL, none
> Critical; (3) a **live reference parity sweep round 7** (desktop 1440×900 +
> mobile 390×844, logged-out, FULL two-census ritual) — **ZERO drift**, the
> fourth consecutive same-day zero-drift sweep (sessions 9→10→11→12); (4) TDD
> remediation of the audit findings: the broken lint gate (H-70), the sweep
> tool's stale-server hazard (M1), the census vacuous-pass guard (L1), a dead
> focus class on the skip link (L6), and the mis-captured size-chips screenshot
> (I1).

---

## 1. Starting state

Workspace RESET again (fresh sandbox): no local repo. Re-cloned
`https://github.com/nordeim/luxury-fashion-store.git` → HEAD `260ce8b`
(session-11 `f93033b` + its transcript), tree clean. Cold rebuild:
`npm install`; `.env` re-pinned `DATABASE_URL="file:../db/custom.db"`;
`npm run db:setup` verified live via Prisma counts (4 categories / 12 products
/ 2 users / 4 orders); `npx playwright install chromium` (v1248 bundle — same
fresh-sandbox quirk as sessions 6–11).

**Baseline gates on the committed tree:**

| Gate | Result |
|---|---|
| typecheck | ✓ |
| **lint** | **✗ — 5 errors (H-70, see §2)** |
| unit | ✓ 113/113 (14 files) |
| build + assemble | ✓ |
| E2E | ✓ 132 passed + 2 skipped (66 unique × 2 − 2 viewport skips + 2 setup) |

This is the first session whose baseline caught a **regression already pushed
to main**: `npm run lint` fails on any fresh clone of `f93033b` because
`scripts/parity-sweep-session11.cjs` (new in that commit) is CommonJS and the
flat eslint config's `ignores` list does not cover it. The session-11 thread
evidently finalized the sweep script after its last lint run — the committed
main has never seen a green lint. **Every future session's baseline would
inherit this red gate**; fixing it is this session's first ToDo.

`npm audit`: unchanged dev-toolchain findings — accepted with rationale
(carried since session 2; zero runtime exposure).

## 2. Audit of `f93033b` (Explore full-diff + first-hand verification)

All 8 commit-message claims verified TRUE with file:line evidence: A-1 skip
link is the literal first DOM node (`(storefront)/layout.tsx:45-50`;
StoreProvider renders no wrapper), sr-only 1×1 at rest / static reveal
(compiled Tailwind v4 verified — `focus:px-4`/`focus:py-2` longhands emitted
after `focus:not-sr-only`'s `padding: 0` shorthand, so the reveal has real
padding); A-2 media query is the file's last rule, unlayered + `!important`,
provably zero normal-path effect; H-67 census walks all 12 PDPs with
Size-Guide-scoped chip locators (`product.spec.ts:50-61`; catalog constant at
`src/lib/data/catalog.ts:38`); H-68 uniqueness guard (`home.spec.ts:340-346`);
H-69 name-agnostic comment; accessibility.spec.ts pins A-1 (logged-out
opt-out) + A-2 (reduced-motion context observes the chromium-serialized
`1e-05s`); docs counts independently recomputed and exact (113 unit / 66
unique E2E / SKILL v1.6.0).

### Findings

| ID | Sev | Finding | Remediation (this session) |
|---|---|---|---|
| **H-70** | 🟠 HIGH | **Lint gate broken on the committed main tree.** `scripts/parity-sweep-session11.cjs` uses CommonJS `require()` (top-level + inline); `@typescript-eslint/no-require-imports` fires 5×. The config's `ignores` covers `scripts/forward-proxy.js` only ("CommonJS by design, never committed" — but the sweep tool now IS committed). Fresh clones fail `npm run verify`. | Add a scoped ignore for committed CommonJS tooling (`scripts/*.cjs`) with a rationale comment mirroring the forward-proxy precedent. Verification: `npm run lint` red → green. No rule weakened — app source (`src/`, `tests/`) stays fully linted; the ignore names the tooling class explicitly. |
| M1 | 🟡 MED | **Sweep tool can silently measure a stale server.** Hardcoded `:3100`, `stdio: "ignore"` (server logs lost), no EADDRINUSE/stale detection, no child `error` handler, `browser.close()` outside `finally`. A leftover E2E webServer on :3100 makes the spawned server die silently while `waitHealth` probes the OLD build → confidently wrong census (the failure class of SKILL trap #27). | Harden `scripts/parity-sweep-session11.cjs`: fail fast if :3100 is already bound (probe before spawn, clear message naming the fix); capture server stderr and dump it on health-timeout; child `error` handler; `browser.close()` in `finally`. Verification: occupy :3100 with a dummy listener → sweep exits fast with the intended message; free port → full sweep runs green. |
| L1 | 🟢 LOW | **H-67 census can pass vacuously for a future `sizes: []` product.** The size block renders only when `product.sizes.length > 0`; with an empty list `sizeBlock` resolves to 0 elements and BOTH the count assertion (0===0) and `toEqual([])` pass without the page rendering anything. No current product has empty sizes. | Pin the scoping anchor itself: `await expect(sizeBlock).toHaveCount(1)` before counting chips — if the size block (or its `mb-6` anchor / Size Guide sibling) disappears, the census fails LOUDLY instead of vacuously. Teeth demo: mutate the PDP size-block class `mb-6`→`mb-7` → rebuild → census RED → revert → GREEN (also demonstrates the L3 coupling is loud-by-design). |
| L2 | 🟢 LOW | Census is one test looping 12 PDPs — a failure at product *k* aborts *k+1..12* in that run. Deliberate trade-off keeping the "66 cases" arithmetic; worth a comment (added with L1). | Comment in the spec (no behavior change). |
| L3 | 🟢 LOW | Census couples to the styling class `mb-6` — a spacing refactor breaks it loudly. Consistent with the repo's rendered-class pin philosophy (drawer census); the L1 guard makes the failure mode self-explanatory. | Accepted as designed (documented in the spec comment). |
| L4 | 🟢 LOW | Sweep script robustness: no `server.on("error")`; `browser.close()` not in `finally`; `/tmp` output POSIX-only. | Covered by the M1 hardening (`/tmp` path kept — sandbox is POSIX; noted for portability). |
| L5 | 🟢 LOW | A-2 auth asymmetry: normal half runs authenticated, reduced half is fresh/logged-out. Harmless today (marquee is `aria-hidden` decoration). | Accepted; carried note. |
| L6 | 🟢 LOW | `focus:z-[60]` on the skip link is dead styling — `focus:not-sr-only` resolves to `position: static` (verified in compiled v4 CSS), and z-index is inert on non-positioned elements. | Remove the dead class. Only production change this session; parity-safe by construction (the class emits nothing observable at rest or on focus) and proven by the post-change census (round 7b byte-identical). |
| L7 | 🟢 LOW | Revealed skip link reflows the page ~one line while focused (in-flow static reveal). Standard a11y pattern, parity-safe at rest. | Accepted (standard; `position: fixed` reveal would deviate from the conventional pattern). |
| I1 | ⚪ INFO | **`clone-size-chips.png` is a byte-copy of `clone-home-desktop.png`** (sweep script `--shots` stage `copyFileSync`s it; both committed PNGs are 1,096,788 bytes). The "size chips surface" screenshot documents nothing chip-specific. | Fix the shots stage to capture a REAL chips close-up: on the PDP, screenshot the Size-Guide-scoped size block element. Re-capture. |
| I2 | ⚪ INFO | Reduced-motion block omits `::backdrop` and `-delay` resets. Verified no current exposure (no `animation-delay`, no WAAPI, Radix backdrops untransitioned). | Accepted; carried note (add if dialog backdrops gain transitions). |
| I3 | ⚪ INFO | `axe-core` ^4.10.0 in devDependencies is unused (a11y pins are manual). | Accepted; carried (removal is lockfile churn with zero behavioral gain; revisit if automated a11y audits are adopted). |
| I4 | ⚪ INFO | Catalog constant lives at `src/lib/data/catalog.ts` (docs sometimes say `src/lib/catalog.ts`). | Noted; existing docs already point at the right paths where load-bearing. |
| I5 | ⚪ INFO | `1e-05s` is a chromium serialization artifact; suite is chromium-only and the `parseFloat < 0.001` guard makes the pin semantic. | Correct as shipped; no change. |
| I6 | ⚪ INFO | Sweep tool has no package.json script alias (invoked ad hoc per docs). | Accepted; documented invocation only. |
| I7 | ⚪ INFO | PAD wording "132 passed + 2 desktop-only skips" is loose (132 includes the 2 setup tests) but matches the stated arithmetic. | Accepted. |

**Accepted (documented, carried):** dev-toolchain npm-audit findings; real PSP
behind the checkout seam; nonce CSP; H-56/H-59 disclosed E2E gaps; E2E admin
rate budget exactly consumed (10/10); clone renders MORE h2/h3 headings than
the reference (13/42 vs 11/36) — the documented superset's fuller catalog
rendering, all families Cormorant.

## 3. Live reference sweep — round 7 (measured 2026-10-15): ZERO drift

Pre-change census with the committed sweep tool (round 7a):

| Surface (ledger) | Reference (measured) | Clone (measured) | Verdict |
|---|---|---|---|
| Desktop page | **11079** | 11085 (+6) | known line-box rounding |
| Desktop sections | 810/70/835/706/835/835/3549/835/835/746/470 | ≤ +2px each | byte-parity holds |
| Desktop footer | 444 | 444 | equal |
| Mobile page | **11257** | 11264 (+7) | known rounding |
| Mobile sections | 591/70/800/742/800/840/**3171**/800/800/774/569 | ≤ +3px each (deals 3174 — session-9 pinned residue) | holds |
| Mobile footer | 1189 | 1189 | equal |
| Font census h1/h2/h3 | 100% Cormorant (1/11/36) | 100% Cormorant (1/13/42 — superset counts) | families hold |
| Font census h4 | Montserrat ×3 | Montserrat ×3 | holds |
| Mobile drawer panel | `fixed left-0 top-0 h-full w-80 bg-background z-50 p-8 flex flex-col gap-6` | **char-identical** | holds |
| Mobile drawer nav | `flex flex-col gap-5 mt-4`, 5 items x=32/w=256/h=20, gaps [20,20,20,20] | **identical** | v4 pin intact |
| Size chips (resting) | 10px / 10px pad / 4px py / r0 / transparent / rgb(229,224,220) | identical | P-11 holds |
| Card-name h3 | Cormorant (72px desktop / 48px mobile) | identical | P-15 holds |
| Marquee | present, animating | present | P-3 holds |
| Console | 2 ref-side 401s (reference's own backend) | clean | — |

**The reference has now held still across FOUR consecutive same-day sweeps
(sessions 9→10→11→12); the two-census ritual keeps verifying it instead of
assuming it.** A post-change census (round 7b) re-runs after the L6
production change to prove rest-invariance by measurement.

## 4. ToDo ledger (execution order)

| # | Item | Status |
|---|---|---|
| 1 | Cold env rebuild (clone → install → `.env` → `db:setup` → chromium) + baseline gates | ✅ |
| 2 | Baseline lint RED captured (H-70 — 5 `no-require-imports` errors on the committed tree) | ✅ |
| 3 | Explore audit of `f93033b` (8 claims + new-issue scan) | ✅ |
| 4 | Parity sweep round 7a (both viewports, zero drift) | ✅ |
| 5 | H-70: scoped `scripts/*.cjs` eslint ignore + rationale → lint green | ✅ |
| 6 | M1/L4: sweep tool hardening (port-occupied fail-fast, stderr capture, error handler, browser.close in finally) + occupied-port demo | ✅ |
| 7 | L1 (+L2 comment): census vacuous-pass guard `toHaveCount(1)`; teeth demo `mb-6`→`mb-7` mutation → RED → revert → GREEN | ✅ |
| 8 | L6: remove dead `focus:z-[60]` from the skip link → rebuild → census round 7b byte-identical | ✅ |
| 9 | I1: real size-chips close-up in `--shots`; screenshots refresh (9 surfaces) | ✅ |
| 10 | Full gates on the final build (typecheck/lint/unit/build + E2E 132+2) | ✅ |
| 11 | Docs alignment (SKILL version/trap note, plan-session12) + worklog | ✅ |
| 12 | Commit to main; SSH-wrapper push (dry-run first); verify remote ref | ✅ |

## 5. Verification ledger (post-remediation, evidence-backed)

- Baseline RED for H-70 observed first-hand on the fresh clone (`npm run
  lint` → 5 errors); green after the scoped ignore — no other rule touched.
- M1 demo: dummy listener on :3100 → sweep exits fast with "port 3100 is
  already in use" guidance; freed port → full round-7 sweep green.
- L1 teeth: `mb-6`→`mb-7` mutation on the PDP size block → rebuild → census
  RED (sizeBlock count 0 ≠ 1, before the chip assertions can vacuously pass)
  → revert → rebuild → GREEN.
- L6: dead-class removal is the ONLY production change; post-change census
  (round 7b) byte-identical to round 7a and to the session-9/10/11 ledgers
  (clone desktop 11085 / mobile 11264, deals 3174, drawer panel
  char-identical, gaps [20,20,20,20]) — rest-invariance proven BY
  MEASUREMENT.
- Final gates on the final code: typecheck ✓ lint ✓ 113/113 unit ✓ build +
  assemble ✓ E2E 132 passed + 2 skipped (arithmetic exact).
- Screenshots re-captured on the remediated standalone; `clone-size-chips.png`
  is now a genuine PDP size-chip close-up (element screenshot of the
  Size-Guide-scoped block), no longer a byte-copy of the home capture.

## 6. Residual risks / next steps

1. Dev-toolchain npm-audit findings — revisit when vitest 5 / prisma 7 land
   non-breaking paths (carried).
2. Real PSP behind the checkout seam (carried).
3. Nonce-based CSP to retire `'unsafe-inline'` (carried).
4. H-56/H-59 disclosed E2E gaps (DB-mocking harness) — unchanged, carried.
5. E2E admin rate budget remains EXACTLY consumed (10/10) — SQL-fixture
   pattern only (unchanged).
6. The a11y roadmap remains CLOSED; the remaining superset roadmap is
   commerce-side (PSP).
7. Keep running the FULL two-census ritual every session — four same-day
   zero-drift sweeps is a streak, not a guarantee (session-10 §6 #5).
8. If the reference re-adds the drawer ACCOUNT/WISHLIST tail, restore the
   clone's tail and re-pin 7 items (session-8 §6 #7 — unchanged).
9. Sweep tool portability: `/tmp` output path is POSIX-only (L4 remainder) —
   irrelevant in this sandbox; fix before using on Windows.
10. `axe-core` unused devDependency (I3) — adopt for automated a11y audits or
    remove in a dependency-hygiene pass.
