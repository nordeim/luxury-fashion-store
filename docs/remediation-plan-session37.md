# Remediation Plan — Session 37 (AURELIA / VELOUR clone)

> **Status:** PLANNED → EXECUTED this round (the session-36 continuation,
> named for the next session number per the standing precedent).
> **Mode:** Verify-first (Mode C) → fresh clone (the sandbox workspace had
> been reset — `git clone` per the task brief) → docs-aligned baseline
> validation → live-reference parity sweep round 32 → fresh audit pass →
> one gate-coverage remediation (**F-HH** — the admin action's event-write
> path). **Scope:** HEAD `93055c8` (the session-36 round's narration-log
> commit, docs-only) audited as the round's pulled state; the committed
> tree re-verified from scratch on the fresh clone: typecheck ✓ lint ✓
> **173/173 unit (19 files)** ✓ build + assemble ✓ E2E **260 passed +
> 2 skipped** (5.7m) — the TWENTY-NINTH consecutive fully-green session;
> **the round-32 census measured ZERO DRIFT** (39th/40th consecutive
> clone-side sweep — the reference byte-stable against the round-24
> ledger: mainKids 11 both sides both viewports, pageH 11079/11085 +
> 11257/11264, drawer char-identical `w-80` + `flex flex-col gap-5 mt-4`,
> gaps [20,20,20,20] — the v4 mobile-nav pin holds, the standing task
> re-check, this round measured first-hand through `agent-browser` on the
> LIVE reference after a real login); **the fresh pass closed the session-36
> plan's §8 #16 documented candidate (the strongest remaining, carried
> session-33 §8 #16 → 36 §8 #16)** — the admin mutation action's
> **EVENT-WRITE path**: `adminUpdateOrderAction`
> (`src/lib/actions/admin.ts:55` and `:78`) mints `OrderEvent` rows inside
> the H-29 transaction (`type: "status_changed"` + `note: "<old> → <new>"`
> on a status transition; `type: "tracking_added"` + the joined
> carrier note on a tracking change), but NO gate ever verifies the rows
> were minted — `admin.spec.ts` drives the real form yet asserts only the
> toast + form values; the F-DD gate pins the customer-side READ filter
> with a SQL-minted fixture (never the action's WRITE). A dropped
> `tx.orderEvent.create` call (or a mangled note/actor/type) would leave
> every order timeline silently empty — the customer's account timeline
> renders nothing new, the admin's detail timeline shows no minted event —
> with every gate green.

---

## 1. Starting state

FRESH CLONE at `93055c8` (the sandbox workspace had been reset to an empty
initial commit — `git clone https://github.com/nordeim/luxury-fashion-store.git`
per the task brief; local main = remote main at `93055c8`).

Sandbox/recovery incidents this round — **THREE** (on the fresh clone, all
recovered before any gate):

| Step | Result |
|---|---|
| fresh clone | ✓ 2942 files, HEAD `93055c8` (remote = local) |
| `.env` missing (gitignored, fresh clone) | ✓ created with the canonical 3-line contract (`DATABASE_URL="file:../db/custom.db"` + dev `AUTH_SECRET` + site URL) — the task brief's exact requirement: schema-relative URL, `db/` at the repo root |
| `db/custom.db` missing (gitignored, fresh clone) | ✓ `npm run db:setup` materialized canonical 4/12/2/4 (4 categories / 12 products / 2 users / 4 orders) |
| Playwright chromium-1248 missing (the documented recurring incident — only 1200 cached; the pinned @playwright/test 1.64.1 needs v1248) | ✓ `npx playwright install chromium` (chromium_headless_shell-1248 downloaded; the first E2E attempt failed at BOTH setup projects with `Executable doesn't exist` — recovered, re-run green) |
| `bin/ssh` shim + venv paramiko missing (the push tooling) | ✓ shim rebuilt (Appendix A, venv shebang `#!/home/z/.venv/bin/python3`), paramiko 5.0.0 installed into `/home/z/.venv` |
| stray `bun.lock` | ✓ none (fresh clone) |

**Baseline gates on the committed tree (TWENTY-NINTH consecutive session
fully green at baseline, re-proven from scratch):** typecheck ✓ · lint ✓ ·
**173/173 unit (19 files)** ✓ · build + assemble ✓ · **E2E 260 passed +
2 skipped** (131 unique × 2 − 2 desktop-only skips; the +2 setup projects
pass outside the case-run summary; 5.7m).

**Task-brief environment contract re-verified:**
- `.env` → `DATABASE_URL="file:../db/custom.db"` — schema-relative,
  resolving to `<repoRoot>/db/custom.db`; the `db/` folder sits at the repo
  root (`.gitkeep` tracked, DB files git-ignored) — matches AGENTS.md, the
  ecommerce-store reference contract, and the task brief verbatim.
- `.env.example` re-read against the codebase: all four documented vars
  (`DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, `TRUST_PROXY`)
  with the same schema-relative URL and the H-35 proxy note — aligned.
- Vitest (`vitest.config.ts`) + Playwright (`playwright.config.ts`) configs
  present and green — the task brief's "add vitest and playwright test
  suite by modifying the respective config files" is already satisfied by
  the repo's existing, gate-verified configs; this round EXTENDS the
  suites (one new E2E case) rather than re-scaffolding them.

## 2. Audit of `93055c8` (the pulled HEAD) — first-hand

`93055c8` composition (1 file): `docs/session_42.md` (+71) — the
session-36 round's narration log from the parallel thread (its ledger
matches `38df2f9`'s actual diff: same F-GG shape, same 13/13 probe, same
10-passed describe, same 260+2 final gates, same push verification through
the wrapper with the `--remote` correction). **Verdict: docs-only, zero
repo-state impact beyond the log itself — RETAINED (never overwrite
another thread's log); this round's narration ships as
`docs/session_43.md`.**

The session-36 round itself (`38df2f9`) was audited via the worklog +
plan + spec source (the F-GG describe verified in full source at
`tests/e2e/wishlist.spec.ts:267-…` and re-run green as part of the full
E2E 260+2 above — its two case-runs passed on both projects, 4.0s/4.7s).

## 3. Live reference sweep — round 32 (measured 2026-10-18): ZERO DRIFT

The single-census pre-remediation pass measured through `agent-browser`
(logged into the reference with the task brief's credentials —
`sepnetflix2023@outlook.com` — the "dashboard" the brief references is the
reference's own logged-in home; the GitHub image
`docs/luxury-fashion-store-dashboard.png` does not exist in the repo — 404
on both blob and raw URLs — the live reference itself serves as the
comparison target, per the brief's "proceed with best recommendations"):

| Ledger field | Round-24…31 ledger | Round-32 measured | Verdict |
|---|---|---|---|
| ref desktop pageH / mainKids | 11079 / 11 | 11079 / 11 | byte-stable |
| clone desktop pageH | 11085 | 11085 | byte-stable |
| ref mobile pageH / mainKids | 11257 / 11 | 11257 / 11 | byte-stable |
| clone mobile pageH | 11264 | 11264 | byte-stable |
| drawer panelCls | `fixed left-0 top-0 h-full w-80 bg-background z-50 p-8 flex flex-col gap-6` | identical | byte-stable — **the mobile-nav v4 pin holds** (the standing task re-check, measured on BOTH sides this round) |
| drawer navCls | `flex flex-col gap-5 mt-4` | identical | byte-stable |
| drawer gaps / item heights | [20,20,20,20] / [20×5] | identical | byte-stable — 5 items both sides |
| clone mobile menu behavior | navigates + closes + scroll-restore | verified: click Women → `/shop?category=women`, menu closed, `body.overflow` restored | functional ✓ |
| clone console | clean | clean (no errors, no CDN Tailwind — the reference's own `cdn.tailwindcss.com` warning is the reference's v3-runtime artifact, observed in the shared session history only) | byte-stable |

The reference's functional posture re-confirmed first-hand: the nav
category buttons (WOMEN/MEN/…) are INERT on the reference (click → no
navigation), the cart drawer opens to the empty state, login works — the
clone remains the functional superset with resting-state visual parity.

## 4. Fresh audit pass — finding (the round's target)

The session-36 plan's §8 #16 documented candidate (carried session-33
§8 #16 → 36 §8 #16), verified first-hand: `rg "orderEvent|dbRead|event"
tests/e2e/admin.spec.ts` → NOTHING. The gap:

- `adminUpdateOrderAction` (`src/lib/actions/admin.ts`) performs the
  status/tracking mutations inside `db.$transaction` and mints an
  `OrderEvent` row for each real change — status change at `:55`
  (`type: "status_changed"`, `actor: "admin"`, `note: "<old> → <new>"`,
  the F-16 stamp) and tracking change at `:78` (`type: "tracking_added"`,
  `actor: "admin"`, the G-11 joined carrier note).
- `tests/e2e/admin.spec.ts` "admin can update an order: status, carrier
  set, carrier clear" drives the real form through the real admin login
  and asserts the toast + reloaded form values — the minted event ROWS
  are never read back; no spec anywhere asserts them (the F-DD privacy
  case mints its OWN SQL fixture row; the action's WRITE is untouched).
- The read side renders them in two places — the admin order detail
  timeline (`src/app/(storefront)/admin/orders/[id]/page.tsx:71`,
  unfiltered) and the customer account timeline (F-16-filtered) — so a
  dropped `orderEvent.create` silently empties both timelines' deltas
  with every gate green (the exact regression class the F-DD round
  documented as "the event minting's customer-side visibility ... the
  read side this spec pins" — the write side stayed unpinned).

**Severity: LOW (gate-coverage gap; the action works today — verified
first-hand by this round's live reference/clone flows and the admin.spec
mutation case passing).** The regression class the pin guards: a dropped
or mangled `tx.orderEvent.create` (wrong actor → F-16 filter no longer
hides admin notes; wrong type/note → timeline renders garbage; dropped
call → silent timeline emptiness) — none of which any gate would catch
today.

Competing leads carried (same posture as session-36): the search-429
limiter-reset harness (tooling, not a seam), the merge's H-29
transaction-atomicity half (not wire-reachable), the success gate's
foreign-owner row (covered-by-shape — `===` has no null special-case),
the PDP og:image annotation exceptions (carried, sessions 26–36).

### Honest-gate decisions (run before planning)

- **F-HH adds gate coverage; it changes no product behavior.** The served
  DOM on resting surfaces is untouched; the parity census cannot drift
  (test-only round).
- **No gate is weakened.** No existing spec/case is modified — the new
  describe lands INSIDE `admin.spec.ts` (the OWNING spec — the surface is
  the admin order mutation's own); the spec file count stays 18; no
  playwright config edit; no new npm dependencies; `.env.example`
  unchanged; money untouched.
- **ZERO login consumption.** The admin login bucket stays EXACTLY
  consumed (10/10: 5 logins in admin.spec.ts × 2 projects — measured,
  SKILL §9 #23). The new describe mints the admin session OFFLINE — the
  proven a11y-gate pattern (M-1/L-3): a random 256-bit token, HMAC'd with
  the shared `E2E_AUTH_SECRET`, backed by a `Session` row inserted via
  `prisma db execute` against `db/e2e.db`, `test.use({ storageState })`
  at the DESCRIBE scope (the file's existing describes keep their own
  auth shapes — Playwright scopes `test.use` to the enclosing describe),
  the row deleted in afterAll.
- **The mutations ride the REAL form** (`/admin/orders/[id]` → status
  select → Save; carrier + tracking inputs → Save) — no crafted POSTs, no
  SQL state writes for the mutation itself; the SQL fixture mints only
  the SESSION row (the a11y pattern) and the cleanup.
- **`ORD-2026-002` is the round's order** (james's, seeded `in_transit`):
  F-DD mints (and self-cleans) a SQL fixture row on it — no status
  assertion anywhere; the admin.spec mutation case clicks the FIRST order
  link (not this one specifically); the F-FF direct-fetch rows read
  ORD-2026-001/004 only. The finally RESTORES the seed state (status
  `in_transit`, carrier/tracking NULL) and deletes the minted event rows
  by their run-unique note prefix — account-orders.spec.ts runs BEFORE
  admin.spec.ts alphabetically anyway, and global-setup wipes
  Order/OrderEvent/Session wholesale at every run start (H-22/H-25).
- **H-24: nothing canonical survives the run** — the minted events, the
  status/tracking restore, and the session row all die in the finally /
  afterAll / global-setup.

## 5. Remediation design (TDD)

### ToDo

| # | Task | Layer | Gate |
|---|---|---|---|
| 1 | `tests/e2e/admin.spec.ts` — NEW describe "admin event-write path (F-HH, session-37)", ONE case (two mutation legs inside), offline-minted admin session (the a11y pattern, describe-scoped `test.use`): resolve ORD-2026-002's id at RUNTIME via the dbRead helper (never hardcode cuids — global-setup re-seeds fresh cuids every run); drive the real form — leg A: status `in_transit → processing` + Save; dbRead: exactly 1 new event row, `actor:'admin'`, `type:'status_changed'`, note `'in_transit → processing'`; the admin timeline renders it (SUPPORTING — reload + text check); leg B: carrier `DHL` + tracking `1ZF-HH…` + Save; dbRead: exactly 1 new `tracking_added` row with the joined note; finally restores the seed state (status `in_transit`, carrier/tracking NULL) and deletes the minted rows by run-unique note; afterAll drops the session row | E2E | playwright |
| 2 | Mutation demo (surgical, inverse-restore — traps #37/#39): drop the status-change `tx.orderEvent.create` call from `adminUpdateOrderAction` (the exact silent-emptiness regression shape) → REBUILD (trap #16) → exactly the 2 F-HH case-runs fail (the dbRead count is the load-bearing assertion — 0 rows where 1 is required; the toast still says "Order updated." — the silent class) → restore via inverse edit (`rg`-verify, `git diff` on src/ empty) → rebuild → green | process | playwright |
| 3 | Round-32b census — MUST be byte-stable vs the 32a ledger (test-only round); refresh the screenshot set | parity | agent-browser census |
| 4 | Final gates on the final tree: typecheck → lint → unit → build → full E2E | gates | npm run verify + test:e2e |
| 5 | Docs alignment: README (badge 173+262, the Admin row gains the event-write pin, testing/status rows 132), CLAUDE.md (gate line 132 + the F-HH gate in the chain, NEW F-HH testing bullet), PAD (test table 18\|132\|262, §7.1 session-37 paragraph), SKILL v1.30.0 (frontmatter, §2 E2E row + F-HH, §11 132, Appendix B NEW session-37 row with the offline-admin-session describe pattern), AGENTS.md (the security line gains the F-HH gate), this file's execution record, worklog, `docs/session_43.md` (the round's narration log — session_42.md taken by the pulled commit) | docs | stale-count sweep |

### Count ledger (expected post-remediation)

| Metric | Before | After |
|---|---|---|
| unit files / tests | 19 / 173 | 19 / 173 (no new pure seam — the event minting is tx-internal to the action, already Zod-gated and authz-checked; the wire pin is the owning gate) |
| E2E spec files | 18 | 18 (the describe lands INSIDE admin.spec.ts) |
| unique E2E cases | 131 | 132 (+1 F-HH) |
| E2E result | 260 passed + 2 skipped | 262 passed + 2 skipped (132 × 2 − 2 desktop-only skips; the +2 setup projects pass outside the case-run summary) |

## 6. Validation of this plan against the codebase (pre-execution)

- The offline admin-session pattern is the a11y gate's proven shape
  (`tests/e2e/accessibility-axe.spec.ts:…` "admin surfaces (SQL-minted
  admin session — zero logins)"): `randomBytes(32)` token, HMAC with
  `E2E_AUTH_SECRET` from `tests/e2e/e2e-secrets.ts` (base64url — the
  `token.hmac` cookie shape), `Session` row via
  `INSERT … SELECT FROM "User" WHERE email = 'admin@aurelia.com'` (the
  id resolved by the DB, never hardcoded), deleted in afterAll.
- `test.use({ storageState })` at describe scope does not leak into the
  file's other describes (Playwright's fixture layering — the a11y spec
  itself relies on this).
- The admin order-detail route renders the mutation form
  (`AdminOrderActions` — status select + carrier/tracking inputs + Save)
  and the unfiltered event timeline at `/admin/orders/[id]`.
- The action's Zod gate (`adminOrderUpdateSchema`) requires `orderId`;
  `status/carrier/trackingNumber` are optional with the F-9
  absent-vs-empty distinction — the form's natural submission shape.
- ORD-2026-002: seeded `in_transit`, owned by james, referenced by F-DD's
  self-cleaning fixture only (no status assertion); the account-orders
  spec file sorts BEFORE admin.spec.ts alphabetically, and the finally
  restores the seed state regardless.
- dbRead helper: the `node -e` + PrismaClient JSON pattern (the
  account-orders/admin H-2 helpers — spawnSync with args ARRAY per trap
  #34).
- No schema/env/seed changes; money untouched; no revalidatePath surface
  change; `.env.example` unchanged; no src/ change survives the mutation
  demo (the temporary edit is restored and verified).
- The census measures the home page only — a test-only round cannot drift
  it; the ritual still runs as the verdict (trap #40's discipline).

## 7. Execution record

| # | Task | Result |
|---|---|---|
| 1 | admin.spec.ts describe | ✅ NEW describe "admin event-write path (F-HH, session-37)" — ONE case (two mutation legs inside), offline-minted admin session (the a11y M-1/L-3 pattern at DESCRIBE scope — `test.use` storageState with the HMAC'd `aurelia_session` cookie; `beforeAll` inserts the Session row via `prisma db execute` INSERT…SELECT, `afterAll` drops it; ZERO logins — the 10/10 admin bucket untouched); the case resolves ORD-2026-002 + its BASELINE event ids at RUNTIME via dbRead (never hardcoded), drives the real form (leg A: status `in_transit → processing` + Save; leg B: run-unique tracking `1ZFHH<hex>` + Save after a reload re-anchors the form on server truth), asserts the server-truth rows beyond the baseline-id set (leg A: EXACTLY 1 `status_changed` row, `actor:'admin'`, note `'in_transit → processing'`; legs A+B: EXACTLY 2 rows, leg B's `tracking_added` note `DHL — 1ZFHH…`, leg A's note still exact), the admin timeline render as SUPPORTING (reload + verbatim note text), and the finally restoring the CAPTURED runtime state + deleting exactly the minted rows (baseline-id NOT IN diff — collision-proof against the seed's own `processing → in_transit` note); typecheck ✓; eslint ✓ (the new imports: spawnSync/unlinkSync/createHmac/randomBytes/E2E_AUTH_SECRET); GREEN **16 passed** (7 existing uniques + 1 F-HH unique) × 2 + 2 setups outside the summary (46.4s) |
| 2 | Mutation demo | ✅ the status-change `tx.orderEvent.create` dropped (the exact silent-emptiness regression shape — the toast still says "Order updated.") → REBUILD → **exactly the 2 F-HH case-runs failed** (`expect(rows.length).toBe(1)` received **0** — the dbRead server-truth count is the load-bearing witness, the failure landing at admin.spec.ts:405; the existing "admin can update an order" mutation case + all other cases stayed green — the gap's exact shape: the toast-asserting case CANNOT see the dropped write) → restored via inverse edit (`git diff` on src/ empty; both `orderEvent.create` calls rg-verified at :55 and :78) → rebuild → 16/16 green |
| 3 | Round-32b census + screenshots | ✅ **ZERO DRIFT** — byte-identical to 32a in ALL census fields (39th/40th consecutive): desktop pageH 11079 (ref) / 11085 (clone), mobile 11257 (ref) / 11264 (clone), mainKids 11 BOTH sides both viewports, drawer panelCls `w-80` + navCls `flex flex-col gap-5 mt-4` char-identical, gaps [20,20,20,20], 5 items both sides — the v4 mobile-nav pin holds; the clone's mobile-menu behavior re-verified (click Women → `/shop?category=women`, menu closed, `body.overflow` restored); clone console clean. 10 screenshots refreshed (live-variance pattern): clone-home-desktop, clone-mobile-home, clone-mobile-menu-open, clone-shop-plp, clone-pdp, clone-login, clone-cart, clone-account, clone-admin-dashboard (all from the running dev server, real logins) + ref-mobile-menu-open (re-captured from the live reference through the logged-in agent-browser session) |
| 4 | Final gates on the final tree | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **262 passed + 2 skipped** (132 unique × 2 − 2 desktop-only skips; the +2 setup projects pass outside the case-run summary; 5.6m) — the THIRTIETH consecutive fully-green session, exactly the §5 count ledger (131→132 unique, 260→262 passed); the F-HH case-runs green on BOTH projects (3.3s chromium / 2.4s mobile) |
| 5 | Docs alignment + stale-count sweep | ✅ README (badge 173+262, the Admin row + the event-write pin, testing/status/commands rows 132); CLAUDE.md (gate line 132 + the F-HH gate in the chain, NEW F-HH testing bullet, commands 132); PAD (test table 18\|132\|262, §7.3 command 132, the §7.1 coverage-map session-37 extension); SKILL v1.30.0 (frontmatter version/project_state, §2 E2E row + F-HH, §11 132, Appendix B NEW session-37 row); AGENTS.md (the security line gains the F-HH gate); docs/remediation-plan-session37.md (this record); worklog; docs/session_43.md (the round's narration log — session_42.md taken by the pulled commit). Stale-count sweep: zero stale counts |

## 8. Residual risks / next steps (post-F-HH)

1. The merge's transaction-atomicity half (H-29) stays pinned by
   source-read only — wire fault-injection into a SQLite tx is not
   reachable from Playwright (carried).
2. The success gate's foreign-owner row stays covered-by-shape (carried).
3. `/api/search`'s 429 path unpinned by design (the limiter-reset harness
   would relax the budget for every 429-shaped pin; carried).
4. The search 503 / health `db:false` deliberate-failure shapes stay
   pinned by source-read + success-path only (carried).
5. The PDP og:image annotation / og:type union / `style-src
   'unsafe-inline'` exceptions (carried, sessions 26–36).
6. Real PSP behind the checkout seam (carried).
7. Dev-toolchain npm-audit findings (11, all dev-only) — carried.
8. G-3 POSIX-only sweep paths (carried).
9. The action-seam gate couples to the standalone manifest shape (carried).
10. The zero-drift streak is a streak, not a guarantee — the census
    ritual stays mandatory. Twelve stable rounds since the round-21 move.
11. security.txt `Expires` (2027-11-01) renewal cadence (carried).
12. The canonical convention delta / `/shop` og:url convention (carried).
13. The sweep tool inherits the shell's `AUTH_SECRET` (carried; this round
    measured the census through agent-browser instead).
14. `NewsletterSubscriber` stays outside global-setup's wipe list
    (carried).
15. HSTS on http://localhost inert by construction (carried).
16. The register bucket is 8 < 10 — ONE more register-per-project case
    fits before the shared "local" bucket saturates; future auth-flow
    pins should prefer a NO-REGISTER shape (the F-HH offline-session
    pattern is exactly that — reusable for any admin-side pin).
17. The F-BB spec comment's limiter arithmetic undercount stays as-is
    (carried; a comment is not a gate).
18. The admin event-write path's NOTE-FORMAT contract (the
    `<old> → <new>` arrow and the G-11 join) is now pinned at the wire
    for BOTH legs; the remaining write-side surface is the product
    stock/activation action (`adminUpdateProductAction`) — it mints no
    events by design (no OrderEvent semantics), carried-by-shape.
19. `docs/luxury-fashion-store-dashboard.png` (referenced by the task
    brief) does not exist in the repo (404 on blob + raw) — the live
    logged-in reference served as the comparison target this round; if
    the operator adds the image later, diff it against
    `docs/screenshots/clone-home-desktop.png`.
