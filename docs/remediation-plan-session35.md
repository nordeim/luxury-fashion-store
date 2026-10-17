# Remediation Plan — Session 35 (AURELIA / VELOUR clone)

> **Status:** PLANNED → EXECUTED this round (the session-34 continuation, named
> for the next session number per the standing precedent).
> **Mode:** Verify-first (Mode C) → reconciliation of the pulled remote
> (`b4bafde` the session-34 F-EE round + `9dc4b25` the parallel thread's
> session log `docs/session_38.md` — docs-only, zero code) → first-hand
> audit → live-reference parity sweep round 30 → fresh audit pass → one
> gate-coverage remediation (**F-FF**). **Scope:** the session-34 commit
> audited TRUE first-hand (the F-EE describe verified in full source AND
> re-run green on the fresh build: **8 passed** = 3 existing unique + 1
> F-EE unique × 2 + 2 setup); **`9dc4b25` audited docs-only** (one file,
> +65 — `docs/session_38.md`, a parallel thread's narration of the SAME
> session-34 round; its ledger matches `b4bafde`'s actual diff); **the
> round-30a census measured ZERO DRIFT** (35th consecutive clone-side sweep —
> the reference byte-stable against the round-24 ledger, mainKids 11 both
> sides both viewports, pageH 11079/11085 + 11257/11264, footers 444/1189,
> drawer char-identical `w-80` + `flex flex-col gap-5`, gaps [20,20,20,20] —
> the v4 mobile-nav pin holds, the standing task re-check; ref console = the
> documented 2× 401 residue, clone clean); **the fresh pass closed the
> session-34 plan's §8 #1 documented candidate (carried four rounds,
> session-32 §8 #20 → 33 → 34)** — the `/checkout/success` signed-in-OWNER
> positive path (`isOwner`, `src/app/(storefront)/checkout/success/page.tsx:39`)
> has only INCIDENTAL wire coverage (the placement-redirect cases assert the
> success content after the flow lands there); what stays unpinned is a
> **DIRECT owner-capability matrix row** — james fetching his own order's
> success URL with no token → 200. **F-FF**, LOW gate-coverage, zero product
> defect (the gate serves correctly today — verified first-hand by this
> round's plan probe). Same family as F-Y/F-AA/F-BB/F-CC/F-DD/F-EE: a
> declared contract the gates never exercise — declared here in the seam's
> own source comment ("Capability gate: signed-in owners see their own
> orders; guests need the HMAC view-token. Anything else is a 404 (no
> existence leak).").

---

## 1. Starting state

WARM workspace fast-forwarded `b4bafde..9dc4b25` (the pull brought ONLY
`docs/session_38.md` — a parallel thread's narration of the session-34
round; docs-only). **Sandbox reset incidents this round — ZERO** (the
recurring reset set fully survived for the THIRD time in the ledger —
the session-32 precedent repeated):

| Step | Result |
|---|---|
| `git pull` | ✓ fast-forward to `9dc4b25` (docs/session_38.md only); `skills/` intact (283 entries); no stray `bun.lock` |
| `.env` | ✓ the canonical 3-line contract intact (DATABASE_URL contract URL + dev AUTH_SECRET + site URL) |
| `bin/ssh` shim + paramiko | ✓ present (venv shebang) + paramiko 5.0.0 in `/home/z/.venv` |
| Playwright cache | ✓ both chromium-1200 and chromium-1248 present (the pinned @playwright/test 1.64.1's v1248) |
| `db/custom.db` | ✓ canonical 4/12/2/4 (+8 OrderEvents; ORD-2026-004 `userId:null` verified by direct SQLite count) |
| `core.fileMode false` | ✓ survived |

**Baseline gates on the committed tree (TWENTY-SEVENTH consecutive session
fully green at baseline):** typecheck ✓ · lint ✓ · **173/173 unit (19
files)** ✓ · build + assemble ✓ (E2E runs at the final gate).

## 2. Audit of `b4bafde` (session-34) and `9dc4b25` (the log commit) — first-hand

`b4bafde` composition (14 files): the NEW F-EE describe in
`tests/e2e/wishlist.spec.ts` (+178 — the describe + the dbRead/sqlRun
helpers mirroring the account-orders shapes), the NEW
`scripts/plan-probe-session34.cjs` (223 lines, 16 checks), the plan (320
lines), 4 screenshot re-captures, README/CLAUDE/PAD/AGENTS/SKILL v1.27.0
alignment, worklog, `docs/session_37.md`. Claims verified against the
final tree:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | The F-EE describe pins both auth doors of `mergeGuestWishlistIntoUser` WITHOUT logging james/admin in | `tests/e2e/wishlist.spec.ts` read in full: ONE case, fresh logged-out context (`test.use(loggedOut)`), register run-unique → sign-out → guest-heart `wide-brim-felt-hat` → capture the 192-bit token → dbRead the guest row (userId null) → login-as-fresh-user (`?redirect=/wishlist`, PATHNAME predicate) → merged render + reload persistence (server truth) → `aurelia_wishlist` ABSENT post-login (G-5) → guest row GONE by token; try/finally drops the guest row on mid-case failure (H-24); spawnSync ARGV arrays per trap #34; the header documents the limiter arithmetic + the H-24 posture | TRUE |
| 2 | The wishlist gate is GREEN on the fresh build | `npx playwright test tests/e2e/wishlist.spec.ts` re-run: **8 passed** (3 existing unique + 1 F-EE unique × 2 + 2 setup; 18.4s) | TRUE |
| 3 | The plan-probe artifact exists and matches its contract | `scripts/plan-probe-session34.cjs` present (223 lines); the throwaway-DB-copy harness + the full F-EE flow wire-verified on the copy | TRUE |
| 4 | Docs aligned (SKILL v1.27.0 frontmatter 129+256+2; README badge 173+256; CLAUDE gate line 129 + the F-EE gate; PAD 18\|129\|256; AGENTS the F-EE gate) | all five docs re-read this round; counts consistent | TRUE |
| 5 | No production change (test-only round) | `git show b4bafde --stat`: zero `src/` files (tests/docs/screenshots/scripts/worklog only) | TRUE |

`9dc4b25` composition (1 file): `docs/session_38.md` (+65) — a parallel
thread's narration of the SAME session-34 round (its opening line resumes
the session-34 task book; its ledger matches `b4bafde`'s actual diff: same
F-EE shape, same limiter arithmetic, same probe name, same counts, the same
push verification). **Verdict: session-34 5/5 claims TRUE; `9dc4b25`
docs-only, zero repo-state impact beyond the log itself — RETAINED (never
overwrite another thread's log); this round's narration ships as
`docs/session_39.md`.**

## 3. Live reference sweep — round 30a (measured 2026-10-18): ZERO DRIFT

The single-census pre-remediation pass (the 30b `--shots` pass closes the
ritual after the round's change). The reference is byte-stable against the
round-24 ledger — **35th consecutive clone-side sweep**:

| Ledger field | Round-24…29 ledger | Round-30a measured | Verdict |
|---|---|---|---|
| ref desktop pageH / mainKids | 11079 / 11 | 11079 / 11 | byte-stable |
| clone desktop pageH | 11085 | 11085 | byte-stable |
| ref mobile pageH / mainKids | 11257 / 11 | 11257 / 11 | byte-stable |
| clone mobile pageH | 11264 | 11264 | byte-stable |
| footers | 444 / 1189 | 444 / 1189 | byte-stable |
| drawer panelCls/navCls | char-identical | identical | byte-stable — **the mobile-nav v4 pin holds** (`w-80` + `flex flex-col gap-5`, gaps [20,20,20,20]; the standing task re-check) |
| clone console | clean | clean | byte-stable |
| ref console | the documented 2× 401 residue | identical | documented residue |

Ten stable sweeps since the round-21 move.

## 4. Fresh audit pass — finding (the round's target)

The session-34 plan's §8 #1 documented candidate (carried four rounds,
session-32 §8 #20 → 33 → 34), verified first-hand: `rg "checkout/success"
tests/e2e/` → every existing fetch is either the guest-flow redirect
LANDING (`toHaveURL` on the placement cases) or the F-CC guest matrix
(logged-out contexts only: the positive pair + absent/wrong/cross/unknown
tokens). **No spec ever direct-fetches the success page as a signed-in
owner.** The gate expression
(`src/app/(storefront)/checkout/success/page.tsx:38-41`):

```ts
const user = await getCurrentUser();
const isOwner = user && order.userId === user.id;
const isGuestWithToken = !order.userId && tokenValue && verifyOrderViewToken(order.number, tokenValue);
if (!isOwner && !isGuestWithToken) notFound();
```

rows covered vs uncovered:

| Gate row | Covered today? |
|---|---|
| guest + own valid token → 200 | ✓ F-CC positive (logged-out) |
| guest + absent/wrong/cross/unknown token → 404 | ✓ F-CC matrix (logged-out) |
| **signed-in owner + OWN order + NO token → 200** | ✗ only the incidental redirect landing — no DIRECT capability assertion |
| **signed-in user + GUEST order + NO token → 404** | ✗ (the `isOwner` mismatch half via `order.userId === null !== user.id`) |
| **signed-in user + guest order + its VALID token → 200** | ✗ (the `isGuestWithToken` term is session-orthogonal — a "tightened" gate requiring logged-out would break shared confirmation links invisibly) |
| signed-in user + a FOREIGN USER's order + NO token → 404 | covered-by-shape (the `===` false branch is exercised by the null-mismatch row; two non-null distinct ids cannot differ from `null !== user.id` under `===` semantics — no null special-case exists in the expression) |

Severity: LOW (gate-coverage gap; the gate works today — the plan probe
wire-verifies every row first-hand). Remediation: a NEW describe in
`tests/e2e/cart-checkout.spec.ts` (the OWNING spec — the F-CC capability
matrix lives there and the surface is the checkout flow's own), riding
james's per-project storageState (ZERO logins, zero limiter budget — the
F-DD posture).

### Honest-gate decisions (run before planning)

- **F-FF adds gate coverage; it changes no product behavior.** The served
  DOM is untouched; the parity census cannot drift (test-only round).
- **No gate is weakened.** No existing spec/case is modified; the new
  describe lives inside the existing `cart-checkout.spec.ts` (no playwright
  config edit; the spec count stays 18); no new npm dependencies;
  `.env.example` unchanged; money untouched.
- **ZERO login consumption.** The case rides james's per-project
  storageState (the setup projects' existing logins); james's and admin's
  buckets stay EXACTLY consumed (10/10 — SKILL §9 #23).
- **All three rows read from CANONICAL seed data** (no SQL fixtures, no
  writes, no cleanup): ORD-2026-001 (james, card, the gown item) and
  ORD-2026-004 (the canonical guest order, `guest.visitor@example.com`,
  `userId: null` — the same IDOR-target row the F-DD gate exercises on the
  account surface). H-24: nothing to clean (read-only GETs on canonical
  rows; global-setup re-seeds orders every run anyway).
- **The offline token** for row 3 is computed with the shared
  `E2E_AUTH_SECRET` (the `e2e-secrets.ts` constant — the standalone's
  `AUTH_SECRET`), mirroring the F-CC helper's shape exactly.
- **The foreign-owner row stays covered-by-shape** (documented residual —
  the `===` operator has no null special-case; minting a second USER's
  order via SQL would add fixture machinery for a cell whose comparison
  semantics are identical).

## 5. Remediation design (TDD)

### ToDo

| # | Task | Layer | Gate |
|---|---|---|---|
| 1 | `scripts/plan-probe-session35.cjs` — NEW probe: boots the standalone on :3207 against a THROWAWAY copy of `db/custom.db` (zero dev-DB writes), logs james in through the REAL UI on the copy (the session-33 shape), then wire-verifies every matrix row BEFORE the spec exists: owner+own order+no token → 200 with the order number + james's email + the item content; signed-in+guest order+no token → 404 into the not-found card with NO guest-email leak; signed-in+guest order+its own offline token → 200 with the guest email (session-orthogonality); cross-order token while signed in → 404; james's canonical state untouched; zero console errors | tooling | node script |
| 2 | `tests/e2e/cart-checkout.spec.ts` — NEW describe "owner capability rows of the success gate (F-FF, session-35)", ONE case riding james's per-project storageState (ZERO logins): the three direct-fetch rows per §4, with the spec header documenting the covered/uncovered-row census and the H-24 posture (nothing to clean — read-only GETs on canonical rows) | E2E | playwright |
| 3 | Mutation demo (surgical, inverse-restore — traps #37/#39): drop the `isOwner` term from the gate (`if (!isGuestWithToken) notFound()`) → REBUILD (trap #16) → exactly the 2 F-FF case-runs fail (row 1 404s; rows 2/3 pass — the guest matrix untouched; the gap's exact shape) → restore via inverse edit, `rg`-verify the gate restored, rebuild | process | playwright |
| 4 | Round-30b census — MUST be byte-stable vs the 30a ledger (test-only round; the verdict closes the rest-invariance claim); `--shots` refreshes the screenshot set | parity | sweep tool (--shots) |
| 5 | Final gates on the final tree: typecheck → lint → unit → build → full E2E | gates | npm run verify + test:e2e |
| 6 | Docs alignment: README (badge 173+258, the Orders row gains the owner-capability pin, testing/status rows 130), CLAUDE.md (gate line 130 + the F-FF gate in the chain + a NEW F-FF testing bullet), PAD (test table 18\|130\|258, §7.1 session-35 paragraph), SKILL v1.28.0 (frontmatter version/project_state, §2 E2E row + F-FF, Appendix B NEW session-35 row), AGENTS.md (the security line gains the F-FF gate), this file's execution record, worklog, `docs/session_39.md` (the round's narration log — session_38.md taken by the parallel thread) | docs | stale-count sweep |

### Count ledger (expected post-remediation)

| Metric | Before | After |
|---|---|---|
| unit files / tests | 19 / 173 | 19 / 173 (no new pure seam — the finding is a page-level RSC gate; `verifyOrderViewToken` is already unit-pinned) |
| E2E spec files | 18 | 18 (the describe lands INSIDE cart-checkout.spec.ts) |
| unique E2E cases | 129 | 130 (+1 F-FF) |
| E2E result | 256 passed + 2 skipped | 258 passed + 2 skipped (130 × 2 − 2 desktop-only skips; the +2 setup projects pass outside the case-run summary, the established convention) |

## 6. Validation of this plan against the codebase (pre-execution)

- `scripts/plan-probe-session35.cjs` runs FIRST (the session-29…34
  plan-probe discipline): the probe's checks wire-verify every matrix-row
  assumption before the spec exists (see §7 #1 for the executed results).
- The success page's gate reads `getCurrentUser()` (the session cookie) —
  james's per-project storageState rides it with zero logins; the
  canonical seed gives james ORD-2026-001/002/003 (`email:
  james@example.com`, the gown item on -001) and the guest
  `guest.visitor@example.com` on ORD-2026-004 (`userId: null` — verified
  in the seed AND by direct SQLite count this round).
- The offline token shape: HMAC-SHA256 over `order-view:${orderNumber}`,
  hex, first 40 chars, secret = the standalone's `AUTH_SECRET`
  (`src/lib/order-token.ts`; the F-CC offline helper's exact shape).
- The not-found card text "Page Not Found" (the F-CC matrix's assertion
  shape) — the platform not-found card, not a bare 404 body.
- The limiter arithmetic: the case performs ZERO logins and zero
  unauthenticated write-seam calls — no bucket moves (the GETs are not
  rate-limited).
- No schema/env/seed changes; money untouched; no revalidatePath surface;
  `.env.example` unchanged; no src/ change (the mutation demo's temporary
  edit is restored and verified).
- The census measures the home page only — a test-only round cannot drift
  it; the ritual still runs as the verdict (trap #40's discipline).
- `docs/session_38.md` exists (the parallel thread's duplicate log) — the
  round's own narration log ships as `docs/session_39.md` (the next free
  slot; the convention's +1 lands on a taken name, same shape as
  sessions 33/34).

## 7. Execution record

| # | Task | Result |
|---|---|---|
| 1 | plan-probe | ✅ `scripts/plan-probe-session35.cjs` — **13/13 checks passed**: the copy boot + health; james logged in through the REAL UI on the copy (lands /account); row 1: `/checkout/success?order=ORD-2026-001` NO token → 200 + "ORD-2026-001" + james@example.com + the gown item ("Silk Draped Evening Gown") on the served body; row 2: ORD-2026-004 signed-in NO token → 404 + "Page Not Found" + ZERO guest.visitor@example.com leak; the offline token reproduces the declared 40-hex HMAC shape; row 3: ORD-2026-004 + its own OFFLINE token while signed in → 200 + the guest email (session-orthogonality); row 3b: the cross-order token while signed in → 404; zero unexpected console errors; the copy deleted — every matrix-row assumption verified BEFORE the spec was written, against a throwaway DB copy (zero dev-DB writes). One probe-harness fix en route (not a product failure): the first run scored 12/13 — the console check counted the browser's own "Failed to load resource: 404" messages from the two DELIBERATE 404 navigations (the designed 404 surface IS the behavior under test); the check now excludes exactly that noise (pageerrors still fail) → 13/13 |
| 2 | cart-checkout.spec.ts describe | ✅ NEW describe "owner capability rows of the success gate (F-FF, session-35)" — ONE case riding james's storageState, the three direct-fetch rows + row 3b per §4 + the spec header documenting the row census + the H-24 posture; typecheck ✓; GREEN **28 passed** (13 existing unique + 1 F-FF unique) × 2; the +2 setup projects pass outside the case-run summary (the established convention; 53.2s) |
| 3 | Mutation demo | ✅ the owner capability dropped from the gate (`isOwner` + the `getCurrentUser()` read + its import removed — `if (!isGuestWithToken) notFound()`; the strict `noUnusedLocals` gate forces the mutation to its full shape) → REBUILD → **exactly the 2 F-FF case-runs failed** (row 1 404s — the failure line is `row 1: status` expecting 200; rows 2/3/3b pass; the F-CC guest matrix + all placement cases stay green — the gap's exact shape) → restored via inverse edit (rg-verified the gate back at :41; `git diff` on src/ empty) → rebuild → 28/28 green |
| 4 | Round-30b census (--shots) | ✅ ZERO DRIFT — byte-identical to 30a in ALL census fields (35th/36th consecutive): mainKids 11 both sides both viewports; pageH 11079/11085 + 11257/11264; footers 444/1189; drawer objects char-identical (the v4 mobile-nav pin holds); ref console = the documented 2× 401 residue; clone console clean — the test-only round proven rest-invisible by measurement; screenshots refreshed (live-variance pattern) |
| 5 | Final gates on the final tree | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **258 passed + 2 skipped** (130 unique × 2 − 2 desktop-only skips; the +2 setup projects pass outside the case-run summary; 5.3m) — the TWENTY-SEVENTH consecutive fully-green session, exactly the §5 count ledger (129→130 unique, 256→258 passed) |
| 6 | Docs alignment + stale-count sweep | ✅ README (badge 173+258, the Orders row + the owner-capability pin, testing/status rows 130); CLAUDE.md (gate line 130, the F-FF gate in the chain, NEW F-FF testing bullet); PAD (test table 18\|130\|258, §7.1 session-35 paragraph); SKILL v1.28.0 (frontmatter, §2 E2E row + F-FF, Appendix B NEW session-35 row); AGENTS.md (the security line gains the F-FF gate); docs/remediation-plan-session35.md (this record); worklog; docs/session_39.md (the round's narration log — session_38.md taken). Stale-count sweep: zero stale counts |

## 8. Residual risks / next steps (post-F-FF)

1. The success gate's foreign-owner row (a signed-in user fetching a
   DIFFERENT non-null userId's order) stays covered-by-shape — the `===`
   false branch is exercised by the null-mismatch row and the operator has
   no null special-case; a pin would need an SQL-minted second-user order
   (fixture machinery for an identical comparison cell).
2. The merge's transaction-atomicity half (H-29) stays pinned by
   source-read only — wire fault-injection into a SQLite tx is not
   reachable from Playwright (the same posture as the cart merge's
   transaction pin; the deliberate-failure shapes are carried).
3. The merge's dedupe half (`update: {}`) stays covered-by-shape — a pin
   would need a pre-loaded user list (an SQL fixture) + a second guest
   toggle — candidate for a future round if the auth-merge seam reopens.
4. The search 503 / health `db:false` deliberate-failure shapes stay
   pinned by source-read + success-path only (carried, session-32 §8 #1).
5. `/api/search`'s 429 path unpinned by design (carried; a future
   limiter-reset harness would relax the budget for every 429-shaped pin).
6. The PDP og:image annotation / og:type union / `style-src
   'unsafe-inline'` exceptions (carried, sessions 26–34).
7. Real PSP behind the checkout seam (carried).
8. Dev-toolchain npm-audit findings (11, all dev-only) — carried.
9. G-3 POSIX-only sweep paths (carried).
10. The action-seam gate couples to the standalone manifest shape — fails
    loud at the canary by design (carried).
11. The zero-drift streak is a streak, not a guarantee — the two-census
    ritual stays mandatory. Ten stable rounds since the round-21 move.
12. security.txt `Expires` (2027-11-01) renewal cadence (carried).
13. The canonical convention delta / `/shop` og:url convention (carried,
    session-26).
14. The sweep tool inherits the shell's `AUTH_SECRET` (carried; this round
    ran it with the inline dev secret — the documented workaround).
15. `NewsletterSubscriber` stays outside global-setup's wipe list
    (carried).
16. HSTS on http://localhost inert by construction (carried).
17. The admin action's EVENT-WRITE path stays unpinned at the action layer
    (carried, session-33 §8 #16 — needs an admin login or a server-action
    POST).
18. The F-BB spec comment's limiter arithmetic undercount stays as-is
    (carried, session-34 §8 #18 — a comment is not a gate).
19. `docs/session_38.md` is a parallel thread's narration of the
    session-34 round — retained as-is (never overwrite another thread's
    log); the round's own narration ships as `docs/session_39.md`.
