# Remediation Plan — Session 34 (AURELIA / VELOUR clone)

> **Status:** PLANNED → EXECUTED this round (the session-33 continuation, named
> for the next session number per the standing precedent).
> **Mode:** Verify-first (Mode C) → reconciliation of the pulled remote
> (`1644c75` the session-33 F-DD round + `c8f0679` its parallel thread's
> session log `docs/session_36.md` — docs-only, zero code) → first-hand
> audit → live-reference parity sweep round 29 → fresh audit pass → one
> gate-coverage remediation (**F-EE**). **Scope:** the session-33 commit
> audited TRUE first-hand (the F-DD spec verified in full source AND re-run
> green on the fresh build: **6 passed** = 2 unique × 2 + 2 setup); **`c8f0679`
> audited docs-only** (one file, +61 — `docs/session_36.md`, a parallel
> thread's narration of the SAME session-33 round); **the round-29a census
> measured ZERO DRIFT** (33rd/34th consecutive clone-side sweeps — the
> reference byte-stable against the round-24 ledger, mainKids 11 both sides
> both viewports, pageH 11079/11085 + 11257/11264, footers 444/1189, drawer
> char-identical `w-80` + `flex flex-col gap-5`, gaps [20,20,20,20] — the v4
> mobile-nav pin holds, the standing task re-check; ref console = the
> documented 2× 401 residue, clone clean); **the fresh pass closed the
> session-33 plan's §8 #2 documented candidate** — the guest wishlist merge
> (`mergeGuestWishlistIntoUser`, `src/lib/cart.ts:202`) is a **zero-coverage
> seam** (both layers: `rg "mergeGuestWishlist" tests/` → NOTHING; no unit
> file references it; no spec loads it) invoked at BOTH auth doors
> (`loginAction` auth.ts:45 and `registerAction` auth.ts:124) while its
> sibling cart merge IS wire-pinned (the `guest cart merge at login`
> describe). **F-EE**, LOW gate-coverage, zero product defect (the merge
> serves correctly today — verified first-hand by this round's plan probe).
> Same family as F-Y/F-AA/F-BB/F-CC/F-DD: a declared contract the gates
> never exercise — declared here in the seam's own source comments (H-29:
> the per-item upserts run in ONE transaction; G-5: the cookie is cleared
> only AFTER the merge committed — "the cookie is the browser's only
> reference to the guest list").

---

## 1. Starting state

WARM workspace fast-forwarded `1644c75..c8f0679` (the pull brought ONLY
`docs/session_36.md` — a parallel thread's narration of the session-33
round; docs-only). **SIX sandbox reset incidents this round** (the recurring
reset set, fully recovered):

| Step | Result |
|---|---|
| `git pull` | ✓ fast-forward to `c8f0679` (docs/session_36.md only); `skills/` restored 283 entries after a prune; stray `bun.lock` deleted |
| `.env` | ✗ rewritten to the absolute single-line shape → re-pinned to the canonical 3-line contract (DATABASE_URL contract URL + generated dev AUTH_SECRET + site URL) |
| `bin/ssh` shim + paramiko | ✗ wiped → shim rebuilt (venv shebang) + paramiko 5.0.0 reinstalled into `/home/z/.venv` |
| Playwright cache | ✗ chromium-1248 absent (only v1200 present vs the pinned @playwright/test 1.64.1's v1248 — the session-25/24 class) → `npx playwright install chromium` |
| `db/custom.db` | ✗ EMPTY (zero rows — the session-22 class, caught by direct Prisma count) → `npm run db:setup` re-materialized canonical 4/12/2/4 (+8 OrderEvents; ORD-2026-004 userId:null verified) |
| `core.fileMode false` | ✓ survived |

**Baseline gates on the committed tree (TWENTY-SIXTH consecutive session
fully green at baseline):** typecheck ✓ · lint ✓ · **173/173 unit (19
files)** ✓ · build + assemble ✓ (E2E runs at the final gate).

## 2. Audit of `1644c75` (session-33) and `c8f0679` (the log commit) — first-hand

`1644c75` composition (14 files): the NEW `tests/e2e/account-orders.spec.ts`
(149 lines, 2 cases), the NEW `scripts/plan-probe-session33.cjs` (168
lines, 17 checks), the plan (314 lines), 4 screenshot re-captures,
README/CLAUDE/PAD/AGENTS/SKILL v1.26.0 alignment, worklog,
`docs/session_35.md`. Claims verified against the final tree:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | The F-DD spec pins both contracts (the F-16 privacy filter + the owner IDOR gate) with ZERO logins | `tests/e2e/account-orders.spec.ts` read in full: two cases riding james's per-project storageState; case 1 dbRead-resolves ORD-2026-002's id at runtime, sqlRun-mints an `actor:'admin'` OrderEvent (the model default is "system" so the INSERT sets actor explicitly), asserts 200 + order identity + "Order Progress" + the system events visible ("status changed", "tracking added" — case-insensitive DOM regexes per trap #38) + the note ABSENT from the served body, self-cleans in a try/finally (H-24); case 2 opens the canonical guest ORD-2026-004 → 404 + "Page Not Found" + no existence leak; both helpers spawnSync args-arrays (trap #34) | TRUE |
| 2 | The account-orders gate is GREEN on the fresh build | `npx playwright test tests/e2e/account-orders.spec.ts` re-run: **6 passed** (2 unique × 2 + 2 setup; 16.0s) | TRUE |
| 3 | The plan-probe artifact exists and matches its contract | `scripts/plan-probe-session33.cjs` present (168 lines); the throwaway-DB-copy harness + james's real-UI login on the copy | TRUE |
| 4 | Docs aligned (SKILL v1.26.0 frontmatter 128+254+2; README badge 173+254; CLAUDE gate line 128 + the F-DD gate in the chain; PAD 18\|128\|254; AGENTS the F-DD gate) | all five docs re-read this round; counts consistent | TRUE |
| 5 | No production change (test-only round) | `git show 1644c75 --stat`: zero `src/` files (tests/docs/screenshots/scripts/worklog only — the mutation demo restored) | TRUE |

`c8f0679` composition (1 file): `docs/session_36.md` (+61) — a parallel
thread's narration of the SAME session-33 round (its opening line resumes
the session-33 task book; its ledger matches `1644c75`'s actual diff: same
F-DD shape, same counts, same probe name, the same push verification).
**Verdict: session-33 5/5 claims TRUE; `c8f0679` docs-only, zero
repo-state impact beyond the log itself.**

## 3. Live reference sweep — round 29a (measured 2026-10-17): ZERO DRIFT

The single-census pre-remediation pass (the 29b `--shots` pass closes the
ritual after the test-only round). The reference is byte-stable against the
round-24 ledger — **33rd/34th consecutive clone-side sweeps**:

| Ledger field | Round-24…28 ledger | Round-29a measured | Verdict |
|---|---|---|---|
| ref desktop pageH / mainKids | 11079 / 11 | 11079 / 11 | byte-stable |
| clone desktop pageH | 11085 | 11085 | byte-stable |
| ref mobile pageH / mainKids | 11257 / 11 | 11257 / 11 | byte-stable |
| clone mobile pageH | 11264 | 11264 | byte-stable |
| footers | 444 / 1189 | 444 / 1189 | byte-stable |
| drawer panelCls/navCls | char-identical | identical | byte-stable — **the mobile-nav v4 pin holds** (`w-80` + `flex flex-col gap-5`, gaps [20,20,20,20]; the standing task re-check) |
| clone console | clean | clean | byte-stable |
| ref console | the documented 2× 401 residue | identical | documented residue |

Nine stable sweeps since the round-21 move.

## 4. Fresh audit pass — finding (the round's target)

The session-33 plan's §8 #2 documented candidate, verified first-hand:
`rg "mergeGuestWishlist" tests/` → NOTHING; `rg "wishlist" tests/unit/` →
no merge reference; the sibling cart merge IS wire-pinned
(`tests/e2e/cart-checkout.spec.ts:254` "guest bag survives sign-in
(mergeGuestCartIntoUser)"). The seam is invoked at BOTH auth doors
(auth.ts:45 login, auth.ts:124 register) and carries source-declared
contracts (H-29 one-transaction merge; G-5 cookie cleared only after the
work; the dedupe union via `wishlistId_productId` upsert; the guest row
deleted; the re-login/foreign-row no-op guard `guestList.userId === userId
→ return`). A broken merge would silently drop a guest's saved pieces at
the exact moment they become a member — the conversion moment the wishlist
exists for. Competing leads verified and dismissed first-hand:

- **The `/checkout/success` signed-in-OWNER positive path** (`isOwner`) —
  NARROWED further this round: the COD/card placement cases reach the
  success page ONLY as the redirect target and assert its content (order
  number visible), so a dropped `isOwner` would fail those cases (the
  branch has INCIDENTAL wire coverage; what stays unpinned is a DIRECT
  owner-capability assertion — a matrix-row-shaped pin, not a zero-coverage
  seam). Documented residual; weaker than F-EE.
- **The `/api/search` 429 path** — carried (a future limiter-reset harness
  would relax the budget for every 429-shaped pin; tooling, not a seam).
- **The admin action's event-write path** — carried (needs an admin login —
  the exactly-consumed bucket — or a server-action POST; the action-seam
  gate's territory).

1. **F-EE — the guest wishlist merge at login is a zero-coverage seam.**
   Severity: LOW (gate-coverage gap; the merge works today — the plan probe
   wire-verified every contract assumption first-hand). Remediation: a NEW
   describe in `tests/e2e/wishlist.spec.ts` (the OWNING spec — the wishlist
   surface's spec hosts the guest-toggle fixture the pin reuses; the F-Z
   precedent of landing inside the spec whose surface the pin exercises).

### The login-budget discovery (the honest-gate decision that shaped the design)

The round's fresh audit ALSO surfaced a load-bearing constraint the docs
never recorded: **the james login bucket is EXACTLY consumed** — the
limiter consumes on CALL (`rateLimit()` increments before verification, so
the wrong-password case counts), the IP is the constant "local" without
TRUST_PROXY (both projects share one bucket), and the per-run james login
arithmetic is 2 (setup) + 2 (cart-merge) + 2 (wrong-password) + 2 (logout
throwaway) + 2 (security-csp session-cookie) = **10 of 10**. The F-BB
comment's "6 < 10" arithmetic undercounted (it predates none of those —
it simply never counted the cart-merge + wrong-password logins). Any NEW
james login through the real form would 429 mid-run (the SKILL §9 #23
doctrine, now measured for the customer bucket too).

**Design consequence — the pin enters through the register door with a
fresh user, then closes the login door in the SAME case:**

1. Fresh logged-out context; register a run-unique account
   (`e2e-merge-<rand>@example.com`) with NO guest cookie → the register
   merge no-ops (`if (!token) return`) and the fresh user's wishlist is
   empty (register bucket: 4 existing + 1 × 2 projects = 6 < 10).
2. Sign out (the account page's Sign out control — the auth.spec shape).
3. As a guest again: toggle the PDP heart on `wide-brim-felt-hat` (a
   product NO other spec hearts — the cart merge uses it for CART state
   only) → the guest wishlist cookie + row mint.
4. Capture the guest token from `context.cookies()`; dbRead-verify the
   guest Wishlist row EXISTS with `userId: null` (server truth).
5. Log in as the fresh user through the real form
   (`/login?redirect=/wishlist`) → `loginAction` →
   `mergeGuestWishlistIntoUser` runs at the LOGIN door with the guest
   cookie present. The fresh user's email is a FRESH limiter key
   (`login:local:<fresh-email>` — 1 of 10 used; james's bucket untouched).
6. Assert the merged state: /wishlist shows the felt hat; a reload keeps
   it (server truth — the merge wrote real rows).
7. Assert the G-5 visible half: `aurelia_wishlist` ABSENT from
   `context.cookies()` post-login (cleared only after the work — on the
   success path the cookie is always gone).
8. Assert the cleanup half: dbRead by the captured token → the guest
   Wishlist row GONE (deleted by the merge).
9. H-24: nothing to clean — the fresh user's rows are run-scoped (a fresh
   email every run; global-setup wipes wishlists at every run start
   anyway); james's and admin's canonical state untouched.

**Honest-gate decisions (run before planning):**

- **F-EE adds gate coverage; it changes no product behavior.** The served
  DOM is untouched; the parity census cannot drift (test-only round).
- **No gate is weakened.** No existing spec/case is modified; the new
  describe lives inside the existing `wishlist.spec.ts` (no playwright
  config edit); no new npm dependencies; `.env.example` unchanged; money
  untouched.
- **james's login bucket stays EXACTLY consumed (10/10); admin's stays
  exactly consumed.** The case's register costs 1/project on the register
  bucket (4 existing + 2 = 6 < 10); the case's login costs 1/project on a
  FRESH per-email key (the fresh user's own 10-slot bucket, 1 used).
- **Dedupe half:** the fresh user's list is EMPTY at login, so the merge's
  create half is what the wire case exercises deterministically; the
  upsert's `update: {}` dedupe half stays covered-by-shape (the same
  posture the cart-merge pin takes — its dedupe half is equally
  unpinned).
- **The register-door no-op** (step 1) doubles as the no-guest-cookie
  guard's only wire exercise (`if (!token) return`).
- **`wide-brim-felt-hat`** is the distinctive product: hearted by NO other
  spec (verified: the only other references are the cart merge + the
  sold-out guard, both cart-state).

## 5. Remediation design (TDD)

### ToDo

| # | Task | Layer | Gate |
|---|---|---|---|
| 1 | `scripts/plan-probe-session34.cjs` — NEW probe: boots the standalone on :3207 against a THROWAWAY copy of `db/custom.db` (zero dev-DB writes), then wire-verifies the FULL case flow BEFORE the spec is written: register → sign-out → guest heart toggle (cookie mints, 192-bit hex shape) → the guest row EXISTS (userId null, by captured token) → login-as-fresh-user → /wishlist shows the felt hat (reload persists) → the cookie is CLEARED → the guest row is GONE → the user's list holds the item (Prisma join, server truth beyond the DOM) → zero console errors | tooling | node script |
| 2 | `tests/e2e/wishlist.spec.ts` — NEW describe "guest wishlist merge (F-EE, session-34)", ONE case (both doors ride one narrative — a dropped merge call fails exactly its case; a dropped cookie-clear fails exactly its assertion): the full flow per §4, with the spec header documenting the limiter arithmetic (register 6 < 10; the fresh-email login key 1/10; james + admin buckets stay EXACTLY consumed) and the H-24 posture (nothing to clean — run-scoped rows only) | E2E | playwright |
| 3 | Mutation demo (surgical, inverse-restore — traps #37/#39): drop the `mergeGuestWishlistIntoUser` call from `loginAction` (auth.ts:45) → REBUILD (trap #16) → exactly the F-EE case fails (2 projects) → restore via inverse edit, `rg`-verify the call restored, rebuild | process | playwright |
| 4 | Round-29b census — MUST be byte-stable vs the 29a ledger (test-only round; the verdict closes the rest-invariance claim); `--shots` refreshes the screenshot set | parity | sweep tool (--shots) |
| 5 | Final gates on the final tree: typecheck → lint → unit → build → full E2E | gates | npm run verify + test:e2e |
| 6 | Docs alignment: README (badge 173+256, the Wishlist row gains the merge pin, testing/status rows 129), CLAUDE.md (gate line 129 + the F-EE gate in the chain + the merge named beside the cart merge), PAD (test table 18\|129\|256, §7.1 session-34 paragraph), SKILL v1.27.0 (frontmatter version/project_state, §2 E2E row + F-EE, §9 the james-bucket measurement beside #23, Appendix B NEW session-34 row), AGENTS.md (the security line gains the F-EE gate), this file's execution record, worklog, `docs/session_37.md` (the round's narration log — session_36.md taken by the parallel thread) | docs | stale-count sweep |

### Count ledger (expected post-remediation)

| Metric | Before | After |
|---|---|---|
| unit files / tests | 19 / 173 | 19 / 173 (no new pure seam — the finding is wire-layer; the merge is a server-only cookies() seam, matching the cart merge's wire-only precedent) |
| E2E spec files | 18 | 18 (the describe lands INSIDE wishlist.spec.ts) |
| unique E2E cases | 128 | 129 (+1 F-EE) |
| E2E result | 254 passed + 2 skipped | 256 passed + 2 skipped (129 × 2 − 2 desktop-only skips; the +2 setup projects pass outside the case-run summary, the established convention) |

## 6. Validation of this plan against the codebase (pre-execution)

- `scripts/plan-probe-session34.cjs` runs FIRST (the session-29…33
  plan-probe discipline): the probe's checks wire-verify every assumption
  before the spec exists (see §7 #1 for the executed results).
- The register form's field ids are stable (`#confirmName`, `#email`,
  `#password`, `#confirmPassword` — `src/components/account/auth-form.tsx`;
  the submit button matches `/create account/i`; the login form's
  `/sign in/i`); the account page's Sign out button matches
  `/^Sign out$/` (account-tabs.tsx:100).
- The PDP wishlist CTA is always visible (the card hearts are
  hover-revealed — the established scoping: `page.locator("main")` +
  `/wishlist/i`, normalize to "Add to Wishlist" first — the suite shares
  one DB and the felt hat is never hearted by other specs, but the
  normalize-first guard costs nothing and removes the order assumption).
- The merge's observable halves are all wire-visible: the merged item on
  /wishlist (the grid renders `ProductCard`s for active products ordered
  by sortOrder), the reload persistence (server rows), the cookie absence
  (`context.cookies()` — the cleared cookie leaves the jar), the guest-row
  deletion (dbRead by the captured token).
- The guest cookie's value shape is the declared 192-bit hex (the F-BB pin
  asserts it on minting — the probe re-uses the shape check as a
  sanity gate on the captured token).
- The limiter arithmetic: `rateLimit()` consumes on call; `clientIpFrom`
  returns "local" without TRUST_PROXY (one shared IP bucket per key
  family); james's login key is exactly consumed at 10/10 per run (2
  setup + 2 cart-merge + 2 wrong-password + 2 logout-throwaway + 2 csp);
  the register key is per-IP (4 existing + 2 = 6 < 10); the fresh user's
  login key is per-EMAIL (1 of 10 used). The case NEVER logs james or
  admin in.
- No schema/env/seed changes; money untouched; no revalidatePath surface;
  `.env.example` unchanged; no src/ change (the mutation demo's temporary
  edit is restored and verified).
- The census measures the home page only — a test-only round cannot drift
  it; the ritual still runs as the verdict (trap #40's discipline).
- `docs/session_36.md` exists (the parallel thread's duplicate log) — the
  round's own narration log ships as `docs/session_37.md` (the next free
  slot; the convention's +1 lands on a taken name this round, same shape
  as session-33's round).

## 7. Execution record

| # | Task | Result |
|---|---|---|
| 1 | plan-probe | ✅ `scripts/plan-probe-session34.cjs` — **16/16 checks passed**: the copy boot + health; james canonical on the copy (3 orders — the seed gives james ORD-001/002/003, the "4" of 4/12/2/4 is the TABLE count; 0 wishlist items); the register (fresh email, lands /account — the no-guest-cookie merge no-op); the sign-out (back to the storefront); the guest heart toggle (the PDP CTA flips to "In Wishlist"); the cookie mints with the declared 192-bit hex shape; the guest row EXISTS via Prisma on the copy (userId null, holding the felt hat); the login-as-fresh-user through the real form (?redirect=/wishlist honored — pathname predicate, the first draft's `/wishlist/` regex matched the QUERY string on the pre-navigation /login URL: probe fixed, not the product); /wishlist renders the felt hat; the reload persists it (server truth); the cookie is CLEARED from the jar; the guest row is GONE by the captured token; the user's list holds the item (Prisma wishlistItem join — truth beyond the DOM); james untouched; zero console errors — every contract assumption verified BEFORE the spec was written, against a throwaway DB copy (zero dev-DB writes) |
| 2 | wishlist.spec.ts describe | ✅ NEW describe "guest wishlist merge (F-EE, session-34)" — ONE case, fresh logged-out context, the full §4 flow (register → sign-out → guest toggle → capture token → dbRead the guest row exists → login-as-fresh-user → /wishlist shows the hat → reload persists → cookie cleared → guest row gone); the header documents the limiter arithmetic + the H-24 posture; typecheck ✓; GREEN **8 passed** (3 existing unique + 1 F-EE unique) × 2 + 2 setup |
| 3 | Mutation demo | ✅ the `mergeGuestWishlistIntoUser(user.id)` call dropped from `loginAction` (auth.ts:45) → REBUILD → **exactly the 2 F-EE case-runs failed** (6 others passed — both existing wishlist cases × 2 + both setups; the gap's exact shape) → restored via inverse edit (rg-verified the call back at :45; `git diff` on src/ empty) → rebuild → 8/8 green |
| 4 | Round-29b census (--shots) | ✅ ZERO DRIFT — byte-identical to 29a in ALL census fields (33rd/34th consecutive): mainKids 11 both sides both viewports; pageH 11079/11085 + 11257/11264; footers 444/1189; drawer objects char-identical (the v4 mobile-nav pin holds); ref console = the documented 2× 401 residue; clone console clean — the test-only round proven rest-invisible by measurement; screenshots refreshed (live-variance pattern) |
| 5 | Final gates on the final tree | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **256 passed + 2 skipped** (129 unique × 2 − 2 desktop-only skips; the +2 setup projects pass outside the case-run summary; ~5.4m) — the TWENTY-SIXTH consecutive fully-green session, exactly the §5 count ledger (128→129 unique, 254→256 passed) |
| 6 | Docs alignment + stale-count sweep | ✅ README (badge 173+256, the Wishlist row + the merge pin, testing/status rows 129); CLAUDE.md (gate line 129, the F-EE gate in the chain, the merge named beside the cart merge, the demo-accounts line unchanged); PAD (test table 18\|129\|256, §7.1 session-34 paragraph); SKILL v1.27.0 (frontmatter, §2 E2E row + F-EE, §9 #23 extended with the measured james-bucket arithmetic, Appendix B NEW session-34 row); AGENTS.md (the security line gains the F-EE gate); docs/remediation-plan-session34.md (this record); worklog; docs/session_37.md (the round's narration log — session_36.md taken by the parallel thread). Stale-count sweep: zero stale counts |

## 8. Residual risks / next steps (post-F-EE)

1. The `/checkout/success` signed-in-OWNER positive path (`isOwner`) — the
   placement-redirect cases give it INCIDENTAL wire coverage (a dropped
   branch would fail them); what stays unpinned is a DIRECT
   owner-capability matrix row (james direct-fetching his own order's
   success URL with no token → 200). Narrowest remaining checkout-seam
   residual (session-32 §8 #20, three rounds carried).
2. The merge's transaction-atomicity half (H-29) stays pinned by
   source-read only — wire fault-injection into a SQLite tx is not
   reachable from Playwright (the same posture as the cart merge's
   transaction pin; the deliberate-failure shapes are carried).
3. The merge's dedupe half (`update: {}`) stays covered-by-shape — the
   fresh-user design makes the create half deterministic; a dedupe pin
   would need a pre-loaded user list (an SQL fixture) + a second guest
   toggle — candidate for a future round if the auth-merge seam reopens.
4. The search 503 / health `db:false` deliberate-failure shapes stay
   pinned by source-read + success-path only (carried, session-32 §8 #1).
5. `/api/search`'s 429 path unpinned by design (carried; a future
   limiter-reset harness would relax the budget for every 429-shaped pin).
6. The PDP og:image annotation / og:type union / `style-src
   'unsafe-inline'` exceptions (carried, sessions 26–33).
7. Real PSP behind the checkout seam (carried).
8. Dev-toolchain npm-audit findings (11, all dev-only) — carried.
9. G-3 POSIX-only sweep paths (carried).
10. The action-seam gate couples to the standalone manifest shape — fails
    loud at the canary by design (carried).
11. The zero-drift streak is a streak, not a guarantee — the two-census
    ritual stays mandatory. Nine stable rounds since the round-21 move.
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
18. The F-BB spec comment's limiter arithmetic ("2 setup + 2 throwaway +
    2 = 6 < 10") undercounts the true per-run james logins (10 exactly
    with the cart-merge + wrong-password cases) — left as-is: a comment
    is not a gate, the runs pass, and this plan + SKILL §9 #23 now record
    the measured arithmetic. Fixing the comment would be a test-file edit
    with zero gate value (documented, not silently overwritten).
19. `docs/session_36.md` is a parallel thread's narration of the
    session-33 round — retained as-is (never overwrite another thread's
    log); the round's own narration ships as `docs/session_37.md`.
