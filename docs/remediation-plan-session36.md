# Remediation Plan — Session 36 (AURELIA / VELOUR clone)

> **Status:** PLANNED → EXECUTED this round (the session-35 continuation, named
> for the next session number per the standing precedent).
> **Mode:** Verify-first (Mode C) → reconciliation of the pulled remote
> (`f9575d9` the session-35 F-FF round + `12bd9a7` the parallel thread's
> session log `docs/session_40.md` — docs-only, zero code) → first-hand
> audit → live-reference parity sweep round 31 → fresh audit pass → one
> gate-coverage remediation (**F-GG**). **Scope:** the session-35 commit
> audited TRUE first-hand (the F-FF describe verified in full source AND
> re-run green on the fresh build: **28 passed** = 13 existing unique + 1
> F-FF unique × 2 + 2 setup); **`12bd9a7` audited docs-only** (one file,
> +60 — `docs/session_40.md`, a parallel thread's narration of the SAME
> session-35 round; its ledger matches `f9575d9`'s actual diff: same F-FF
> shape, same probe name, same counts); **the round-31a census measured
> ZERO DRIFT** (37th/38th consecutive clone-side sweep — the reference
> byte-stable against the round-24 ledger, mainKids 11 both sides both
> viewports, pageH 11079/11085 + 11257/11264, footers 444/1189, drawer
> char-identical `w-80` + `flex flex-col gap-5 mt-4`, gaps [20,20,20,20] —
> the v4 mobile-nav pin holds, the standing task re-check; ref console =
> the documented 2× 401 residue, clone clean); **the fresh pass closed the
> session-35 plan's §8 #3 documented candidate (the strongest remaining,
> carried session-32 §8 → 34 §8 #2 → 35 §8 #3)** — the guest wishlist
> merge's **DEDUPE half**: the per-item upsert's `update: {}` branch
> (`src/lib/cart.ts:217-222`) fires when the guest item is ALREADY on the
> user's list, and NO gate ever exercises it (the F-EE pin's fresh user
> starts with an empty list, so only the CREATE branch runs
> deterministically). **F-GG**, LOW gate-coverage, zero product defect
> (the merge serves correctly today — verified first-hand by this round's
> plan probe). The regression class the pin guards: the upsert rewritten
> as a blind create → the `@@unique([wishlistId, productId])` constraint
> throws inside the H-29 transaction → the merge crashes → **the login
> door breaks for any returning member who hearted a piece before
> signing up** — the exact P2002-across-the-seam bug class the sibling
> toggle action's F-3 comment documents as having shipped before
> (session-3).

---

## 1. Starting state

WARM workspace fast-forwarded `f9575d9..12bd9a7` (the pull brought ONLY
`docs/session_40.md` — a parallel thread's narration of the session-35
round; docs-only). **Sandbox reset incidents this round — SEVEN** (the
FULL recurring reset set fired again, fully recovered):

| Step | Result |
|---|---|
| `git pull` | ✓ fast-forward to `12bd9a7` (docs/session_40.md only) |
| `skills/` pruned | ✓ `git restore -- skills/` → 283 entries back |
| `.env` rewritten | ✓ the sandbox re-wrote it to the absolute single-line shape → re-pinned to the canonical 3-line contract (schema-relative DATABASE_URL + dev AUTH_SECRET + site URL) |
| stray `bun.lock` | ✓ deleted |
| `bin/ssh` shim wiped | ✓ rebuilt (the Appendix-A paramiko shim, venv shebang `#!/home/z/.venv/bin/python3`) |
| venv paramiko wiped | ✓ paramiko 5.0.0 reinstalled into `/home/z/.venv` |
| Playwright chromium-1248 missing | ✓ `npx playwright install chromium` (only 1200 was cached; the pinned @playwright/test 1.64.1 needs v1248) |
| `db/custom.db` EMPTY | ✓ zero rows (the session-22 class, caught by direct Prisma count BEFORE any gate) → `npm run db:setup` re-materialized canonical 4/12/2/4 (+8 OrderEvents; ORD-2026-004 `userId:null` verified) |
| `core.fileMode false` | ✓ survived |

**Baseline gates on the committed tree (TWENTY-EIGHTH consecutive session
fully green at baseline):** typecheck ✓ · lint ✓ · **173/173 unit (19
files)** ✓ · build + assemble ✓ (E2E runs at the final gate).

## 2. Audit of `f9575d9` (session-35) and `12bd9a7` (the log commit) — first-hand

`f9575d9` composition (14 files): the NEW F-FF describe in
`tests/e2e/cart-checkout.spec.ts` (+73 — the describe + the offline-token
helper mirroring the F-CC shape), the NEW `scripts/plan-probe-session35.cjs`
(158 lines, 13 checks), the plan (269 lines), 4 screenshot re-captures,
README/CLAUDE/PAD/AGENTS/SKILL v1.28.0 alignment, worklog,
`docs/session_39.md`. Claims verified against the final tree:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | The F-FF describe pins the success gate's SESSION-BEARING rows WITHOUT logging james in | `tests/e2e/cart-checkout.spec.ts:447-487` read in full: ONE case riding james's per-project storageState (the default — no `test.use`, deliberate), FOUR direct-fetch rows from canonical seed data (row 1 owner+own order+no token → 200 + the order number + james's email; row 2 signed-in+guest order → 404 + "Page Not Found" + no guest-email leak; row 3 the guest order + its own offline token → 200 + the guest email; row 3b cross-order token → 404); the header documents the row census + the H-24 posture | TRUE |
| 2 | The cart-checkout gate is GREEN on the fresh build | `npx playwright test tests/e2e/cart-checkout.spec.ts` re-run: **28 passed** (13 existing unique + 1 F-FF unique × 2 + 2 setup; 56.9s) | TRUE |
| 3 | The plan-probe artifact exists and matches its contract | `scripts/plan-probe-session35.cjs` present (158 lines); the throwaway-DB-copy harness + james's real-UI login on the copy; the console-noise exclusion for the deliberate 404s | TRUE |
| 4 | Docs aligned (SKILL v1.28.0 frontmatter 130+258+2; README badge 173+258; CLAUDE gate line 130 + the F-FF gate; PAD 18\|130\|258; AGENTS the F-FF gate) | all five docs re-read this round; counts consistent | TRUE |
| 5 | No production change (test-only round) | `git show f9575d9 --stat`: zero `src/` files (tests/docs/screenshots/scripts/worklog only) | TRUE |

`12bd9a7` composition (1 file): `docs/session_40.md` (+60) — a parallel
thread's narration of the SAME session-35 round (its ledger matches
`f9575d9`'s actual diff: same F-FF shape, same probe name, same 13/13 and
28-passed counts, the same push verification). **Verdict: session-35 5/5
claims TRUE; `12bd9a7` docs-only, zero repo-state impact beyond the log
itself — RETAINED (never overwrite another thread's log); this round's
narration ships as `docs/session_41.md`.**

## 3. Live reference sweep — round 31a (measured 2026-10-18): ZERO DRIFT

The single-census pre-remediation pass (the 31b `--shots` pass closes the
ritual after the round's change). The reference is byte-stable against the
round-24 ledger — **37th/38th consecutive clone-side sweep**:

| Ledger field | Round-24…30 ledger | Round-31a measured | Verdict |
|---|---|---|---|
| ref desktop pageH / mainKids | 11079 / 11 | 11079 / 11 | byte-stable |
| clone desktop pageH | 11085 | 11085 | byte-stable |
| ref mobile pageH / mainKids | 11257 / 11 | 11257 / 11 | byte-stable |
| clone mobile pageH | 11264 | 11264 | byte-stable |
| footers | 444 / 1189 | 444 / 1189 | byte-stable |
| drawer panelCls/navCls | char-identical | identical | byte-stable — **the mobile-nav v4 pin holds** (panelCls `w-80` + navCls `flex flex-col gap-5 mt-4`, gaps [20,20,20,20]; the standing task re-check) |
| clone console | clean | clean | byte-stable |
| ref console | the documented 2× 401 residue | identical | documented residue |

Eleven stable rounds since the round-21 move.

## 4. Fresh audit pass — finding (the round's target)

The session-35 plan's §8 #3 documented candidate (the worklog's
"strongest remaining candidate"), verified first-hand: `rg "mergeGuestWishlist"
tests/` → the F-EE describe (wishlist.spec.ts) exercises the merge at both
auth doors, but its fresh user's list is EMPTY at merge time —
"the dedupe half (`update: {}`) stays covered-by-shape — the fresh user's
list is empty at login, so the create half is what runs deterministically
(the same posture the cart-merge pin takes)" (the F-EE spec's own header,
verbatim). The dedupe branch
(`src/lib/cart.ts:217-222`, inside the H-29 transaction):

```ts
await db.$transaction(async (tx) => {
  for (const item of guestList.items) {
    await tx.wishlistItem.upsert({
      where: { wishlistId_productId: { wishlistId: userList.id, productId: item.productId } },
      update: {},   // ← THE DEDUPE HALF — fires when the user ALREADY has the piece
      create: { wishlistId: userList.id, productId: item.productId },
    });
  }
});
```

The uncovered row: **a login whose guest cookie holds a piece the user's
list ALREADY has** — the upsert takes the `update: {}` branch (keep the
existing row, no duplicate), the merge still completes, the guest row is
still deleted, the cookie still cleared. A regression here is the
P2002-across-the-seam bug class the sibling toggle action documents as
having SHIPPED before (its F-3 comment: "the delete/create toggle raced on
the @@unique (two rapid toggles, or toggle+merge) and threw P2002 across
the seam") — a blind create on the overlapping item throws inside the
transaction, the merge propagates, **the login door breaks for any
returning member who hearted a piece before signing up**, with every gate
green.

Read-side masking verified (shapes the assertion design): `getWishlistDto`
returns `new Set(items.map(...))` — the wishlist PAGE can never render a
duplicate even with duplicated rows, so the DOM count is a SUPPORTING
observable only; the **load-bearing assertion is the server-truth
dbRead count** (`wishlistItem.count` for the user's wishlist × the
product == 1). (A blind duplicate row is itself impossible — the
`@@unique` rejects it — so the realistic failure mode is the CRASH, and
the pin's first assertion is that the login COMPLETES.)

Competing leads carried (dismissed this round, same posture as session-35):
the search-429 limiter-reset harness (tooling, not a seam), the admin
action's event-write path (needs an admin login or a server-action POST),
the success gate's foreign-owner row (covered-by-shape — `===` has no null
special-case), the merge's H-29 transaction-atomicity half (not reachable
from Playwright — fault-injection into a SQLite tx).

Severity: LOW (gate-coverage gap; the merge works today — the plan probe
wire-verifies every step first-hand). Remediation: a NEW describe in
`tests/e2e/wishlist.spec.ts` (the OWNING spec — the F-EE merge gate lives
there and the surface is the wishlist's own), reusing the file's proven
dbRead/sqlRun helpers.

### Honest-gate decisions (run before planning)

- **F-GG adds gate coverage; it changes no product behavior.** The served
  DOM is untouched; the parity census cannot drift (test-only round).
- **No gate is weakened.** No existing spec/case is modified; the new
  describe lives inside the existing `wishlist.spec.ts` (no playwright
  config edit; the spec count stays 18); no new npm dependencies;
  `.env.example` unchanged; money untouched.
- **ZERO canonical-login consumption.** The case registers a RUN-UNIQUE
  account (register bucket: 4 existing + F-EE 1/project + F-GG 1/project
  = 8 < 10 — measured arithmetic, SKILL §9 #23), and its LOGIN door uses
  the fresh email's own per-email limiter key (1 of 10). james's and
  admin's buckets stay EXACTLY consumed (10/10).
- **The pre-loaded user list happens through the REAL UI — zero SQL
  fixtures for the state itself.** The register door auto-logs-in
  (`createSession` inside registerAction), the case hearts
  `cashmere-overcoat` THROUGH THE PDP TOGGLE while signed in (the user
  list now holds the coat), signs out, then hearts the SAME coat as a
  guest (the guest cookie + row). The login-door merge therefore hits the
  dedupe branch on real UI-minted rows. (The session-35 plan expected an
  SQL fixture for the pre-load — the register-door auto-login makes the
  real-UI shape strictly simpler AND more wire-real.)
- **`cashmere-overcoat`** is the round's piece: order fixtures reference
  it (an ORD-2026-002 line item) but NO wishlist spec hearts it (the
  gown is the first wishlist case's piece on james's session; the hat is
  F-EE's guest piece; the cart merge uses the hat for CART state only).
  Wishlist state is wiped by global-setup every run, so no cross-spec
  coupling exists.
- **H-24: nothing canonical to clean.** The fresh user (`e2e-*@example.com`
  — the wipe list's exact predicate), its wishlist, and the guest row are
  run-scoped; the merge deletes the guest row on success; a try/finally
  drops it by token on mid-case failure (the F-EE posture); global-setup
  wipes wishlists at every run start anyway.
- **The G-5 cookie rule is asserted on the dedupe path too** (the cookie
  cleared post-login) — the dedupe branch is INSIDE the transaction, so a
  crash there would leave the cookie alive by design; the pin asserts the
  success path clears it.

## 5. Remediation design (TDD)

### ToDo

| # | Task | Layer | Gate |
|---|---|---|---|
| 1 | `scripts/plan-probe-session36.cjs` — NEW probe: boots the standalone on :3208 against a THROWAWAY copy of `db/custom.db` (zero dev-DB writes), then wire-verifies every flow-step assumption BEFORE the spec exists, all through the REAL UI on the copy: register run-unique (auto-login → /account); heart the coat as the SIGNED-IN user (button flips, NO wishlist cookie minted — the signed-in toggle never touches the jar); dbRead on the COPY: the user's wishlist holds EXACTLY 1 item (the coat); sign out (lands home); heart the coat as a GUEST (button flips; the cookie mints, 48-hex); dbRead: the guest row is real (userId null) with EXACTLY 1 item; login as the fresh user (?redirect=/wishlist honored); the merge completes — lands /wishlist with the coat in the grid (exactly one coat card); dbRead: the user's wishlist STILL holds EXACTLY 1 item for the coat (the dedupe union — no duplicate, no crash); the cookie CLEARED post-login; the guest row GONE by token; zero unexpected console errors | tooling | node script |
| 2 | `tests/e2e/wishlist.spec.ts` — NEW describe "guest wishlist merge dedupe half (F-GG, session-36)", ONE case, fresh logged-out context, the register→heart-as-user→sign-out→guest-heart→login journey per §4, with the spec header documenting the uncovered-row census, the limiter arithmetic (register 8 < 10; the fresh email's login key 1 of 10), the Set-read-side masking note (why the dbRead count is load-bearing), and the H-24 posture | E2E | playwright |
| 3 | Mutation demo (surgical, inverse-restore — traps #37/#39): replace the per-item `upsert` with an unconditional `create` (the dedupe dropped — the exact P2002 regression shape) → REBUILD (trap #16) → exactly the 2 F-GG case-runs fail (the login step breaks — the merge's UNIQUE violation propagates; the F-EE case stays green: its flow takes the CREATE branch, no overlap) → restore via inverse edit, `rg`-verify the upsert restored, rebuild | process | playwright |
| 4 | Round-31b census — MUST be byte-stable vs the 31a ledger (test-only round; the verdict closes the rest-invariance claim); `--shots` refreshes the screenshot set | parity | sweep tool (--shots) |
| 5 | Final gates on the final tree: typecheck → lint → unit → build → full E2E | gates | npm run verify + test:e2e |
| 6 | Docs alignment: README (badge 173+260, the Wishlist row gains the dedupe pin, testing/status rows 131), CLAUDE.md (gate line 131 + the F-GG gate in the chain + a NEW F-GG testing bullet), PAD (test table 18\|131\|260, §7.1 session-36 paragraph), SKILL v1.29.0 (frontmatter version/project_state, §2 E2E row + F-GG, Appendix B NEW session-36 row), AGENTS.md (the security line gains the F-GG gate), this file's execution record, worklog, `docs/session_41.md` (the round's narration log — session_40.md taken by the parallel thread) | docs | stale-count sweep |

### Count ledger (expected post-remediation)

| Metric | Before | After |
|---|---|---|
| unit files / tests | 19 / 173 | 19 / 173 (no new pure seam — the finding is a page-level merge flow already exercised at the action layer; the dedupe branch is tx-internal) |
| E2E spec files | 18 | 18 (the describe lands INSIDE wishlist.spec.ts) |
| unique E2E cases | 130 | 131 (+1 F-GG) |
| E2E result | 258 passed + 2 skipped | 260 passed + 2 skipped (131 × 2 − 2 desktop-only skips; the +2 setup projects pass outside the case-run summary, the established convention) |

## 6. Validation of this plan against the codebase (pre-execution)

- `scripts/plan-probe-session36.cjs` runs FIRST (the session-29…35
  plan-probe discipline): the probe's checks wire-verify every
  flow-step assumption before the spec exists (see §7 #1 for the
  executed results).
- The register door auto-logs-in: `registerAction` calls
  `createSession(user.id)` then `redirect("/account")`
  (`src/lib/actions/auth.ts:96-124`) — the pre-load heart runs on a real
  session with ZERO additional logins.
- The signed-in toggle never mints the wishlist cookie:
  `getOrCreateWishlist(userId)` returns on the `userId` branch BEFORE the
  cookie store is touched (`src/lib/cart.ts:122-129`) — the guest cookie
  that reaches the login door is minted ONLY by the post-sign-out guest
  toggle, so the merge sees exactly one clean guest list.
- `logoutAction` carries NO rate limiter (`src/lib/actions/auth.ts:132-135`)
  — the two sign-outs are budget-free.
- The login limiter keys on `login:${ip}:${email}` (10 per 15min) — the
  fresh run-unique email's key starts empty; 1 of 10 consumed.
- The register limiter keys on `register:${ip}` (10 per 15min, the shared
  "local" bucket): F-EE's measured arithmetic was "4 existing + 1/project
  = 6 < 10"; F-GG adds 1/project → 8 < 10.
- `logoutAction` redirects to `/` (the F-EE case asserts `toHaveURL(/\/$/)`)
  — mirrored.
- The PDP wishlist CTA: `page.locator("main").getByRole("button", { name:
  /wishlist/i })` with the normalize-first pattern (the suite shares one
  DB) — the F-EE case's exact shape, mirrored for both toggles.
- The wishlist grid: `[data-testid="wishlist-grid"]` with ProductCard
  anchors (`a[href*="cashmere-overcoat"]`); the EMPTY state renders
  "Nothing saved yet" — the grid assertion doubles as the merge-landed
  witness.
- The not-yet-asserted shapes the probe must confirm: the coat's DB id is
  resolved at runtime by slug (never hardcode cuids — global-setup
  re-seeds fresh cuids every run); the dbRead helpers run against the
  COPY in the probe and against the E2E DB in the spec (the F-EE helper
  shape, `db/e2e.db`).
- No schema/env/seed changes; money untouched; no revalidatePath surface;
  `.env.example` unchanged; no src/ change (the mutation demo's temporary
  edit is restored and verified).
- The census measures the home page only — a test-only round cannot drift
  it; the ritual still runs as the verdict (trap #40's discipline).
- `docs/session_40.md` exists (the parallel thread's duplicate log) — the
  round's own narration log ships as `docs/session_41.md` (the next free
  slot; the convention's +1 lands on a taken name, same shape as sessions
  33/34/35).

## 7. Execution record

| # | Task | Result |
|---|---|---|
| 1 | plan-probe | ✅ `scripts/plan-probe-session36.cjs` — **13/13 checks passed**: the copy boot + health; the run-unique register through the REAL UI on the copy (lands /account); the signed-in coat toggle flips and mints NO wishlist cookie; the user's wishlist holds EXACTLY 1 item (the coat) on the copy; the sign-out lands home; the guest coat toggle flips and mints the 48-hex cookie; the guest row is real (userId null) with EXACTLY 1 item; the login lands /wishlist (?redirect honored); the coat card renders EXACTLY once in the grid (2 anchors per card — image + name); the user's wishlist STILL holds EXACTLY 1 item for the coat (the dedupe union — no duplicate, no crash); the cookie CLEARED post-login; the guest row GONE by token; zero console errors; the copy deleted — every flow-step assumption verified BEFORE the spec was written, against a throwaway DB copy (zero dev-DB writes). One probe-harness fix en route (not a product failure): the first run scored 12/13 (plus one navigation timeout) — the probe tried clicking "Sign out" from the PDP, but the control lives in the account tabs (account-tabs.tsx) rendered ONLY on /account; the flow now returns to /account before signing out → 13/13 |
| 2 | wishlist.spec.ts describe | ✅ NEW describe "guest wishlist merge dedupe half (F-GG, session-36)" — ONE case, fresh logged-out context, the register → signed-in heart → sign-out → guest heart → login journey per §4 with the dbRead server-truth count as the load-bearing assertion; the spec header documents the uncovered-row census + the limiter arithmetic + the Set-read-side masking note + the H-24 posture; typecheck ✓; GREEN **10 passed** (3 existing unique incl. the F-EE merge case + 1 F-GG unique) × 2 + 2 setups outside the summary (28.9s) |
| 3 | Mutation demo | ✅ the dedupe dropped (the per-item upsert replaced with an unconditional `create` — the exact P2002 regression shape) → REBUILD → **exactly the 2 F-GG case-runs failed** (the webServer log shows `P2002: Unique constraint failed on the fields: (wishlistId, productId)` thrown inside the merge and propagating through the auth seam; the case breaks at the login step — the /wishlist redirect never lands; the F-EE merge case + all existing cases stay green: their flows take the CREATE branch, no overlap — the gap's exact shape) → restored via inverse edit (`git diff` on src/ empty; rg-verified the upsert's `update: {}` back in place) → rebuild → 10/10 green |
| 4 | Round-31b census (--shots) | ✅ ZERO DRIFT — byte-identical to 31a in ALL census fields (37th/38th consecutive): mainKids 11 both sides both viewports; pageH 11079/11085 + 11257/11264; footers 444/1189; drawer objects char-identical (the v4 mobile-nav pin holds); ref console = the documented 2× 401 residue; clone console clean — the test-only round proven rest-invisible by measurement; 9 screenshots refreshed (live-variance pattern) |
| 5 | Final gates on the final tree | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **260 passed + 2 skipped** (131 unique × 2 − 2 desktop-only skips; the +2 setup projects pass outside the case-run summary; 5.3m) — the TWENTY-EIGHTH consecutive fully-green session, exactly the §5 count ledger (130→131 unique, 258→260 passed) |
| 6 | Docs alignment + stale-count sweep | ✅ README (badge 173+260, the Wishlist row + the dedupe pin, testing/status rows 131); CLAUDE.md (gate line 131, the F-GG gate in the chain, NEW F-GG testing bullet); PAD (test table 18\|131\|260, §7.1 session-36 paragraph); SKILL v1.29.0 (frontmatter, §2 E2E row + F-GG, Appendix B NEW session-36 row); AGENTS.md (the security line gains the F-GG gate); docs/remediation-plan-session36.md (this record); worklog; docs/session_41.md (the round's narration log — session_40.md taken). Stale-count sweep: zero stale counts |

## 8. Residual risks / next steps (post-F-GG)

1. The merge's transaction-atomicity half (H-29) stays pinned by
   source-read only — wire fault-injection into a SQLite tx is not
   reachable from Playwright (the same posture as the cart merge's
   transaction pin; the deliberate-failure shapes are carried).
2. The success gate's foreign-owner row (a signed-in user fetching a
   DIFFERENT non-null userId's order) stays covered-by-shape — the `===`
   false branch is exercised by the null-mismatch row and the operator has
   no null special-case; a pin would need an SQL-minted second-user order
   (fixture machinery for an identical comparison cell).
3. The search 503 / health `db:false` deliberate-failure shapes stay
   pinned by source-read + success-path only (carried, session-32 §8 #1).
4. `/api/search`'s 429 path unpinned by design (carried; a future
   limiter-reset harness would relax the budget for every 429-shaped pin).
5. The PDP og:image annotation / og:type union / `style-src
   'unsafe-inline'` exceptions (carried, sessions 26–35).
6. Real PSP behind the checkout seam (carried).
7. Dev-toolchain npm-audit findings (11, all dev-only) — carried.
8. G-3 POSIX-only sweep paths (carried).
9. The action-seam gate couples to the standalone manifest shape — fails
   loud at the canary by design (carried).
10. The zero-drift streak is a streak, not a guarantee — the two-census
    ritual stays mandatory. Eleven stable rounds since the round-21 move.
11. security.txt `Expires` (2027-11-01) renewal cadence (carried).
12. The canonical convention delta / `/shop` og:url convention (carried,
    session-26).
13. The sweep tool inherits the shell's `AUTH_SECRET` (carried; this round
    ran it with the inline dev secret — the documented workaround).
14. `NewsletterSubscriber` stays outside global-setup's wipe list
    (carried).
15. HSTS on http://localhost inert by construction (carried).
16. The admin action's EVENT-WRITE path stays unpinned at the action layer
    (carried, session-33 §8 #16 — needs an admin login or a server-action
    POST).
17. The F-BB spec comment's limiter arithmetic undercount stays as-is
    (carried, session-34 §8 #18 — a comment is not a gate).
18. `docs/session_40.md` is a parallel thread's narration of the
    session-35 round — retained as-is (never overwrite another thread's
    log); the round's own narration ships as `docs/session_41.md`.
19. The register bucket's headroom is now 8 < 10 — ONE more register-per-
    project case fits before the shared "local" bucket saturates; any
    future auth-flow pin should prefer a NO-REGISTER shape (a canonical
    account through a door that doesn't consume, or server-side session
    seeding in the spec's own project storageState).
