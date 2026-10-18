# Remediation Plan — Session 39 (AURELIA / VELOUR clone)

> **Status:** PLANNED → EXECUTED this round (the session-38 continuation,
> named for the next session number per the standing precedent).
> **Mode:** Verify-first (Mode C) → pulled `527673c` (fast-forward
> `1e6a429..527673c` — docs-only: `docs/session_46.md`, the parallel
> thread's narration of the session-38 round) → docs-aligned baseline
> validation → fresh audit pass → one gate-coverage remediation (**F-JJ** —
> the profile save's write contract, the `updateProfileAction` sibling
> seam). **Scope:** HEAD `527673c` audited as the round's pulled state; the
> committed tree re-verified: typecheck ✓ lint ✓ **173/173 unit (19
> files)** ✓ build + assemble ✓ E2E **264 passed + 2 skipped** (6.0m) —
> the THIRTY-THIRD consecutive fully-green session; the plan-probe
> discipline ran BEFORE the spec (**11/11** wire-verified checks on a
> throwaway DB copy — `scripts/plan-probe-session39.cjs`).

---

## 1. Starting state

Pulled `527673c` (fast-forward `1e6a429..527673c` — the workspace survived
from the session-38 round; the pull brought ONLY `docs/session_46.md`, the
parallel thread's narration of the SAME session-38 round; local main =
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
| Foreground-gates rule | honored (the sandbox kills detached process groups — the session-38 harness fact) |

**Baseline gates on the committed tree (THIRTY-THIRD consecutive session
fully green at baseline):** typecheck ✓ · lint ✓ · **173/173 unit (19
files)** ✓ · build + assemble ✓ · **E2E 264 passed + 2 skipped** (133
unique × 2 − 2 desktop-only skips; 6.0m).

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

## 2. Audit of `527673c` (the pulled HEAD) — first-hand

`527673c` composition (1 file): `docs/session_46.md` (+101) — the
session-38 round's narration log from the parallel thread (its ledger
matches `1e6a429`'s actual diff: same F-II shape, same zero-drift census,
same 264+2 final gates, same push verification through the wrapper with
the `--remote` correction). **Verdict: docs-only, zero repo-state impact
beyond the log itself — RETAINED (never overwrite another thread's log);
this round's narration ships as `docs/session_47.md`.**

The session-38 round itself (`1e6a429`) was audited via the worklog + plan
+ spec source: `git show --stat 1e6a429` confirms the test-only shape (20
files, +1032/−16, the only code-adjacent change
`tests/e2e/auth.spec.ts` +231; zero `src/` files), and the F-II describe
re-ran green as part of this round's baseline E2E (its case-runs passed
on both projects inside the 264+2).

## 3. Fresh audit pass — finding (the round's target)

The standing residual list (session-38 plan §8) was re-triaged first-hand.
The strongest remaining candidate — the plan's own §8 #5, verified by
exhaustive search:

- `rg -i "updateProfile|profile-name|Save changes|Profile updated" tests/e2e/`
  → the ONLY hit is `auth.spec.ts:79`
  (`await expect(page.locator("#profile-name")).toHaveValue(/Whitmore/i)`) —
  a READ of the prefilled value inside the logout case. No spec anywhere
  fills the Profile tab's name form and submits it; no spec asserts the
  write landed; the a11y gate renders the surface but asserts no mutation;
  the action-seam gate posts no account actions.

**F-JJ — `updateProfileAction`'s WRITE contract**
(`src/lib/actions/account.ts:11-27`): the profile save parses the name
through the governed `profileSchema` (H-33 — unit-pinned in
`src/lib/validation.test.ts`), then writes

```ts
const updated = await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name } });
revalidatePath("/account");
return ok({ name: updated.name, email: updated.email });
```

The action works today (verified first-hand by this round's 11/11 probe),
but NO gate exercises the write: a dropped (or no-op) `db.user.update`
leaves the toast green ("Profile updated.") while the customer's name
never changes — the same toast-blind silent class F-II pinned on the
password seam, now on its sibling profile seam. This is the seam the
session-38 plan §8 #5 explicitly carried forward as the strongest
remaining candidate ("a future round could bundle it as a profile leg").
Cosmetic regression class (no security bearing — the name is display-only
data; the email is disabled in the form and untouched by the action), LOW
gate-coverage, zero product defect.

**Severity: LOW (gate-coverage gap; the action works today — proven by the
11/11 probe). The regression class is toast-blind and user-visible.**

Competing leads carried (same posture as session-38): the search-429
limiter-reset harness (tooling, not a seam), the merge's H-29
transaction-atomicity half (not wire-reachable), the success gate's
foreign-owner row (covered-by-shape), the PDP og:image annotation
exceptions (carried, sessions 26–38).

### Honest-gate decisions (run before planning)

- **F-JJ adds gate coverage; it changes no product behavior.** The served
  DOM on resting surfaces is untouched; the parity census cannot drift
  (test-only round).
- **No gate is weakened.** No existing spec/case is modified — the new
  describe lands INSIDE `tests/e2e/auth.spec.ts` (the OWNING spec — the
  profile save is the /account mutation surface's own, the F-II
  sibling seam in the same file; the auth surface's own spec, keeping the
  spec file count at 18); no playwright config edit; no new npm
  dependencies; `.env.example` unchanged; money untouched.
- **ZERO login consumption, ZERO register consumption.** The case rides
  the per-project storageState (james's setup session) and performs no
  auth flow of any kind — `updateProfileAction` carries no limiter
  (re-verified by source read: only login/register/newsletter/checkout
  are rate-limited), so the case consumes NO budget on any seam. The
  exactly-consumed login buckets (james 10/10, admin 10/10) and the
  register bucket (8 < 10) stay untouched.
- **The mutation rides the REAL form** (`/account` → Profile tab →
  `#profile-name` → Save Changes) — no crafted POSTs, no SQL state
  fixtures for the mutation itself (the only SQL is the finally's
  byte-identical restore of the captured name).
- **james is safe to mutate** (the round's user): the name is CAPTURED at
  case start (runtime value, never hardcoded — immune to any earlier
  spec's side effects) and RESTORED byte-identically in the finally. The
  only other name-value assertion in the whole suite (`/Whitmore/i`,
  auth.spec.ts:79) lives in the logout case of the SAME file, which sorts
  BEFORE the new describe (file order: logged-out → logout → F-II →
  F-JJ); every later spec reads no name value. Playwright runs both
  projects' F-JJ case serially (workers:1) with the restore in the
  finally, so neither project's later specs can observe the changed name.
- **H-24: nothing canonical survives the run** — the changed name dies in
  the finally's restore (belt-and-braces even on mid-case failure);
  global-setup wipes nothing of the User table but the seed re-upserts
  the canonical name at every run start (`prisma/seed.ts` idempotent
  upserts).

## 4. Plan-probe discipline (run BEFORE the spec)

`scripts/plan-probe-session39.cjs` — a throwaway copy of `db/custom.db`
plus the standalone booted on :3209 against the copy: **11/11 checks
passed**, wire-verifying every assumption the spec depends on:

1. the canonical name fixture exists (runtime capture —
   "James Whitmore");
2. the real login lands /account (the form's session);
3. the Profile tab mounts the `#profile-name` form;
4. the form prefills the CURRENT name from the server prop;
5. the real form reports "Profile updated." after the save;
6. **the WRITE half (LOAD-BEARING): the User row's name IS the new
   run-unique name** (server truth; the toast CANNOT see this);
7. the email is UNTOUCHED by the save;
8. wire-real: a fresh /account render prefills the NEW name (the write
   landed; the form's `defaultValue` flows from the server prop through
   the RSC render);
9. the captured-name UPDATE restore returns the seed name
   byte-identically;
10. a fresh render after the restore prefills the ORIGINAL name (the
    restore is wire-real);
11. zero unexpected console errors.

Zero dev-DB writes (the copy is /tmp-scoped and deleted at probe exit);
zero e2e.db writes (the probe never touches it — it booted its own server
on its own DB).

## 5. Remediation design (TDD)

### ToDo

| # | Task | Layer | Gate |
|---|---|---|---|
| 1 | `tests/e2e/auth.spec.ts` — NEW describe "profile update write (F-JJ, session-39)" at the END of the file (after the F-II describe; the new describe INHERITS the project storageState, no `test.use` needed), ONE case: capture james's runtime `name` (dbRead — never hardcode, immune to drift), drive the REAL form (Profile tab → `#profile-name` fill run-unique name → Save Changes), assert: the "Profile updated." status (SUPPORTING), **the server-truth dbRead: the User row's name IS the new name (LOAD-BEARING — the write half, the toast cannot see it)**, the email UNCHANGED (the action writes name only), and a fresh `/account` render (Profile tab) prefills `#profile-name` with the NEW name (the wire-real half — the write + `revalidatePath` + the RSC server prop); the finally restores the captured name byte-identically (SQL UPDATE; SQL-escape the captured value) | E2E | playwright |
| 2 | Mutation demo (surgical, inverse-restore — traps #37/#39): swap the `db.user.update` write in `updateProfileAction` for a read (`db.user.findUniqueOrThrow` — the exact dropped-write regression shape: the toast stays green, the DTO still populates, nothing is written) → REBUILD (trap #16) → exactly the 2 F-JJ case-runs fail (the server-truth name assertion is the load-bearing witness — the row still carries the OLD name; the toast still says "Profile updated." — the silent class) → restore via inverse edit (`rg`-verify, `git diff` on src/ empty) → rebuild → green | process | playwright |
| 3 | Round-34 census (the standing task re-check — mobile nav + the Tailwind v4 pin, both sides both viewports through agent-browser on the LIVE reference after a real login) — MUST be byte-stable vs the round-33 ledger (test-only round); refresh the screenshot set | parity | agent-browser census |
| 4 | Final gates on the final tree: typecheck → lint → unit → build → full E2E | gates | npm run verify + test:e2e |
| 5 | Docs alignment: README (badge 173+266, the Auth row gains the profile-write pin, testing/status rows 134), CLAUDE.md (gate line 134 + the F-JJ gate in the chain, NEW F-JJ testing bullet), PAD (test table 18\|134\|266, §7.1 session-39 paragraph), SKILL v1.32.0 (frontmatter, §2 E2E row + F-JJ, §11 134, Appendix B NEW session-39 row), AGENTS.md (the F-JJ gate on the security line), this file's execution record, worklog, `docs/session_47.md` (the round's narration log — session_46.md taken by the pulled commit) | docs | stale-count sweep |

### Count ledger (expected post-remediation)

| Metric | Before | After |
|---|---|---|
| unit files / tests | 19 / 173 | 19 / 173 (no new pure seam — the write is a single Prisma update inside the action, already Zod-gated (`profileSchema` unit-pinned) and authz-checked) |
| E2E spec files | 18 | 18 (the describe lands INSIDE auth.spec.ts) |
| unique E2E cases | 133 | 134 (+1 F-JJ) |
| E2E result | 264 passed + 2 skipped | 266 passed + 2 skipped (134 × 2 − 2 desktop-only skips; the +2 setup projects pass outside the case-run summary) |

## 6. Validation of this plan against the codebase (pre-execution)

- The Profile tab interaction (`getByRole("tab", { name: "Profile" })` →
  `#profile-name` → `/save changes/i` → role=status "Profile updated.")
  matches `src/components/account/account-tabs.tsx:259-283` (probe checks
  3/5).
- The write is server-side observable (probe check 6) and the email
  invariant holds (probe check 7).
- The fresh-render prefill (probe check 8) pins the
  `revalidatePath("/account")` + RSC prop flow wire-real.
- The captured-name restore is byte-identical (probe checks 9/10) — no
  seed-name hardcoding.
- `auth.spec.ts` runs AFTER account-addresses/account-orders/
  action-seam/admin/api-contract and BEFORE brand-metadata/cart-checkout/
  error-surfaces/home/mobile-navigation/product/security-csp/seo/shop/
  wishlist (alphabetical, workers:1 serial); within the file the new
  describe sorts LAST (after the F-II describe) so the logout case's
  `/Whitmore/i` prefill assertion (line 79) runs BEFORE the mutation; the
  finally's restore returns the canonical name before any later spec
  (none reads the name) — the probe restored-and-verified the exact same
  posture.
- `updateProfileAction` carries no limiter (only login/register/
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
| 1 | auth.spec.ts describe | ✅ NEW describe "profile update write (F-JJ, session-39)" at the END of the file (after the F-II describe — the new describe INHERITS the project storageState, no test.use), ONE case riding the storageState session: captures james's runtime `name` (dbRead — never hardcode, immune to drift; the logout case's `/Whitmore/i` prefill assertion sorts BEFORE the new describe in file order), drives the REAL form (Profile tab → `#profile-name` fill run-unique `James E2E Profile <hex>` → Save Changes), asserts the "Profile updated." status (SUPPORTING), the server-truth dbRead — the User row's name IS the new name (LOAD-BEARING — the write half; the toast CANNOT see it), the email UNCHANGED (`james@example.com` — the action writes name only), and a fresh /account render prefills `#profile-name` with the NEW name (the wire-real half — the write + revalidatePath + the RSC server prop); the finally restores the CAPTURED name byte-identically (SQL-escaped UPDATE — SQLite single-quote doubling); typecheck ✓ eslint ✓; GREEN **16 passed** (7 existing uniques + 1 F-JJ unique) × 2 + 2 setups (35.1s; F-JJ green on BOTH projects, 2.5s/2.3s) |
| 2 | Mutation demo | ✅ the write swapped for a read (`db.user.update` → `db.user.findUniqueOrThrow` — the exact dropped-write shape: the DTO still populates, the toast still says "Profile updated.", nothing is written) → REBUILD → **exactly the 2 F-JJ case-runs failed** (the failure landing at `expect(after.name).toBe(newName)` — Expected "James E2E Profile 0b7f…" / Received "James Whitmore", the dbRead server-truth witness, auth.spec.ts:406) while all 14 other cases stayed green (the toast-asserting world CANNOT see the dropped write — the gap's exact shape) → restored via inverse edit (git diff on src/ empty; the update rg-verified at :24) → rebuild → 16/16 green |
| 3 | Round-34 census + screenshots | ✅ **ZERO DRIFT — byte-identical to the round-33 ledger in ALL census fields (43rd/44th consecutive sweep), both censuses on the final tree**: desktop pageH 11079 (ref) / 11085 (clone), mobile 11257 / 11264, mainKids 11 BOTH sides both viewports, footers 444/1189, the drawer char-identical (panelCls `fixed left-0 top-0 h-full w-80 bg-background z-50 p-8 flex flex-col gap-6` + navCls `flex flex-col gap-5 mt-4`, 5 items, gaps [20,20,20,20]) — **the v4 mobile-nav pin holds** (the standing task re-check); ref console = the documented 2× 401 residue; clone console clean. The reference's functional posture re-confirmed first-hand through agent-browser (logged in with the task credentials): the WOMEN nav button is INERT (click → URL unchanged). The clone's mobile-menu behavior verified end-to-end on the dev server through real Playwright (`scripts/dev-hydration-probe-session38.cjs`): burger visible → drawer opens (dialog:1) → body overflow hidden → Women click → `/shop?category=women` → menu closed → overflow restored → zero console errors. **ONE NEW harness fact, measured first-hand**: starting `next dev` over a stale PRODUCTION `.next/` (build-then-dev without wiping — this round's sequence: baseline build → mutation rebuilds → sweep → dev) puts the dev client into an INFINITE Fast-Refresh reload loop (`[Fast Refresh] rebuilding` fires on every HMR connect → a full document navigation every ~300ms → interaction probes time out in "element was detached" retry loops; 20 document requests inside 8s vs 1 on a clean start — diagnosed with `scripts/dev-nav-diagnosis-session39.cjs`); `rm -rf .next` before `npm run dev` after any build-heavy round restored a fully settled session (the product was never broken — the standalone was census- and E2E-green throughout). Screenshots: 13 refreshed (the sweep's 9 — clone-home-desktop, clone-exclusive-deals, clone-size-chips, clone-pdp, clone-shop-plp, clone-mobile-home, clone-mobile-menu-open, ref-home-desktop, ref-mobile-menu-open — plus the dev-server login set via `scripts/dev-shots-session39.cjs`: clone-login, clone-cart, clone-account, clone-admin-dashboard, zero console errors; james's dev cart cleaned before/after the cart shot — the failed shot attempts had accumulated 4 line rows) |
| 4 | Final gates on the final tree | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **266 passed + 2 skipped** (134 unique × 2 − 2 desktop-only skips; the +2 setup projects pass outside the case-run summary; 6.5m) — the THIRTY-FOURTH consecutive fully-green session, exactly the §5 count ledger (133→134 unique, 264→266 passed); the F-JJ case-runs green on BOTH projects |
| 5 | Docs alignment + stale-count sweep | ✅ README (badge 173+266, the Auth row + the profile-write pin, testing/architecture/status rows 134); CLAUDE.md (gate line 134 + the F-JJ gate in the chain, NEW F-JJ testing bullet, commands 134); PAD (test table 18\|134\|266, §7.3 command 134, the §7.1 coverage-map session-39 extension); SKILL v1.32.0 (frontmatter, §2 E2E row + F-JJ, §11 134, Appendix B NEW session-39 row with the dropped-write mutation shape + the Fast-Refresh harness lesson); AGENTS.md (the security line gains the F-JJ gate; the E2E command row 134); docs/remediation-plan-session39.md (this record); worklog; docs/session_47.md (the round's narration log — session_46.md taken by the pulled commit); scripts/plan-probe-session39.cjs + scripts/dev-nav-diagnosis-session39.cjs + scripts/dev-shots-session39.cjs (the probe + diagnosis + shot artifacts). Stale-count sweep: zero stale counts |

## 8. Residual risks / next steps (post-F-JJ)

1. The merge's transaction-atomicity half (H-29) stays pinned by
   source-read only — wire fault-injection into a SQLite tx is not
   reachable from Playwright (carried).
2. The success gate's foreign-owner row stays covered-by-shape (carried).
3. `/api/search`'s 429 path unpinned by design (the limiter-reset harness
   would relax the budget for every 429-shaped pin; carried).
4. The search 503 / health `db:false` deliberate-failure shapes stay
   pinned by source-read + success-path only (carried).
5. Both `src/lib/actions/account.ts` mutation seams are now gated
   (F-II password + F-JJ profile); the address-book seam
   (`saveAddressAction`/`deleteAddressAction`/`setDefaultAddressAction`)
   is wire-covered by `account-addresses.spec.ts` (the CRUD surface's
   own spec) — the account file is fully gated.
6. The PDP og:image annotation / og:type union / `style-src
   'unsafe-inline'` exceptions (carried, sessions 26–39).
7. Real PSP behind the checkout seam (carried).
8. Dev-toolchain npm-audit findings (11, all dev-only) — carried.
9. G-3 POSIX-only sweep paths (carried).
10. The action-seam gate couples to the standalone manifest shape (carried).
11. The zero-drift streak is a streak, not a guarantee — the census ritual
    stays mandatory. Fourteen stable rounds since the round-21 move.
12. security.txt `Expires` (2027-11-01) renewal cadence (carried).
13. The canonical convention delta / `/shop` og:url convention (carried).
14. `NewsletterSubscriber` stays outside global-setup's wipe list
    (carried).
15. HSTS on http://localhost inert by construction (carried).
16. The register bucket stays 8 < 10 — prefer no-register shapes (the F-JJ
    describe is exactly that: storageState ride, zero register, zero
    login).
17. The F-BB spec comment's limiter arithmetic undercount stays as-is
    (carried; a comment is not a gate).
18. `adminUpdateProductAction` mints no events by design
    (carried-by-shape).
19. `docs/luxury-fashion-store-dashboard.png` (referenced by the task
    brief) does not exist in the repo (404 on blob + raw) — the live
    logged-in reference served as the comparison target this round; if
    the operator adds the image later, diff it against
    `docs/screenshots/clone-home-desktop.png`.
20. The sandbox kills detached process groups — run long gates in the
    foreground (carried, the session-38 fact, honored again this round).
