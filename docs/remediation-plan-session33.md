# Remediation Plan — Session 33 (AURELIA / VELOUR clone)

> **Status:** PLANNED → EXECUTED this round (the session-32 continuation, named
> for the next session number per the standing precedent).
> **Mode:** Verify-first (Mode C) → reconciliation of the pulled remote
> (`1c7fb3d` the session-32 F-CC round + `1704740` its session log +
> `bebf2e3` the duplicate session-log commit `docs/session_34.md` — a
> parallel thread's narration of the SAME session-32 round, docs-only,
> zero code) → first-hand audit → live-reference parity sweep round 28 →
> fresh audit pass → one gate-coverage remediation (**F-DD**). **Scope:**
> the session-32 commit audited TRUE first-hand (the F-CC describe verified
> in full source AND re-run green on the fresh build: **26 passed** = 12
> unique × 2 + 2 setup, exactly the ledger shape); **`bebf2e3` audited
> docs-only** (one file, 74 insertions — the narration log; no code, no
> config, no tests); **the round-28a census measured ZERO DRIFT** (31st/32nd
> consecutive clone-side sweeps — the reference byte-stable against the
> round-24 ledger, mainKids 11 both sides both viewports, pageH
> 11079/11085 + 11257/11264, footers 444/1189, drawer char-identical
> `w-80` + `flex flex-col gap-5`, gaps [20,20,20,20] — the v4 mobile-nav
> pin holds, the standing task re-check; ref console = the documented 2×
> 401 residue, clone clean); **the fresh pass opened one surface no prior
> round ever loaded** — the account order-detail page
> (`/account/orders/[id]`, `src/app/(storefront)/account/orders/[id]/page.tsx`)
> — a **zero-coverage seam carrying TWO declared contracts**:
>
> 1. **The owner IDOR gate**: `if (!order || order.userId !== user.id)
>    notFound();` — a signed-in customer opening another party's order URL
>    must get the platform not-found card. The canonical seed ships the
>    perfect probe target: `ORD-2026-004` is a GUEST order (`userId: null`),
>    so any signed-in customer's id fails the equality and the page must
>    404. A dropped or reordered check would serve any order's full body —
>    items, total, payment last-4, and the complete shipping address — to
>    any signed-in customer, with every gate green.
> 2. **The F-16 privacy filter**: `order.events.filter((e) => e.actor !==
>    "admin")` — admin-authored `OrderEvent` rows (internal notes like
>    `processing → in_transit` / `DHL — TRK…`) must never render on the
>    customer's Order Progress timeline. Declared in FOUR source places:
>    the `OrderEvent` model header in `prisma/schema.prisma` ("admin"
>    events are hidden from the customer order view — replacing the brittle
>    `note.includes("admin@")` heuristic"), the admin action's comment
>    (`src/lib/actions/admin.ts` "clean note (no admin email in
>    customer-visible timelines)"), the page's own filter comment, and the
>    seed's G-6/H-10 admin-backfill comment ("must not re-leak events into
>    customer timelines (the customer view filters actor==='admin')").
>    A dropped filter leaks every internal admin note to the customer body
>    with every gate green.
>
> The admin mutation itself IS wire-exercised (`admin.spec.ts` "admin can
> update an order: status, carrier set, carrier clear" — server-truth
> reload assertions), but its **event minting and the customer-side
> visibility are asserted nowhere**, and the account order-detail SURFACE
> is visited by zero tests (`rg "account/orders" tests/` → no matches).
> **F-DD**, LOW gate-coverage, zero product defect (the page serves
> correctly today — verified first-hand by this round's plan probe, 17/17).
> Same family as F-Y/F-AA/F-BB/F-CC: a declared contract the gates never
> exercise.

---

## 1. Starting state

WARM workspace fast-forwarded `1704740..bebf2e3` (the pull brought ONLY
`docs/session_34.md` — a parallel thread's duplicate narration of the
session-32 round; docs-only). **ZERO sandbox reset incidents this round**
— the recurring reset set fully survived for the second time in the
ledger (the session-31 round was the first):

| Step | Result |
|---|---|
| `git pull` | ✓ fast-forward to `bebf2e3` (docs/session_34.md only); `skills/` intact (283 entries); no stray `bun.lock` |
| `.env` | ✓ `DATABASE_URL="file:../db/custom.db"` (the relative contract survived) |
| `bin/ssh` shim + paramiko | ✓ shim present (venv shebang) + paramiko 5.0.0 in `/home/z/.venv` |
| Playwright cache | ✓ both builds present (chromium-1200 + chromium-1248 matching @playwright/test 1.64.1) |
| `db/custom.db` | ✓ canonical 4/12/2/4 (Prisma count verified directly) |
| `core.fileMode false` | ✓ survived |
| node_modules | ✓ synced to the lockfile (next 16.4.2, react 19.3.1, @playwright/test 1.64.1, tailwind 4.3.3, prisma client 6.19.3 — verified from the installed packages) |

**Baseline gates on the committed tree (TWENTY-FIFTH consecutive session
fully green at baseline):** typecheck ✓ · lint ✓ · **173/173 unit (19
files)** ✓ · build + assemble ✓ (E2E runs at the final gate).

## 2. Audit of `1c7fb3d` (session-32) and `bebf2e3` (the log commit) — first-hand

`1c7fb3d` composition (13 files): the checkout-gate F-CC describe (+99
lines net, 1 case), the new `scripts/plan-probe-session32.cjs` (167
lines, 19 checks), the plan (333 lines), 4 screenshot re-captures,
README/CLAUDE/PAD/AGENTS/SKILL v1.25.0 alignment, worklog. Claims
verified against the final tree:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | The F-CC describe drives the real guest COD flow in a fresh logged-out context and direct-fetches the capability matrix | `tests/e2e/cart-checkout.spec.ts` read in full: the describe at :296+, `test.use({ storageState: { cookies: [], origins: [] } })`, the proven COD selectors, the captured pair shape-asserted (`ORD-\d{4}-\d{3}` + 40-hex), the four-variant matrix each asserting 404 + "Page Not Found" + no-PII, the cross-order token computed OFFLINE via `E2E_AUTH_SECRET` | TRUE |
| 2 | The checkout gate is GREEN on the fresh build | `npx playwright test tests/e2e/cart-checkout.spec.ts` re-run: **26 passed** (12 unique × 2 + 2 setup; 52.9s) | TRUE |
| 3 | The plan-probe artifact exists and matches its contract | `scripts/plan-probe-session32.cjs` present (167 lines); its assumptions permanently encoded in the green F-CC spec | TRUE |
| 4 | Docs aligned (SKILL v1.25.0 frontmatter 126+250+2; README badge 173+250; CLAUDE gate line 126 + the F-CC bullet; PAD 17\|126\|250; AGENTS the F-CC gate line) | all five docs read this round; counts consistent; stack tables 16.4.2/19.3.1/1.64.1 | TRUE |
| 5 | No production change (test-only round) | `git show 1c7fb3d --stat`: tests/docs/screenshots/scripts/worklog only; `src/app/(storefront)/checkout/success/page.tsx` absent (the mutation demo restored) | TRUE |

`bebf2e3` composition (1 file): `docs/session_34.md` (+74) — a parallel
thread's narration log of the SAME session-32 round (its opening line
cites the session-31 task book trace `1a149c0c1fc9a0d9`). No code, no
config, no tests. The content cross-checks against `1c7fb3d`'s actual
diff (same F-CC shape, same counts, same probe name) — it is a narration,
not a competing implementation. **Verdict: session-32 5/5 claims TRUE;
`bebf2e3` docs-only, zero repo-state impact beyond the log itself.**

## 3. Live reference sweep — round 28a (measured 2026-10-17): ZERO DRIFT

The single-census pre-remediation pass (the 28b `--shots` pass closes the
ritual after the test-only round). The reference is byte-stable against
the round-24 ledger — **31st/32nd consecutive clone-side sweeps**:

| Ledger field | Round-24…27 ledger | Round-28a measured | Verdict |
|---|---|---|---|
| ref desktop pageH / mainKids | 11079 / 11 | 11079 / 11 | byte-stable |
| clone desktop pageH | 11085 | 11085 | byte-stable |
| ref mobile pageH / mainKids | 11257 / 11 | 11257 / 11 | byte-stable |
| clone mobile pageH | 11264 | 11264 | byte-stable |
| footers | 444 / 1189 | 444 / 1189 | byte-stable |
| drawer panelCls/navCls | char-identical | identical | byte-stable — **the mobile-nav v4 pin holds** (`w-80` + `flex flex-col gap-5`, gaps [20,20,20,20]; the standing task re-check) |
| clone console | clean | clean | byte-stable |
| ref console | the documented 2× 401 residue | identical | documented residue |

Eight stable sweeps since the round-21 move.

## 4. Fresh audit pass — finding (the round's target)

Opened by surface-census cross-referencing: `rg "account/orders" tests/`
returns NOTHING — the account order-detail page has never been loaded by
any gate. The page carries two declared, unexercised contracts (F-DD,
header above). Competing leads verified and dismissed first-hand:

- **The admin order-update mutation** — wire-exercised (`admin.spec.ts`
  drives status → in_transit, carrier set/clear with reload assertions).
  Its EVENT MINTING is unpinned, but that is precisely the customer-side
  half of F-DD (the event exists only to be shown-or-hidden on the
  account surface) — folded into F-DD, not a separate finding.
- **The guest wishlist merge at login** (`mergeGuestWishlistIntoUser`) —
  zero test coverage, but the sibling cart merge IS wire-pinned (the
  `guest cart merge at login` describe) and the wishlist merge carries no
  prose-declared contract of its own (CLAUDE.md names
  `mergeGuestCartIntoUser` only). Documented as a candidate; weaker than
  F-DD (convenience seam vs privacy gate).
- **The login `?redirect=` landing** (H-21's server-side redirect) — zero
  E2E coverage, but the open-redirect VALIDATOR is unit-pinned (9-case
  describe) and the session-31 precedent holds: unit-pinned = covered.
  The landing shape is UX, not a declared security contract.
- **Open-redirect / robots.txt / TRUST_PROXY / oversell / search-429 /
  fault-injection shapes** — carried (session-32 §4).

1. **F-DD — the account order-detail surface is a zero-coverage seam
   carrying the owner IDOR gate + the F-16 admin-note privacy filter.**
   Severity: LOW (gate-coverage gap; the page serves correctly today —
   all 15 probe checks passed first-hand). Remediation: a NEW
   `tests/e2e/account-orders.spec.ts` (the surface's first owning spec —
   no existing spec hosts the account order surface; the F-Z precedent
   applies in reverse: no existing spec's fixtures are reused beyond the
   per-project storageState every spec already rides). Two cases, one per
   contract, so a dropped filter fails exactly its case and a dropped
   owner gate fails exactly its case.

INFO-level (verified, no action):

- The seed ships the IDOR target: `ORD-2026-004` (`userId: null`, guest)
  is canonical — james opening its account URL exercises the exact
  `order.userId !== user.id` rejection with zero SQL writes. The
  customer-owned `ORD-2026-001/002/003` are the positive fixtures.
- The seed's `orderDefs` events carry NO explicit `actor` → the model
  default `"system"` applies → the seed's `status_changed`/`tracking_added`
  rows are customer-visible by construction. The admin-authored rows can
  only come from the admin action — so the probe/spec mint them via the
  SQL fixture (the H-2 pattern), never an extra admin login (the admin
  bucket stays exactly consumed).
- `global-setup` wipes `OrderEvent` rows wholesale at every run start —
  the spec's inserted row dies with the run regardless; the spec still
  self-cleans in `afterAll` (H-24 discipline).
- Residual #20 of session-32 (the `/checkout/success` signed-in-OWNER
  positive path) is NARROWED but not closed by this round: the account
  seam's owner view is pinned here; the success page's `isOwner` branch
  remains documented-residual.

### Honest-gate decisions (run before planning)

- **F-DD adds gate coverage; it changes no product behavior.** The served
  DOM is untouched; the parity census cannot drift (test-only round).
- **No gate is weakened.** No existing spec/case is modified; the new file
  matches the `tests/e2e/*.spec.ts` glob (no playwright config edit); no
  vitest/playwright config changes; no new npm dependencies;
  `.env.example` unchanged; money untouched.
- **ZERO logins.** Both cases ride the per-project james storageState the
  setup projects already minted — the limiter budget is untouched (the
  admin bucket stays exactly consumed; the customer bucket untouched).
  The IDOR target needs no auth at all (the 404 renders for james).
- **SQL fixtures are the only writes** (one `OrderEvent` insert, deleted
  in `afterAll` by id — the H-2/M-1 pattern, `spawnSync` args-array per
  trap #34; global-setup wipes the table anyway).
- **ids resolved at RUNTIME** via the established `dbRead` helper (the
  action-seam pattern) — never hardcoded: global-setup re-seeds canonical
  rows with fresh cuids every run.
- **One case per contract.** Case 1 (privacy): the admin note absent from
  the customer body while the system events stay visible. Case 2 (IDOR):
  the guest order 404s into the not-found card with no existence leak.

## 5. Remediation design (TDD)

### ToDo

| # | Task | Layer | Gate |
|---|---|---|---|
| 1 | `scripts/plan-probe-session33.cjs` — NEW probe: boots the standalone on :3207 against a THROWAWAY copy of `db/custom.db` (zero dev-DB writes), logs james in through the real UI (1 slot on the copy — free), resolves the canonical order ids via Prisma on the copy, and wire-verifies all 15 contract assumptions (the detail renders; system events visible; a SQL-minted admin note hidden; the guest order 404s with no existence leak; zero console errors) BEFORE the spec is written | tooling | node script |
| 2 | `tests/e2e/account-orders.spec.ts` — NEW spec (the surface's first owner): describe "account order detail (F-DD, session-33)", two cases riding the per-project james storageState (ZERO logins): (1) "the customer timeline hides admin-authored events (F-16)" — dbRead resolves ORD-2026-002's id, sqlRun inserts an `actor:"admin"` event with a distinctive note, the page renders 200 with the order number + items + the seed's system events ("status changed", "tracking added") while the admin note is ABSENT from the served body; the row deleted in `afterAll`; (2) "the owner gate rejects a foreign order (IDOR)" — dbRead resolves the canonical guest ORD-2026-004's id, james opens its account URL → 404 + the not-found card + the guest order number ABSENT (no existence leak); spec header documents the zero-login limiter arithmetic + the H-24 self-cleanup | E2E | playwright |
| 3 | Mutation demo (surgical, inverse-restore — traps #37/#39): drop the F-16 filter (`order.events.filter((e) => e.actor !== "admin")` → `order.events`) → REBUILD (trap #16) → exactly case 1 fails (2 projects; case 2 and the rest of the run stay green — the gap's exact shape) → restore via inverse edit, `rg`-verify the original expression, rebuild | process | playwright |
| 4 | Round-28b census — MUST be byte-stable vs the 28a ledger (test-only round; the verdict closes the rest-invariance claim); `--shots` refreshes the screenshot set | parity | sweep tool (--shots) |
| 5 | Final gates on the final tree: typecheck → lint → unit → build → full E2E | gates | npm run verify + test:e2e |
| 6 | Docs alignment: README (badge 173+254, the Orders row gains the account-detail pin, the Testing architecture row, testing/status rows), CLAUDE.md (gate line 128 + a NEW F-DD testing bullet), PAD (test table 18\|128\|254, §7.1 session-33 paragraph), SKILL v1.26.0 (frontmatter version/project_state, §2 E2E row, Appendix B NEW session-33 row), AGENTS.md (the security line gains the F-DD gate), this file's execution record, worklog | docs | stale-count sweep |

### Count ledger (expected post-remediation)

| Metric | Before | After |
|---|---|---|
| unit files / tests | 19 / 173 | 19 / 173 (no new pure seam — the finding is wire-layer) |
| E2E spec files | 17 | 18 (account-orders.spec.ts NEW) |
| unique E2E cases | 126 | 128 (+2 F-DD) |
| E2E result | 250 passed + 2 skipped | 254 passed + 2 skipped (128 × 2 − 2 desktop-only skips; the +2 setup projects pass outside the case-run summary, the established reporting convention) |

## 6. Validation of this plan against the codebase (pre-execution)

- `scripts/plan-probe-session33.cjs` runs FIRST (the session-29…32
  plan-probe discipline): the probe's 15 checks wire-verify every
  assumption before the spec exists (see §7 #1 for the executed results).
- The james storageState is minted by the setup projects
  (`tests/e2e/.auth/{chromium,mobile}.json`) — the new spec rides it with
  `test()` defaults (no `test.use` opt-out): zero rate-budget consumed.
- The `dbRead`/`sqlRun` helpers mirror the action-seam spec's proven
  shapes (`spawnSync` args-array — trap #34; `prisma db execute --file`
  with a scratch `.sql` — the H-2/M-1 pattern; `DATABASE_URL` pinned to
  `file:<repo>/db/e2e.db` explicitly so the helpers never depend on the
  shell's env).
- The OrderEvent model: `actor String @default("system")` — the SQL
  insert MUST set `actor` explicitly (`'admin'`) to mint the
  admin-authored shape (the seed's own rows are system by default).
- The page's event rendering: `e.type.replace("_", " ")` capitalized by
  CSS — the assertions use the DOM text ("status changed", "tracking
  added"), case-insensitive per trap #38.
- The 404 shape is the platform not-found card ("Page Not Found") — the
  same renderer F-CC's matrix pins; the body assertion here is a
  consistency pin, not a new surface.
- The admin action's note shape (`processing → in_transit`) is NOT
  asserted as minted-by-the-action — the probe/spec mint their own row;
  pinning the action's write path would need an admin login (forbidden,
  the exactly-consumed bucket) or a server-action POST (the action-seam
  gate's territory, already covered for authz). The CONTRACT under test
  is the customer view's filter — the read side — which the SQL fixture
  exercises completely.
- No schema/env/seed changes; money untouched; no revalidatePath surface;
  `.env.example` unchanged; the source page untouched by the remediation
  itself (the mutation demo's temporary edit is restored and verified).
- The census measures the home page only — a test-only round cannot drift
  it; the ritual still runs as the verdict (trap #40's discipline).
- `docs/session_34.md` exists (the parallel thread's duplicate log) — the
  round's own narration log ships as `docs/session_35.md` (the next free
  slot; the convention's +1 lands on a taken name this round).

## 7. Execution record

| # | Task | Result |
|---|---|---|
| 1 | plan-probe | ✅ `scripts/plan-probe-session33.cjs` — **17/17 checks passed** (15 designed + 2 granular splits): the copy-DB boot + health; james login through the real UI; /account lists exactly the three customer orders; ORD-2026-002's detail renders 200 (order number, "Placed" heading, item snapshots, "Order Progress"); the seed's system events visible ("status changed", "tracking added", dates); the SQL-minted `actor:"admin"` note ABSENT from the served body while system events stay visible after the insert; the insert verified in the copy DB; james → ORD-2026-004 (guest) → 404 + the not-found card + no existence leak; zero console errors on the detail page — every contract assumption verified BEFORE the spec was written, against a throwaway DB copy (zero dev-DB writes) |
| 2 | account-orders.spec.ts | ✅ NEW spec, describe "account order detail (F-DD, session-33)" — two cases riding james's per-project storageState (zero logins): (1) the privacy filter case (SQL-minted admin note absent, system events visible, order identity visible; the fixture row deleted in a try/finally inside the case — H-24); (2) the IDOR case (the canonical guest order 404s into the not-found card, no existence leak); typecheck ✓; GREEN **6 passed** (2 unique × 2 + 2 setup) |
| 3 | Mutation demo | ✅ the F-16 filter dropped (`order.events` unfiltered) → REBUILD → **exactly the 2 privacy case-runs failed** (1 case × 2 projects; the IDOR case and both setups stayed green — the gap's exact shape) → restored via inverse edit (rg-verified) → rebuild → 6/6 green |
| 4 | Round-28b census (--shots) | ✅ ZERO DRIFT — byte-identical to 28a in ALL census fields (31st/32nd consecutive): mainKids 11 both sides both viewports; pageH 11079/11085 + 11257/11264; footers 444/1189; drawer objects char-identical (the v4 mobile-nav pin holds); ref console = the documented 2× 401 residue; clone console clean — the test-only round proven rest-invisible by measurement; screenshots refreshed (live-variance pattern) |
| 5 | Final gates on the final tree | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **254 passed + 2 skipped** (128 unique × 2 − 2 desktop-only skips; the +2 setup projects pass outside the case-run summary; 5.2m) — the TWENTY-FIFTH consecutive fully-green session, exactly the §5 count ledger (the plan's pre-execution "256" row over-added the setups; corrected to the observed convention) |
| 6 | Docs alignment + stale-count sweep | ✅ README (badge 173+254, the Orders row + the account-detail pin, the Testing architecture row + the F-DD extension, testing/status rows); CLAUDE.md (gate line 128, NEW F-DD testing bullet); PAD (test table 18\|128\|254, §7.1 session-33 paragraph); SKILL v1.26.0 (frontmatter, §2 E2E row, Appendix B NEW session-33 row); AGENTS.md (the security line gains the F-DD gate); docs/remediation-plan-session33.md (this record); worklog; docs/session_35.md (the round's narration log — session_34.md taken by the parallel thread's duplicate). Stale-count sweep: zero stale counts |

## 8. Residual risks / next steps (post-F-DD)

1. The `/checkout/success` signed-in-OWNER positive path (`isOwner`)
   remains unpinned on the wire — NARROWED by this round (the account
   seam's owner view is now pinned; the success-page branch stays
   documented-residual, session-32 §8 #20).
2. The guest wishlist merge at login (`mergeGuestWishlistIntoUser`) stays
   zero-coverage — the cart merge IS pinned; the wishlist merge carries no
   prose-declared contract of its own. Candidate for a future round that
   opens the auth-merge seam.
3. The search 503 / health `db:false` deliberate-failure shapes stay
   pinned by source-read + success-path only (carried, session-32 §8 #1).
4. `/api/search`'s 429 path unpinned by design (carried; a future
   limiter-reset harness would relax the budget for every 429-shaped pin).
5. The PDP og:image annotation / og:type union / `style-src
   'unsafe-inline'` exceptions (carried, sessions 26–32).
6. Real PSP behind the checkout seam (carried).
7. Dev-toolchain npm-audit findings (11, all dev-only) — carried.
8. G-3 POSIX-only sweep paths (carried).
9. The action-seam gate couples to the standalone manifest shape — fails
   loud at the canary by design (carried).
10. The zero-drift streak is a streak, not a guarantee — the two-census
    ritual stays mandatory. Eight stable rounds since the round-21 move.
11. security.txt `Expires` (2027-11-01) renewal cadence (carried).
12. The canonical convention delta / `/shop` og:url convention (carried,
    session-26).
13. The sweep tool inherits the shell's `AUTH_SECRET` (carried; this round
    ran it with the inline dev secret — the documented workaround).
14. `NewsletterSubscriber` stays outside global-setup's wipe list
    (carried).
15. HSTS on http://localhost inert by construction (carried).
16. The admin action's EVENT-WRITE path (the `orderEvent.create` rows the
    mutation mints) stays unpinned at the action layer — minting requires
    an admin login (the exactly-consumed bucket) or a server-action POST
    (the action-seam gate's authz territory). The customer-side read
    contract (the filter) is now pinned; the write side is one
    `tx.orderEvent.create` with a literal `actor: "admin"` — the cheapest
    future pin would ride a limiter-reset harness (§8 #4).
17. `docs/session_34.md` is a parallel thread's duplicate narration of the
    session-32 round — retained as-is (never overwrite another thread's
    log); the round's own narration ships as `docs/session_35.md`.
