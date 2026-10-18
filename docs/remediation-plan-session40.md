# Remediation Plan — Session 40 (F-KK: the logout's session-row revocation)

The session-39 continuation round. Per the standing precedent: audit the pulled
HEAD (`535a339` — the parallel thread's session-log commit), re-verify the
baseline, run the fresh audit pass over the residual candidates, then close
the strongest one with a TDD gate.

## 1. Starting state

- Fresh clone this round (the sandbox workspace had been reset — the
  fresh-clone recovery set re-run: `npm install`, the canonical 3-line `.env`
  with `DATABASE_URL="file:../db/custom.db"`, `npm run db:setup`
  materializing `db/custom.db` at the canonical 4/12/2/4, Playwright
  chromium-1248 reinstalled, the ssh shim + paramiko venv rebuilt for the
  push).
- HEAD `535a339` = remote `main` (session-48 log: the parallel thread's
  narration of the SAME session-39 round, +81 docs-only).
- The committed tree's contract: 173 unit (19 files) · 134 unique E2E × 2
  device projects − 2 desktop-only skips = **266 passed + 2 skipped** ·
  typecheck ✓ lint ✓ build ✓.

## 2. Audit of `535a339` (the pulled HEAD) — first-hand

`git show --stat 535a339` → 1 file, +81: `docs/session_48.md` only. Its
ledger matches `0726926`'s actual diff (session-39's test-only round: 21
files, +884/−18, zero `src/`, the F-JJ describe in `tests/e2e/auth.spec.ts`)
— docs-only, RETAINED (never overwrite another thread's log). This round's
narration ships as `docs/session_49.md`.

## 3. Baseline re-verification (fresh clone)

- typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build + assemble ✓
- E2E **266 passed + 2 skipped** (134 unique × 2; 5.8m) — the 35th
  consecutive session fully green at baseline, exactly matching the
  session-39 final gates.

## 4. Fresh audit pass — the round's finding

The standing residual list re-triaged first-hand. The session-39 plan §8
directive: "account.ts is now FULLY gated — look at other files' un-exercised
WRITE halves next." Systematic sweep of every mutation seam's write half
against its gate coverage:

| Seam | Write half | Gate | Verdict |
|---|---|---|---|
| `account.ts` — updateProfileAction | `db.user.update` | F-JJ (dbRead) | gated |
| `account.ts` — changePasswordAction | hash rotation + `db.session.deleteMany` | F-II (dbRead + offline scrypt) | gated |
| `account.ts` — address book | `db.address.*` | `account-addresses.spec.ts` | gated |
| `admin.ts` — adminUpdateOrderAction | order update + OrderEvent mints | F-HH (dbRead beyond baseline ids) | gated |
| `admin.ts` — adminUpdateProductAction | `db.product.update` (stock/isActive) | stock case: fresh PDP renders "Out of Stock" (read-through); visibility case: /shop hides (read-through) | gated (read-through) |
| `auth.ts` — login/register | session mint + user create | many specs | gated |
| `auth.ts` — **logoutAction → destroySession** | **`db.session.deleteMany` (src/lib/auth.ts:105)** + cookie clear | the logout case (auth.spec.ts:70) asserts URL `/` + `/account` → `/login` bounce | **UNGATED — the wire-blind silent class** |
| `cart.ts` / `checkout.ts` / `wishlist.ts` | cart/order/wishlist writes | cart-checkout/wishlist specs incl. F-CC/EE/FF/GG | gated |

**F-KK — `destroySession`'s row-revocation half (`src/lib/auth.ts:105`).**
The existing logout case asserts only what the wire can see: the redirect to
`/` and the post-logout `/account` → `/login` bounce. The bounce is driven
by the COOKIE clear alone — a dropped (or no-op'd) `db.session.deleteMany`
leaves every existing assertion green while the Session row LINGERS in the
DB with up to ~30 days of validity (the row only dies at its stored expiry
or the next sweeper boot pass).

Security bearing: the session table IS the denylist (ADR-006 — the header
comment in `src/lib/auth.ts` says so verbatim: "sessions are DB rows
(revocable — the session table IS the denylist)"). Logout is the user's
canonical "kill my session" action — the exact moment a user who suspects a
hijacked cookie reaches for. A cookie value stolen BEFORE the logout (the
same hijacker F-4's comment documents at the password seam, and F-II pinned
on the rotation) SURVIVES the user's logout: the browser-side cookie clear
does nothing to the copy in the attacker's jar, and the row it authenticates
against stays alive. LOW gate-coverage, zero product defect (the current
source is correct — the write exists at :105; nothing ever READS it back).

Exhaustive verification of the zero-coverage claim:
`rg "FROM .Session" tests/e2e/` → only the F-II hijack-mint, the a11y
admin-mint, and the F-HH admin-mint (all fixture MINTS, none reads the row
state after a logout); the existing logout case's assertions are
URL-only (auth.spec.ts:83-86).

## 5. Plan-probe discipline (run BEFORE the spec)

`scripts/plan-probe-session40.cjs` — a throwaway copy of `db/custom.db` +
the standalone on :3209 (the session-38/39 harness shape), **11/11 checks
passed**, wire-verifying every F-KK assumption:

1. the offline-minted Session row exists (INSERT…SELECT, james's id resolved
   by the DB itself);
2. the minted cookie + row render `/account` signed-in (the mint's WIRE
   VALIDITY — a fresh context carrying the cookie is indistinguishable from
   a logged-in james);
3. the account page mounts its tabs on the minted session (the Profile tab
   activates its Radix content);
4. the real Sign out control is visible on `/account`;
5. Sign out redirects to `/` (logoutAction's server redirect);
6. **the REVOKE half (LOAD-BEARING): the minted Session row is GONE after
   the logout** (server truth; the wire CANNOT see this);
7. the cookie-clear half: `/account` bounces to `/login` after the logout;
8. the `aurelia_session` cookie is cleared from the browser context;
9. james can log in again afterwards through the real form (no collateral
   damage to the login door);
10. the belt-and-braces afterAll DELETE is a no-op on the healthy logout;
11. zero unexpected console errors.

Zero dev-DB writes, zero e2e.db writes (the throwaway copy dies with the
probe).

## 6. Remediation design (TDD)

NEW describe **"logout row revocation (F-KK, session-40)"** at the END of
`tests/e2e/auth.spec.ts` (the OWNING spec — the logout surface's own; the
spec count stays 18; the file already hosts the F-II and F-JJ describes —
auth.ts's three mutation seams each own a gate in it now).

- **ZERO logins, ZERO registers, ZERO limiter consumption**
  (logoutAction carries no limiter — verified by source read:
  `logoutAction(): Promise<void> { await destroySession(); redirect("/"); }`;
  only login/register/newsletter/checkout are rate-limited). The
  exactly-consumed james/admin login buckets stay untouched.
- **The offline-mint pattern** (the F-II hijack / F-HH admin / a11y M-1
  family, second customer-side use): a random 256-bit token, the cookie
  minted as `token.hmac(token)` with the shared `E2E_AUTH_SECRET`
  (`tests/e2e/e2e-secrets.ts`), the Session row inserted via
  `prisma db execute` INSERT…SELECT with james's id resolved by the DB
  itself; the describe's `test.use` storageState carries ONLY the minted
  cookie — the project storageState (the setup session later specs need)
  is never ridden, never destroyed. The mint is a NO-REGISTER, NO-LOGIN
  shape: exactly the pattern the session-39 §8 #16 directive prefers.
- The case drives the REAL UI (the account-tabs form → `logoutAction`):
  `/account` renders signed-in on the minted session (the mint's wire
  validity — SUPPORTING), the Sign out button is clicked, the redirect
  lands on `/` (SUPPORTING), then asserts:
  - **LOAD-BEARING — the REVOKE half**: the minted Session row is GONE
    (server-truth dbRead; the wire CANNOT see this — the exact assertion
    the existing logout case cannot make);
  - SUPPORTING — the wire half: a fresh `/account` fetch bounces to
    `/login` (the cookie-clear half — re-asserted so the case is
    self-contained and so a BOTH-halves-dropped regression fails visibly
    too);
  - the cookie is gone from the context (`aurelia_session` absent).
- **Cleanup discipline (H-24)**: `afterAll` belt-and-braces DELETE of the
  minted row (a no-op on a healthy logout — probe check 10; runs even on
  mid-case failure); global-setup wipes the Session table wholesale at
  every run start anyway (H-22/H-25). Nothing run-scoped survives.
- **Count ledger**: 134 → 135 unique cases; 266 → 268 passed + 2 skipped.
  The F-KK case-runs green on BOTH device projects.

## 7. Mutation demo (the regression shape, proven RED)

Surgical mutation: drop the `db.session.deleteMany({ where: { token } })`
from `destroySession` (src/lib/auth.ts:105 — the exact row-lingering
regression shape: the cookie still clears, the bounce still happens, the
toast-less wire stays green, the row survives) → `npm run build` → the
existing logout case STAYS GREEN (the wire-blind gap's proof) → the F-KK
case-runs fail at the LOAD-BEARING row assertion (the row still present —
the dbRead server-truth witness) → restore via inverse edit (`git diff` on
`src/` empty; the deleteMany rg-verified at :105) → rebuild → 135 × 2
green.

## 8. Validation of this plan against the codebase (pre-execution)

- `destroySession`'s deleteMany read at `src/lib/auth.ts:105` — verified
  first-hand (this file, this session).
- The Sign out control: `src/components/account/account-tabs.tsx:95-100` —
  a `<form action={logoutAction}>` with a "Sign out" button — verified
  first-hand.
- `logoutAction` has no limiter — verified by source read
  (`src/lib/actions/auth.ts:132-135`).
- The 11/11 probe (§5) wire-verified every interaction the spec will drive,
  including the mint's validity, the row's disappearance, and the
  belt-and-braces cleanup's no-op shape.
- The F-II/F-JJ describes in the same file establish the helper shapes
  (dbRead/sqlRun, spawnSync ARGV arrays — trap #34) the new describe
  reuses.

## 9. Round-35 parity census (the standing ritual)

Two censuses on the final tree (35a with `--shots`, 35b re-run), both
viewports, against the LIVE reference (logged in with the task credentials
via agent-browser) — the 45th/46th consecutive sweep. Fields: desktop/mobile
pageH, mainKids, footers, the mobile drawer's panel/nav class strings + gap
array (the v4 `flex gap-5` pin), console residue. Plus the reference's
functional posture (nav buttons inert — the clone stays the functional
superset) and the clone's mobile-menu behavior verified end-to-end on the
dev server (burger → drawer → Women → `/shop?category=women` → menu closed
→ overflow restored → zero console errors). `rm -rf .next` before
`npm run dev` (the session-39 Fast-Refresh lesson).

## 10. Final gates + docs

- typecheck ✓ lint ✓ 173/173 unit ✓ build ✓ E2E **268 passed + 2 skipped**
  (135 unique × 2) — the 36th consecutive fully-green session.
- Screenshots refreshed (the sweep's 9 + the dev-server login set).
- Docs aligned: SKILL v1.33.0 (§2 E2E row + F-KK; §11 135; Appendix B NEW
  session-40 row), README, CLAUDE.md, PAD, AGENTS.md, this plan's execution
  record, worklog, `docs/session_49.md`; `.env.example` unchanged and
  matching the codebase; stale-count sweep zero.
- One main-branch commit pushed via the SSH wrapper v3
  (`--remote git@github.com:nordeim/luxury-fashion-store.git`).

## Execution record

| # | Task | Result |
|---|---|---|
| 1 | Plan probe | ✅ `scripts/plan-probe-session40.cjs` — **11/11 checks passed** on the throwaway DB copy + the standalone on :3209 (one probe-harness fix en route: the tabs-mount check needed the Profile tab's Radix activation click — the control the F-JJ pattern uses; the contract checks all passed first run). Zero dev-DB writes, zero e2e.db writes |
| 2 | auth.spec.ts describe | ✅ NEW describe "logout row revocation (F-KK, session-40)" at the END of `tests/e2e/auth.spec.ts` (after the F-JJ describe), ONE case on the describe-scoped minted-cookie storageState (`test.use`, the a11y M-1 shape's customer-side reuse — the project setup session never ridden): renders `/account` on the minted session (SUPPORTING — wire validity), clicks the REAL Sign out control, asserts the redirect to `/` (SUPPORTING), the server-truth dbRead — the minted row GONE (LOAD-BEARING), the fresh `/account` bounce to `/login` + the `aurelia_session` cookie cleared (SUPPORTING); beforeAll INSERT…SELECT mint + afterAll belt-and-braces DELETE; typecheck ✓ eslint ✓; GREEN **18 passed** (8 existing uniques + 1 F-KK unique) × 2 + 2 setups (42.4s; F-KK green on BOTH projects, 1.3s/1.4s) |
| 3 | Mutation demo | ✅ the `db.session.deleteMany` dropped from `destroySession` (the exact row-lingering regression shape: the cookie still clears, the bounce still happens) → REBUILD → **the existing logout case STAYED GREEN** (the wire-blind gap's proof — the bounce is driven by the cookie clear alone) while **exactly the 2 F-KK case-runs failed** (the failure landing at `expect(revoked).toBeNull()` — Received `{"id":"fkk-james-9a51eb…"}`, the dbRead server-truth witness, auth.spec.ts:568) → restored via inverse edit (git diff on src/ empty; the deleteMany rg-verified at :105) → rebuild → 18/18 green |
| 4 | Round-35 census + screenshots | ✅ **ZERO DRIFT — byte-identical to the round-34 ledger in ALL census fields (45th/46th consecutive sweep)**: desktop pageH 11079 (ref) / 11085 (clone), mobile 11257 / 11264, mainKids 11 BOTH sides both viewports, footers 444/1189, the drawer char-identical (panelCls `fixed left-0 top-0 h-full w-80 bg-background z-50 p-8 flex flex-col gap-6` + navCls `flex flex-col gap-5 mt-4`, 5 items, gaps [20,20,20,20]) — **the v4 mobile-nav pin holds** (the standing task re-check); ref console = the documented 2× 401 residue; clone console clean. The reference's functional posture re-confirmed first-hand through agent-browser (logged in with the task credentials): the WOMEN nav button is INERT (click → URL unchanged) — the clone stays the functional superset. The clone's mobile-menu behavior verified end-to-end on the dev server through real Playwright (`scripts/dev-hydration-probe-session38.cjs`, `rm -rf .next` first per the session-39 lesson): burger visible → drawer opens (dialog:1) → body overflow hidden → Women click → `/shop?category=women` → menu closed → overflow restored → zero console errors (one measurement note: the probe's first run read the URL inside the 800ms window while Turbopack cold-compiled `/shop` on first navigation — the warm re-run measured the navigation exactly; the drawer-close and overflow-restore held on both runs). **ONE harness lesson, first-hand**: the pre-dev `rm -rf .next` deletes the STANDALONE too — the round-35b sweep run afterwards failed fast at the tool's own `assertChildAlive` guard ("standalone server exited during boot… the health response came from a foreign process or the server crashed") and the stale `/tmp/sweep-results.json` from 35a masqueraded as results; rebuild FIRST, then re-run — 35b re-measured true ZERO DRIFT. Screenshots: 13 refreshed (the sweep's 9 + the dev-server login set via `scripts/dev-shots-session39.cjs`: clone-login, clone-cart, clone-account, clone-admin-dashboard, zero console errors; the dev cart's item rows cleaned after the shot — canonical 4/12/2/4 re-verified by direct Prisma count) |
| 5 | Final gates on the final tree | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **268 passed + 2 skipped** (135 unique × 2 − 2 desktop-only skips; the +2 setup projects pass outside the case-run summary; 5.9m) — the THIRTY-SIXTH consecutive fully-green session, exactly the §6 count ledger (134→135 unique, 266→268 passed); the F-KK case-runs green on BOTH projects |
| 6 | Docs alignment + stale-count sweep | ✅ README (badge 173+268, the Auth row + the logout pin, testing/architecture/status rows 135); CLAUDE.md (gate line 135 + the F-KK gate in the chain, NEW F-KK testing bullet, commands 135); PAD (test table 18\|135\|268, §7.3 command 135, the coverage-map session-40 extension); SKILL v1.33.0 (frontmatter 135+268+2, §2 E2E row + F-KK, §11 135, Appendix B NEW session-40 row); AGENTS.md (the security line gains the F-KK gate; the E2E command row 135); docs/remediation-plan-session40.md (this record); worklog; docs/session_49.md (the round's narration log — session_48.md taken by the pulled commit); scripts/plan-probe-session40.cjs (the probe artifact). Stale-count sweep: zero stale counts |

## 11. Residual risks / next steps (post-F-KK)

1. The merge's H-29 transaction-atomicity half stays source-read-only
   (wire fault-injection into a SQLite tx is not Playwright-reachable;
   carried).
2. The success gate's foreign-owner row stays covered-by-shape (carried).
3. `/api/search`'s 429 path unpinned by design (carried).
4. The search 503 / health `db:false` deliberate-failure shapes stay
   source-read-only (carried).
5. `auth.ts` is now fully gated (login/register/logout seams: the logout
   row-revocation was its last ungated write half). The next hunt: the
   remaining READ-side surfaces with no first-party owner spec, or
   tooling-harness candidates (the search-429 limiter-reset harness).
6. The register bucket stays 8 < 10 — keep preferring no-register shapes.
7. The PDP og:image annotation / og:type union / `style-src 'unsafe-inline'`
   exceptions (carried, sessions 26–40).
8. Real PSP behind the checkout seam (carried).
9. Dev-toolchain npm-audit findings (11, all dev-only) — carried.
10. `adminUpdateProductAction` mints no events by design
    (carried-by-shape; its write half is read-through gated).
11. The zero-drift streak is a streak, not a guarantee — the census ritual
    stays mandatory.
12. security.txt `Expires` (2027-11-01) renewal cadence (carried).
13. `NewsletterSubscriber` stays outside global-setup's wipe list (carried).
14. The sandbox kills detached process groups — long gates in the
    foreground (carried, honored again this round).
15. `rm -rf .next` before `npm run dev` after build-heavy rounds (the
    session-39 Fast-Refresh lesson, honored again this round).
