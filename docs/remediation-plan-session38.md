# Remediation Plan — Session 38 (AURELIA / VELOUR clone)

> **Status:** PLANNED → EXECUTED this round (the session-37 continuation,
> named for the next session number per the standing precedent).
> **Mode:** Verify-first (Mode C) → pulled `9bb8751` (fast-forward
> `3f1f27a..9bb8751` — docs-only: `docs/session_44.md`, the parallel
> thread's narration of the session-37 round) → docs-aligned baseline
> validation → fresh audit pass → one gate-coverage remediation (**F-II** —
> the password rotation's session-revocation contract, the F-4 security
> seam). **Scope:** HEAD `9bb8751` audited as the round's pulled state; the
> committed tree re-verified: typecheck ✓ lint ✓ **173/173 unit (19
> files)** ✓ build + assemble ✓ E2E **262 passed + 2 skipped** (5.5m) —
> the THIRTY-FIRST consecutive fully-green session; the plan-probe
> discipline ran BEFORE the spec (18/18 wire-verified checks on a
> throwaway DB copy — `scripts/plan-probe-session38.cjs`).

---

## 1. Starting state

Pulled `9bb8751` (fast-forward `3f1f27a..9bb8751` — the workspace survived
from the session-37 round; the pull brought ONLY `docs/session_44.md`, the
parallel thread's narration of the SAME session-37 round; local main =
remote main).

Sandbox/recovery incidents this round — **ZERO** (the warm workspace
survived; every reset-set item re-checked per the standing rule):

| Item | Result |
|---|---|
| node_modules | ✓ present |
| `skills/` tree | ✓ intact (git-tracked entries match origin) |
| stray `bun.lock` | ✓ none |
| Playwright chromium-1248 | ✓ cached |
| `bin/ssh` shim + venv paramiko | ✓ shim shebang `#!/home/z/.venv/bin/python3`, paramiko 5.0.0 |
| `.env` | ✓ canonical 3-line contract (`DATABASE_URL="file:../db/custom.db"`) |
| `db/custom.db` | ✓ canonical 4/12/2/4 (verified by direct Prisma count, `env -u DATABASE_URL`) |
| Background-process note | the sandbox kills detached process groups (both `nohup` attempts died after the setups) — E2E runs in the foreground (the established reliable path) |

**Baseline gates on the committed tree (THIRTY-FIRST consecutive session
fully green at baseline):** typecheck ✓ · lint ✓ · **173/173 unit (19
files)** ✓ · build + assemble ✓ · **E2E 262 passed + 2 skipped** (132
unique × 2 − 2 desktop-only skips; 5.5m).

**Task-brief environment contract re-verified:**
- `.env` → `DATABASE_URL="file:../db/custom.db"` — schema-relative,
  resolving to `<repoRoot>/db/custom.db`; the `db/` folder sits at the repo
  root — matches AGENTS.md, the ecommerce-store reference contract, and the
  task brief verbatim.
- `.env.example` re-read against the codebase: all four documented vars
  (`DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, `TRUST_PROXY`)
  with the same schema-relative URL and the H-35 proxy note — aligned.
- Vitest (`vitest.config.ts`) + Playwright (`playwright.config.ts`) configs
  present and green — the task brief's "add vitest and playwright test
  suite by modifying the respective config files" is already satisfied by
  the repo's existing, gate-verified configs; this round EXTENDS the E2E
  suite (one new case) rather than re-scaffolding it.

## 2. Audit of `9bb8751` (the pulled HEAD) — first-hand

`9bb8751` composition (1 file): `docs/session_44.md` (+95) — the
session-37 round's narration log from the parallel thread (its ledger
matches `3f1f27a`'s actual diff: same F-HH shape, same zero-drift census,
same 262+2 final gates, same push verification through the wrapper with
the `--remote` correction). **Verdict: docs-only, zero repo-state impact
beyond the log itself — RETAINED (never overwrite another thread's log);
this round's narration ships as `docs/session_45.md`.**

The session-37 round itself (`3f1f27a`) was audited via the worklog + plan
+ spec source: `git show --stat 3f1f27a` confirms the test-only shape (19
files, +712/−17, the only code-adjacent change `tests/e2e/admin.spec.ts`
+209; zero `src/` files), and the F-HH describe re-ran green as part of
this round's baseline E2E (its case-runs passed on both projects inside
the 262+2).

## 3. Fresh audit pass — finding (the round's target)

The standing residual list (session-37 plan §8) was re-triaged first-hand.
The strongest remaining candidate — verified by exhaustive search:

- `rg "changePassword|currentPassword|newPassword" tests/` → **NOTHING**.
  No spec anywhere drives the account Settings tab's password-change form.
  The auth.spec logout case only READS the profile form's prefilled value;
  the action-seam gate posts no account actions; the a11y gate renders the
  settings surface but asserts no mutation.

**F-II — `changePasswordAction`'s F-4 SESSION-REVOCATION contract**
(`src/lib/actions/account.ts:54-61`): the password rotation updates the
hash AND then revokes every OTHER session —

```ts
const keepToken = await currentSessionToken();
await db.session.deleteMany({
  where: { userId: user.id, ...(keepToken ? { token: { not: keepToken } } : {}) },
});
```

— keeping the caller's own session so the user isn't logged out mid-flow.
The F-4 comment (session-3) documents the exact regression class as having
SHIPPED before: *a hijacked session previously survived the change*. The
action works today (verified first-hand by this round's 18/18 probe), but
NO gate exercises the revocation: a dropped `db.session.deleteMany` (or an
over-broad one that also deletes the caller's token) leaves the toast
green ("Password changed.") while either the hijacked session SURVIVES the
rotation (the security half) or the caller is silently logged out (the
keep half) — with every gate green. This is the same toast-blind silent
class the F-HH round pinned on the admin seam, now on the
**security-critical** auth seam: the session table IS the denylist (ADR-006
— "sessions are DB rows (revocable)"), and the rotation is exactly the
moment that denylist gets exercised.

**Severity: LOW (gate-coverage gap; the action works today — proven by the
18/18 probe). The regression class is historically instantiated (F-4's own
comment) and security-bearing.**

Competing leads carried (same posture as session-37): the search-429
limiter-reset harness (tooling, not a seam), the merge's H-29
transaction-atomicity half (not wire-reachable), the success gate's
foreign-owner row (covered-by-shape — `===` has no null special-case), the
`updateProfileAction` write (the sibling seam — cosmetic class, no
security bearing, weaker candidate), the PDP og:image annotation
exceptions (carried, sessions 26–37).

### Honest-gate decisions (run before planning)

- **F-II adds gate coverage; it changes no product behavior.** The served
  DOM on resting surfaces is untouched; the parity census cannot drift
  (test-only round).
- **No gate is weakened.** No existing spec/case is modified — the new
  describe lands INSIDE `tests/e2e/auth.spec.ts` (the OWNING spec — the
  password rotation is an AUTH credential mutation and F-4 is the
  session/auth-domain contract; the auth surface's own spec, keeping the
  spec file count at 18); no playwright config edit; no new npm
  dependencies; `.env.example` unchanged; money untouched.
- **ZERO login consumption, ZERO register consumption.** The case rides
  the per-project storageState (james's setup session — the CURRENT
  session F-4 must keep) and mints the HIJACKED session OFFLINE (the a11y
  M-1/L-3 / F-HH pattern, first use for a CUSTOMER user): a random
  256-bit token, HMAC'd with the shared `E2E_AUTH_SECRET`, backed by a
  `Session` row inserted via `prisma db execute` INSERT…SELECT (james's id
  resolved by the DB itself), deleted in the finally/afterAll posture. The
  exactly-consumed login buckets (james 10/10, admin 10/10) stay
  untouched; the register bucket stays 8 < 10 — the F-HH no-register
  shape, exactly as the session-37 worklog prescribed.
- **The mutation rides the REAL form** (`/account` → Settings tab →
  current/new/confirm → Update Password) — no crafted POSTs; the SQL
  fixture mints only the SESSION row (the hijacked session) and the
  cleanup.
- **james is safe to mutate** (the round's user): the passwordHash is
  CAPTURED at case start (runtime value, never hardcoded — immune to any
  earlier spec's side effects) and RESTORED byte-identically in the
  finally; the rotation revokes only OTHER sessions — every later james
  login (cart-merge ×2, security-csp ×2, both AFTER auth.spec.ts
  alphabetically, workers:1 serial) sees the restored `Demo1234!`. The
  storageState session (the keepToken) SURVIVES by the F-4 contract itself
  — asserted, not assumed. The leftover setup session of the finished
  chromium project (mobile project's runtime) is dead state the revocation
  may lawfully clear (its project is complete; its storageState file is
  never re-read).
- **H-24: nothing canonical survives the run** — the minted hijacked row
  dies in the F-4 revocation itself (asserted) and is belt-and-braces
  deleted in the finally; the restored hash returns the seed byte-state;
  global-setup wipes Session wholesale at every run start (H-22/H-25).

## 4. Plan-probe discipline (run BEFORE the spec)

`scripts/plan-probe-session38.cjs` — a throwaway copy of `db/custom.db`
plus the standalone booted on :3209 against the copy: **18/18 checks
passed**, wire-verifying every assumption the spec depends on:

1. the real login lands /account (session A = the current session);
2. session A's cookie carries the `token.hmac` shape (48-hex token);
3. the offline-minted hijacked session row exists (the SQL mint for a
   CUSTOMER user — the a11y/F-HH pattern's first customer-side use);
4. **the hijacked session is VALID on the wire** (a context carrying its
   cookie renders /account signed-in — the mint shape proven end-to-end);
5. the pre-rotation session count = seed + login + mint;
6. the real form reports "Password changed.";
7. **F-4 REVOKE half: the hijacked session row is GONE** (server truth);
8. **F-4 KEEP half: session A's row is STILL present** (server truth);
9. the post-rotation count = pre-rotation − 1 (exactly the hijacked row —
   catches over-broad revocation too);
10. session A still renders /account signed-in after the rotation (wire);
11. **the offline scrypt verification (the `verifyPassword` replication,
    `s1$salt$hex` + scrypt keylen 64) verifies the NEW password**;
12. the stored hash NO LONGER verifies the old password;
13. the hash actually rotated (different bytes);
14. the hijacked cookie now bounces to /login (revoked wire-real);
15. the captured-hash UPDATE restore verifies the seed password again;
16. the restore is byte-identical to the captured hash;
17. no minted-row leftover after the rotation;
18. zero unexpected console errors.

Zero dev-DB writes (the copy is /tmp-scoped and deleted at probe exit);
zero e2e.db writes (the probe never touches it — it booted its own server
on its own DB).

## 5. Remediation design (TDD)

### ToDo

| # | Task | Layer | Gate |
|---|---|---|---|
| 1 | `tests/e2e/auth.spec.ts` — NEW describe "password rotation (F-II, session-38)" at the END of the file (after the logout describe; the logged-out describes and the logout case keep their own shapes — Playwright scopes `test.use` to the enclosing describe, and the new describe INHERITS the project storageState, no `test.use` needed), ONE case: mint the hijacked session OFFLINE (beforeAll: random 256-bit token, HMAC'd cookie value computed for the finally's cleanup only — the cookie itself is never needed on the wire; `Session` row via `prisma db execute` INSERT…SELECT with james's id resolved by the DB); the case captures james's runtime passwordHash + session count via dbRead, drives the REAL form (Settings tab → `Demo1234!` → run-unique strong new password → Update Password), asserts: the "Password changed." status (SUPPORTING), the hijacked session row GONE (LOAD-BEARING — the F-4 revoke half), the CURRENT session still functional wire-real (a post-rotation /account render stays signed-in — the keep half; the storageState session is the keepToken), james's session count == captured − 1 (exactly the hijacked row — the over-broad-revocation negative), and the offline scrypt verification: the stored hash verifies the NEW password and NO LONGER verifies `Demo1234!` (the write half, LOAD-BEARING); the finally restores the captured passwordHash byte-identically and deletes the minted row if it survived; afterAll belt-and-braces drops the minted row | E2E | playwright |
| 2 | Mutation demo (surgical, inverse-restore — traps #37/#39): drop the `db.session.deleteMany` call from `changePasswordAction` (the exact hijack-survival regression shape F-4 documents as having shipped) → REBUILD (trap #16) → exactly the 2 F-II case-runs fail (the hijacked-row assertion is the load-bearing witness — the row is still there; the toast still says "Password changed." — the silent class) → restore via inverse edit (`rg`-verify, `git diff` on src/ empty) → rebuild → green | process | playwright |
| 3 | Round-33 census (the standing task re-check — mobile nav + the Tailwind v4 pin, both sides both viewports through agent-browser on the LIVE reference after a real login) — MUST be byte-stable vs the round-32 ledger (test-only round); refresh the screenshot set | parity | agent-browser census |
| 4 | Final gates on the final tree: typecheck → lint → unit → build → full E2E | gates | npm run verify + test:e2e |
| 5 | Docs alignment: README (badge 173+264, the Auth row gains the rotation pin, testing/status rows 133), CLAUDE.md (gate line 133 + the F-II gate in the chain, NEW F-II testing bullet), PAD (test table 18\|133\|264, §7.1 session-38 paragraph), SKILL v1.31.0 (frontmatter, §2 E2E row + F-II, §11 133, Appendix B NEW session-38 row with the customer-side offline-session pattern), AGENTS.md (the F-II gate on the security line), this file's execution record, worklog, `docs/session_45.md` (the round's narration log — session_44.md taken by the pulled commit) | docs | stale-count sweep |

### Count ledger (expected post-remediation)

| Metric | Before | After |
|---|---|---|
| unit files / tests | 19 / 173 | 19 / 173 (no new pure seam — the scrypt replication rides the E2E probe/spec layer; the revocation is tx-internal to the action, already Zod-gated and authz-checked) |
| E2E spec files | 18 | 18 (the describe lands INSIDE auth.spec.ts) |
| unique E2E cases | 132 | 133 (+1 F-II) |
| E2E result | 262 passed + 2 skipped | 264 passed + 2 skipped (133 × 2 − 2 desktop-only skips; the +2 setup projects pass outside the case-run summary) |

## 6. Validation of this plan against the codebase (pre-execution)

- The offline customer-session mint is the a11y/F-HH proven shape (the
  probe verified it for james end-to-end — check 3/4 above).
- The `verifyPassword` replication (`s1$salt$hex`, scrypt keylen 64) is
  byte-exact against `src/lib/auth.ts:47-54` (probe checks 11/12).
- The Settings tab interaction (`getByRole("tab", { name: "Settings" })` →
  `#current-password`/`#new-password`/`#confirm-password` →
  `/update password/i` → role=status "Password changed.") matches
  `src/components/account/account-tabs.tsx:286-317` (probe check 6).
- The F-4 contract's two halves are independently observable server-side
  (probe checks 7/8/9) and wire-side (probe checks 10/14).
- The captured-hash restore is byte-identical (probe checks 15/16) — no
  re-hash, no seed-hash hardcoding.
- `auth.spec.ts` runs AFTER account-addresses/account-orders/
  action-seam/admin/api-contract and BEFORE brand-metadata/cart-checkout/
  error-surfaces/home/mobile-navigation/product/security-csp/seo/shop/
  wishlist (alphabetical, workers:1 serial): every james login that
  depends on `Demo1234!` runs either BEFORE the describe (the
  wrong-credentials case in the same file, the logout case's throwaway
  login) or AFTER the finally's restore (cart-merge ×2, security-csp ×2) —
  the probe restored-and-verified the exact same posture.
- `changePasswordAction` carries no limiter (only login/register/
  newsletter/checkout do — re-verified by source read), so the case
  consumes NO budget on any seam.
- No schema/env/seed changes; money untouched; no revalidatePath surface
  change; `.env.example` unchanged; no src/ change survives the mutation
  demo (the temporary edit is restored and verified).
- The census measures the home page only — a test-only round cannot drift
  it; the ritual still runs as the verdict (trap #40's discipline).

## 7. Execution record

| # | Task | Result |
|---|---|---|
| 1 | auth.spec.ts describe | ✅ NEW describe "password rotation (F-II, session-38)" at the END of the file (after the logout describe — the new describe INHERITS the project storageState, no test.use), ONE case riding the storageState session (the CURRENT session F-4 must keep) + the OFFLINE-minted hijacked session (beforeAll: random 256-bit token, Session row via `prisma db execute` INSERT…SELECT with james's id resolved by the DB; afterAll belt-and-braces drop): the case captures james's runtime passwordHash, parses the CURRENT session's token from the context's own cookie, drives the REAL form (Settings tab → Demo1234! → run-unique `Roto<hex>!A2b` → Update Password), asserts the "Password changed." status (SUPPORTING), the hijacked row GONE (LOAD-BEARING — the F-4 revoke half), the CURRENT session's row STILL present BY TOKEN (LOAD-BEARING — the keep half; the over-broad-revocation negative), a fresh post-rotation /account render signed-in (the keep half, wire-real), and the offline scrypt verification — the stored hash verifies the NEW password and NO LONGER verifies Demo1234! (LOAD-BEARING — the write half); the finally restores the captured hash byte-identically, drops the minted row, and RESURRECTS any setup-session row the rotation lawfully revoked (insert-if-missing by the .auth files' cookie tokens). **ONE mid-execution design correction, first-hand**: the first spec draft asserted the keep half by SESSION COUNT (countBefore − 1) — it failed on BOTH projects because Playwright runs BOTH setup projects up-front (both dependency-free), so james holds the OTHER project's setup session too and F-4 lawfully revokes it (Expected 2 / Received 1 on chromium; the mobile project's first assertion then failed on the already-revoked storageState). The count was scheduling-dependent and never the contract — replaced by the BY-TOKEN keep assertion + the resurrect-in-finally discipline (the same "finally restores the captured runtime state" rule F-HH used, extended to session rows); typecheck ✓ eslint ✓; GREEN **14 passed** (6 existing uniques + 1 F-II unique) × 2 + 2 setups (30.6s) |
| 2 | Mutation demo | ✅ the `db.session.deleteMany` revocation dropped from changePasswordAction (the exact hijack-survival regression shape F-4's comment documents as having SHIPPED — the toast still says "Password changed.") → REBUILD → **exactly the 2 F-II case-runs failed** (the failure landing at `expect(hijackGone).toBeNull()` — received `{"id":"fii-james-…"}`, the row STILL THERE — the dbRead server-truth witness; all 12 other cases stayed green: the toast-asserting world CANNOT see the dropped revocation — the gap's exact shape) → restored via inverse edit (git diff on src/ empty; deleteMany rg-verified at :59) → rebuild → 14/14 green |
| 3 | Round-33 census + screenshots | ✅ **ZERO DRIFT — byte-identical to the round-32 ledger in ALL census fields (41st/42nd consecutive sweep), both censuses on the final tree**: desktop pageH 11079 (ref) / 11085 (clone), mobile 11257 / 11264, mainKids 11 BOTH sides both viewports, footers 444/1189, drawer char-identical (panelCls `fixed left-0 top-0 h-full w-80 bg-background z-50 p-8 flex flex-col gap-6` + navCls `flex flex-col gap-5 mt-4`, 5 items, gaps [20,20,20,20]) — **the v4 mobile-nav pin holds**; ref console = the documented 2× 401 residue; clone console clean. The reference's functional posture re-confirmed first-hand through agent-browser (logged in with the task credentials): the WOMEN nav button is INERT (click → URL unchanged). The clone's mobile-menu behavior verified end-to-end on the dev server through real Playwright (`scripts/dev-hydration-probe-session38.cjs`): burger visible → drawer opens (dialog:1) → body overflow `hidden` → Women click → `/shop?category=women` → menu closed → overflow restored → zero console errors. **One harness lesson first-hand**: the dev server went inert mid-round (burger unfound, clicks dead) — running `npm run build` while `npm run dev` is live CLOBBERS the shared `.next/` and breaks the dev session's hydration; a fresh dev-server restart restored full interactivity (the product was never broken — the standalone was census- and E2E-green throughout). Screenshots: 13 refreshed (the sweep's 9 — clone-home-desktop, clone-exclusive-deals, clone-size-chips, clone-pdp, clone-shop-plp, clone-mobile-home, clone-mobile-menu-open, ref-home-desktop, ref-mobile-menu-open — plus the dev-server login set: clone-login, clone-cart, clone-account, clone-admin-dashboard; three of the login set captured byte-identical to the committed versions — deterministic surfaces, git sees no change) |
| 4 | Final gates on the final tree | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **264 passed + 2 skipped** (133 unique × 2 − 2 desktop-only skips; the +2 setup projects pass outside the case-run summary; 5.7m) — the THIRTY-SECOND consecutive fully-green session, exactly the §5 count ledger (132→133 unique, 262→264 passed); the F-II case-runs green on BOTH projects |
| 5 | Docs alignment + stale-count sweep | ✅ README (badge 173+264, the Auth row + the rotation pin, testing/status/architecture rows 133); CLAUDE.md (gate line 133 + the F-II gate in the chain, NEW F-II testing bullet); PAD (test table 18\|133\|264, §7.1 session-38 paragraph, §7.3 command 133); SKILL v1.31.0 (frontmatter, §2 E2E row + F-II, §11 133, Appendix B NEW session-38 row with the customer-side offline-session + resurrect pattern); AGENTS.md (the security line gains the F-II gate); docs/remediation-plan-session38.md (this record); worklog; docs/session_45.md (the round's narration log — session_44.md taken by the pulled commit); scripts/plan-probe-session38.cjs + scripts/dev-hydration-probe-session38.cjs (the probe + lesson artifacts); .env.example unchanged and matching the codebase. Stale-count sweep: zero stale counts |

## 8. Residual risks / next steps (post-F-II)

1. The merge's transaction-atomicity half (H-29) stays pinned by
   source-read only — wire fault-injection into a SQLite tx is not
   reachable from Playwright (carried).
2. The success gate's foreign-owner row stays covered-by-shape (carried).
3. `/api/search`'s 429 path unpinned by design (the limiter-reset harness
   would relax the budget for every 429-shaped pin; carried).
4. The search 503 / health `db:false` deliberate-failure shapes stay
   pinned by source-read + success-path only (carried).
5. The `updateProfileAction` WRITE (the sibling seam in
   `src/lib/actions/account.ts`) stays unverified — cosmetic regression
   class (toast green, name unchanged), no security bearing; a future
   round could bundle it as a profile leg (weaker candidate, carried).
6. The PDP og:image annotation / og:type union / `style-src
   'unsafe-inline'` exceptions (carried, sessions 26–37).
7. Real PSP behind the checkout seam (carried).
8. Dev-toolchain npm-audit findings (11, all dev-only) — carried.
9. G-3 POSIX-only sweep paths (carried).
10. The action-seam gate couples to the standalone manifest shape (carried).
11. The zero-drift streak is a streak, not a guarantee — the census ritual
    stays mandatory. Thirteen stable rounds since the round-21 move.
12. security.txt `Expires` (2027-11-01) renewal cadence (carried).
13. The canonical convention delta / `/shop` og:url convention (carried).
14. `NewsletterSubscriber` stays outside global-setup's wipe list
    (carried).
15. HSTS on http://localhost inert by construction (carried).
16. The register bucket stays 8 < 10 — prefer no-register shapes (the F-II
    describe is exactly that: storageState ride + offline mint, zero
    register, zero login).
17. The F-BB spec comment's limiter arithmetic undercount stays as-is
    (carried; a comment is not a gate).
18. `adminUpdateProductAction` mints no events by design
    (carried-by-shape).
19. `docs/luxury-fashion-store-dashboard.png` (referenced by the task
    brief) does not exist in the repo (404 on blob + raw) — the live
    logged-in reference served as the comparison target this round; if
    the operator adds the image later, diff it against
    `docs/screenshots/clone-home-desktop.png`.
20. The sandbox now kills detached process groups (both nohup attempts
    died post-setups this round) — run long gates in the foreground.
