# Remediation Plan — Session 47 (F-RR: the address seam's IDOR walls — three owner-checks, zero gates, one wire-measured harness)

The session-46 continuation round. Per the standing precedent: audit the pulled
HEAD (`aa1eaa8` — the parallel thread's session-log commit + the skills/ folder
removal), re-verify the baseline, re-probe the reference platform FIRST THING
(§12 item 14), run the fresh audit pass, then close the strongest finding with
a TDD gate.

## 1. Starting state

- NO workspace reset this round — the standing tree was intact (node_modules,
  the canonical 3-line `.env` with `DATABASE_URL="file:../db/custom.db"`,
  `db/custom.db` + `db/e2e.db` materialized, the built standalone). `git pull`
  fast-forwarded `16c3f2c → aa1eaa8`.
- HEAD `aa1eaa8` = remote `main`, verified up to date.
- The committed tree's contract: 173 unit (19 files) · 141 unique E2E × 2
  device projects − 2 desktop-only skips = **280 passed + 2 skipped** ·
  typecheck ✓ lint ✓ build ✓.

## 2. Audit of `aa1eaa8` (the pulled HEAD) — first-hand

`git log --name-status aa1eaa8` (path-limited; the tree enumeration of a
2,612-file diffstat times out in this sandbox) → **two changes**:

1. `docs/session_62.md` (+85) — the parallel thread's raw narration transcript
   of the SAME session-46 round (the F-QQ gate + the round-41 census + the
   five-docs alignment); its ledger matches `16c3f2c`'s actual work (test-only,
   zero `src/`, the F-QQ describe + the probe script + 11 screenshots + SKILL
   v1.39.0). Docs-only, RETAINED (never overwrite another thread's log).
2. **The `skills/` folder deleted wholesale** (~2,600 files, −1.38M lines) —
   the repo-hygiene follow-through of the standing "the repo included
   `skills/` folder is to be excluded from code checking, testing and
   compilation" directive. The removal touches NOTHING the build, the tests,
   or the runtime ever read (verified: zero `skills/` references in
   package.json, tsconfig, eslint, vitest, playwright configs, src/). The
   workspace-level skills inventory (`/home/z/my-project/skills/` + the
   catalog docs inside the repo's `docs/`) remains available as AUDIT-side
   reference material. RETAINED.

This round's narration ships as `docs/session_63.md` (session_62.md taken by
the pulled commit).

## 3. Reference platform re-probe (§12 item 14 — FIRST THING)

The live reference (Base44) answered **HTTP 503 on both `/` and `/login`** at
the round's start — the sessions-44/45/46 outage, now the FOURTH consecutive
round. Handled per the honest-outage precedent (§9): the census runs
clone-side ×2; the reference-side fields carry by documentation from the
round-38 live measurement; the WOMEN-inert posture re-check + the 2 ref
screenshots stay DEFERRED; one final re-probe before the final gates.

## 4. Baseline re-verification (the standing tree)

- typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build + assemble ✓
- E2E **280 passed + 2 skipped** (141 unique × 2; 6.3m) — the 48th
  consecutive session fully green at baseline, exactly matching session-46's
  final gates.
- The standing Tailwind v4 / mobile-nav pins re-verified first-hand during
  the audit (mobile-nav.tsx:76 `flex flex-col gap-5 mt-4`, the `w-80` panel
  at :59, 26 full `hsl()` literals in globals.css `@theme`).
- The sandbox quirk honored: the shell exports a parent-workspace
  `DATABASE_URL` — every DB-touching command ran under `env -u DATABASE_URL`.

## 5. Fresh audit pass — the round's finding

The session-46 plan §12 named the next candidates: "the carried
documentation/infrastructure items (the PDP og:image annotation, the real
PSP, npm-audit dev-only findings, security.txt renewal)". But the fresh
audit pass's first discipline is the seam-census over the mutation surface —
and it found a **HIGH-severity ungated security class** that outranks the
documentation items: the address book's three IDOR owner-checks.

### 5.1 F-RR — the address seam's IDOR walls (account.ts)

Every address action guards cross-user access with the same wall:

| Seam | The wall (src/lib/actions/account.ts) | The ungated shape |
|---|---|---|
| `saveAddressAction:91` (edit path) | `if (!existing \|\| existing.userId !== user.id) return fail("That address no longer exists.")` | the check dropped → any signed-in customer OVERWRITES another user's address fields by crafting the edit call with the victim's address id — the attacker's toast reads "Address saved." while the victim's row silently changes (the integrity class: a corrupted street ships the victim's future orders to an attacker-chosen address) |
| `deleteAddressAction:112` | same wall | the check dropped → any signed-in customer DESTROYS another user's address row by id (victim data loss) |
| `setDefaultAddressAction:122` | same wall | the check dropped → any signed-in customer flags the victim's row as THEIR default: the exclusive-default transaction runs cross-user (the victim's row gets `isDefault: true` while the ATTACKER's own defaults are cleared — exclusivity corruption for both books) |

### 5.2 Wire-blindness (verified against the committed suite)

- `tests/e2e/account-addresses.spec.ts` — the address seam's ONLY spec —
  covers the caller's OWN address end-to-end (add → edit-prefill → update →
  set-default → delete, H-4/H-8). Every consume passes the caller's own ids;
  a dropped owner-check changes nothing for the own-id flows.
- The action-seam security gate (H-59 + the IDOR census) probes the PDP
  route's FOUR action ids (cart/wishlist) — zero address-action coverage.
- The account page renders only the caller's rows (`findMany({ where: { userId:
  user.id } })`) — the foreign row never appears in any UI, so the harm is
  **invisible at the wire surface**: only server-truth reads can prove the
  victim's row survived (or did not).
- The F-DD precedent closed the SAME class for the order-detail surface
  ("a foreign/guest order 404s with no existence leak"); the address seam's
  three walls predate it (session-5) and were never gated.

### 5.3 The attack surface is real (measured, not assumed)

- The `/account` route's server-reference-manifest exposes **exactly EIGHT
  action ids** (read first-hand from the built standalone): adjust/remove
  (cart), changePassword/saveAddress/updateProfile/deleteAddress/setDefault
  (account), logout (auth) — all wire-addressable via the established
  crafted-POST protocol (`Next-Action: <id>` header; JSON-array body for the
  plain-string-arg actions; the F-QQ multipart shape for the `(prev,
  formData)` edit path).
- `deleteAddressAction(addressId: string)` and `setDefaultAddressAction(addressId:
  string)` take a single string arg — the `[itemId]` JSON shape the
  action-seam gate already proved on `removeCartItemAction`.
- `saveAddressAction(_prev, formData)` is the F-QQ fetch-action shape:
  multipart where the `_1_*` fields (label/fullName/street/city/state/zip/
  country/id) MUST precede the flight row `"0"` = `[null,"$K1"]`; Zod
  (addressSchema) runs BEFORE the owner check, so the crafted payload must be
  a VALID address to reach the wall.
- The actions are NOT rate-limited (no `rateLimit` in account.ts — verified),
  so the gate consumes no limiter budget; the auth wall
  (`getCurrentUser() → "Sign in to manage your address book."`) runs FIRST in
  all three actions.

### 5.4 Why this outranks the named candidates

The carried ledger's next items are documentation/infrastructure class (the
og:image annotation is a served-metadata polish; the PSP is a product-scope
carry; npm-audit is dev-only). F-RR is the **IDOR write-class on
PII-bearing rows** — the same severity F-DD judged gate-worthy, and the house
style (sessions 21→46) has consistently prioritized mutation-seam security
gaps over polish items. The source checks are CORRECT today (zero product
defect); what is missing is the GATE — a dropped wall rides through with
every existing case green (the silent-class definition).

## 6. Plan-probe discipline (run BEFORE the spec)

`scripts/plan-probe-session47.cjs` — the throwaway healthy-copy standalone on
:3209 (the F-PP/F-QQ copyFile pattern; the address actions need working DB
reads), wire-verifying every F-RR assumption:

1. the server BOOTS and LISTENS against the healthy throwaway copy
   (`/api/health` → 200 + `{"ok":true,"db":true}` — the spawn-works control);
2. the /account manifest exposes exactly EIGHT ids; the three address actions
   identified by `exportedName` (the build-shape canary);
3. **the unauthenticated half**: cookie-less crafted POSTs to
   deleteAddressAction + setDefaultAddressAction (JSON `[victimId]` shape)
   answer `"Sign in to manage your address book."` (the auth wall — 200
   envelopes, never 5xx);
4. **LB1 (the IDOR walls)**: the minted james session (offline SQL mint on
   the COPY: a Session row with FUTURE expiry + the HMAC cookie contract)
   posts the victim id (an address minted for the ADMIN user) to all three
   actions — delete + setDefault via the JSON shape, saveAddress edit via
   the multipart shape — each answers `"That address no longer exists."`
   AND the victim row SURVIVES byte-identical (server-truth Prisma read:
   street + isDefault + the row's existence);
5. **LB2 (the control — the false-positive guard)**: the SAME wire shapes
   against james's OWN minted address — the writes SUCCEED server-truth (the
   delete removes the own row; the saveAddress edit changes the own row's
   street) — proving the mint works, the protocol reaches the DB layer, and
   the denial in LB1 is the OWNER CHECK, not a broken harness;
6. zero victim-writes: the victim row byte-identical from before the ladder
   to after (the delta proof);
7. the finally SIGTERMs the child (SIGKILL escalation) and removes the
   tmpdir; per-request AbortController guards (the session-45 hardening
   lesson).

## 7. Remediation design (TDD)

NEW describe **"address IDOR walls (F-RR, session-47)"** at the END of
`tests/e2e/account-addresses.spec.ts` (the OWNING spec — the address seam's
own; the file's uniques 1 → 2).

- **ONE case, request-level** (no browser surface — the F-PP/F-QQ/F-NN
  shape; Node fetch with explicit Cookie headers, so the projects'
  storageState never rides the probes):
  - `beforeAll` mints on `db/e2e.db` (the F-NN SQL-fixture pattern,
    idempotent delete-then-insert): (a) a FRESH session row for james
    (FUTURE expiry, +1 day) — zero logins, zero limiter consumption on the
    auth endpoints; (b) the VICTIM address row for the ADMIN user
    (`INSERT..SELECT` the admin's userId — never hardcoded), uniquely
    `frr-`-prefixed; (c) james's OWN control address row (also `frr-`-
    prefixed);
  - the manifest canary (exactly 8 ids; the three address actions by
    `exportedName`);
  - the unauthenticated fail-closed half (the "Sign in…" envelope × the two
    JSON-arg actions);
  - **LB1 (the walls)**: the authenticated crafted calls vs the VICTIM id —
    delete + setDefault (JSON shape) + saveAddress edit (the F-QQ multipart
    shape, `_1_*` fields before the flight row `"0"`) — each answers
    `"That address no longer exists."`, and the victim row survives
    byte-identical after the whole ladder (server-truth dbRead);
  - **LB2 (the control)**: the same shapes vs james's OWN minted address —
    the saveAddress edit UPDATES the own row's street, then the delete
    REMOVES it (both asserted server-truth; the finally/afterAll belt-
    and-braces deletes the rows regardless);
  - `afterAll` cleans: the prefix-scoped DELETEs for the minted session +
    both address rows (idempotent; global-setup's session wipe is the
    belt-and-braces for the session row).
- **ZERO logins, ZERO registers, ZERO limiter consumption (the address
  actions carry none), ZERO writes to any row the gate did not mint.** The
  UI describe in the same file (its own "E2E HQ" address) is untouched —
  unique labels, serial topology.
- **Count ledger**: 141 → 142 unique cases; 280 → 282 passed + 2 skipped.
  The F-RR case-runs green on BOTH device projects (a request-level seam —
  no viewport dependence).

## 8. Mutation demos (the regression shapes, proven RED)

Each demo: drop ONE action's owner-check (`existing.userId !== user.id`
removed — the `!existing` null-half stays, keeping the own-id flows lawful),
REBUILD, expect **all existing case-runs GREEN** (the wire-blindness proof)
while **exactly the 2 F-RR case-runs fail** at the victim-row assertions:

1. **deleteAddressAction's wall dropped** → james's crafted delete DESTROYS
   the victim row — the case fails at the victim-survives assertion.
2. **saveAddressAction's edit wall dropped** → james's crafted multipart
   edit OVERWRITES the victim's street (the toast-blind silent class — the
   response even reads `"ok":true`) — the case fails at the byte-identical
   assertion.
3. **setDefaultAddressAction's wall dropped** → james's crafted setDefault
   flags the victim's row `isDefault: true` — the case fails at the
   isDefault-unchanged assertion.

All restored via inverse edit (`git diff --stat src/` empty — byte-identical)
→ rebuild → green.

## 9. Validation of this plan against the codebase (pre-execution)

- `account.ts` read first-hand: all three walls verbatim (:91, :112, :122);
  the auth wall first, Zod before the owner check in saveAddress (the
  multipart payload must be a VALID address), the exclusive-default tx
  (`updateMany` own-scope + `update` by id) — the cross-user corruption
  shape named.
- The `/account` manifest read first-hand: exactly 8 ids, the three address
  actions present with `exportedName`s.
- The action-seam gate read first-hand: the crafted JSON-arg POST shape
  (`Next-Action` + `text/plain` JSON array) proven on `removeCartItemAction`
  — the delete/setDefault wire shape.
- The F-QQ describe read first-hand: the multipart fetch-action shape
  (`_1_*` fields BEFORE the flight row `"0"` = `[null,"$K1"]`) — the
  saveAddress-edit wire shape.
- The F-NN describe read first-hand: the offline-mint pattern (Session row
  INSERT..SELECT james's id, FUTURE expiry, HMAC cookie, idempotent
  delete-then-insert, afterAll cleanup) — the session mint.
- `e2e-secrets.ts` read: `E2E_AUTH_SECRET` — the probe's throwaway spawns
  with the same constant (the F-PP/F-QQ spawn env contract).
- `validation.ts` read: `addressSchema`'s bounds (label ≤ 40, fullName ≤ 80,
  street ≤ 160, city ≤ 80, state ≤ 40, zip 3..12, country ≤ 80) — the
  crafted payload shape.
- `prisma/schema.prisma` read: the Address model's exact columns (no
  timestamps) + the Session model's columns — the SQL mints.
- The account page read first-hand: `findMany({ where: { userId: user.id } })`
  — the foreign row never renders (the harm is server-truth-only; the wire
  envelope is the only observable on the attack side).
- `playwright.config.ts` re-read: `workers: 1` serial topology (the mint
  window is quiescent); request-level cases carry no viewport dependence
  (the F-QQ precedent).
- The probe/spec port contract: the throwaway probe on :3209 (F-PP/F-QQ's
  probe port — never :3100/:3211/:3212/:3213); the SPEC needs no throwaway
  at all (no limiter, no cross-run pollution — the F-NN main-DB mint shape).
- Trap #13 honored: `process.cwd()`-based paths in the spec (the Playwright
  loader compiles TS as CJS; `import.meta` unavailable).

## 10. Round-42 parity census (the standing ritual)

**ENVIRONMENT: the live reference (Base44) answered HTTP 503 at the round's
start** (the sessions-44/45/46 outage, now the fourth consecutive round).
Handled per the honest-outage precedent: the census runs **CLONE-side ×2**
(42a on the post-restore build with `--shots`; 42b after the post-dev
rebuild), both viewports, against the round-38/39/40/41 clone-side ledger
(desktop 11085, mobile 11264, mainKids 11, footers 444/1189, the drawer's
`flex flex-col gap-5 mt-4` + gaps [20,20,20,20] — the v4 mobile-nav pin);
the reference-side fields CARRY BY DOCUMENTATION from the round-38 live
measurement; the WOMEN-inert posture re-check + the 2 ref screenshots stay
DEFERRED while the platform is down. The clone's mobile-menu behavior
verified end-to-end on the dev server (`rm -rf .next` first;
`env -u DATABASE_URL` boot — the session-39/40 lessons). The reference gets
one final re-probe before the final gates; if it recovered mid-round, the
full two-sided sweep runs then.

## 11. Final gates + docs

- typecheck ✓ lint ✓ 173/173 unit ✓ build ✓ E2E **282 passed + 2 skipped**
  (142 unique × 2) — the 48th consecutive fully-green session.
- Screenshots refreshed (the sweep's clone shots + the dev-server set).
- Docs aligned: SKILL (§2 E2E row + F-RR; §11 142; Appendix B NEW session-47
  row), README, CLAUDE.md, PAD, AGENTS.md, this plan's execution record,
  worklog, `docs/session_63.md`; `.env.example` unchanged and matching the
  codebase; stale-count sweep zero.
- One main-branch commit pushed via the SSH wrapper v3
  (`--remote git@github.com:nordeim/luxury-fashion-store.git`).

## Execution record

| # | Task | Result |
|---|---|---|
| 1 | Plan probe | ✅ `scripts/plan-probe-session47.cjs` — **14/14 checks passed** on the throwaway healthy-copy standalone on :3209: boot + `{"ok":true,"db":true}`; the /account manifest's exactly 8 ids with the three address actions by exportedName; the cookie-less probes answering the auth wall ("Sign in to manage your address book."); **the authenticated explicit-Cookie half verified FIRST-HAND** — `cookies()` reads the explicit header inside the action (the F-NN mint's HMAC cookie, the round's new wire fact); all three walls answering the owner envelope with the victim row surviving byte-identical; the OWN-id controls proving the same wire shapes write (edit → street updated, delete → row gone, setDefault → flag flipped — the false-positive guard); the minted session row surviving (FUTURE expiry, no prune); zero dev-DB/e2e.db writes (the copy deleted with its tmpdir) |
| 2 | account-addresses.spec.ts describe | ✅ NEW describe "address IDOR walls (F-RR, session-47)" at the END of `tests/e2e/account-addresses.spec.ts` (the OWNING spec — the address seam's own; the file's uniques 1 → 2), ONE request-level case (Node fetch + explicit Cookie headers — the projects' storageState never rides the probes): beforeAll mints james's session (FUTURE expiry +1d) + the ADMIN-owned victim address + james's own control address (idempotent delete-then-insert, `frr-`-prefixed); the ladder — the manifest canary (exactly 8 ids; the three address actions by exportedName) → the auth-wall half (cookie-less "Sign in…") → **LB1** (the three walls vs the victim id: delete + setDefault via the JSON-arg shape, saveAddress edit via the F-QQ multipart shape — each answers "That address no longer exists." and the victim row survives byte-identical server-truth) → **LB2** (the controls: the same shapes vs the OWN id SUCCEED — edit writes the street, delete removes the row, setDefault flips the flag) → the zero-victim-writes final delta; afterAll deletes the prefix-scoped rows. ZERO logins, ZERO registers, ZERO limiter consumption (the address actions carry none), ZERO writes to any row the gate did not mint. typecheck ✓ eslint ✓; GREEN **6 passed** (2 uniques × 2 + 2 setups; F-RR ~1.7s on BOTH projects) |
| 3 | Mutation demo 1 (delete wall dropped) | ✅ deleteAddressAction's `existing.userId !== user.id` half dropped (the `!existing` null-half stays — own-id flows lawful) → REBUILD → **the UI case-run GREEN on both projects** (the wire-blindness proof: the UI spec consumes only own ids) while **exactly the 2 F-RR case-runs failed** at the delete-wall envelope assertion (line 254 — the crafted delete answered a success/redirect stream, not the owner envelope) → restored via inverse edit |
| 4 | Mutation demo 2 (saveAddress edit wall dropped) | ✅ saveAddressAction's edit-path owner-half dropped → REBUILD → the UI case GREEN, the delete-wall step GREEN (its wall intact — the ladder orders the walls) while **exactly the 2 F-RR case-runs failed** at the edit-wall envelope assertion (line 277) → restored via inverse edit |
| 5 | Mutation demo 3 (setDefault wall dropped) | ✅ setDefaultAddressAction's owner-half dropped → REBUILD → the UI case GREEN, the delete + edit steps GREEN while **exactly the 2 F-RR case-runs failed** at the setDefault-wall envelope assertion → restored via inverse edit → `git diff --stat src/` EMPTY (byte-identical) → rebuild → **6/6 green**. All three walls independently gated |
| 6 | Round-42 census + screenshots | ✅ **ENVIRONMENT: the reference (Base44) answered 503 at the round's start, across the census window, and at the final re-probe** (the sessions-44/45/46 outage unbroken — the FOURTH consecutive round). **CLONE-side ×2 (42a on the post-restore build + 42b on the post-dev-rebuild): ZERO DRIFT — byte-identical to the round-38/39/40/41 clone-side ledger in ALL census fields**: desktop pageH 11085 / mainKids 11 / footerH 444, mobile pageH 11264 / mainKids 11 / footerH 1189, the drawer char-identical (panelCls `w-80` + `flex flex-col gap-6` + navCls `flex flex-col gap-5 mt-4`, gaps [20,20,20,20]) — **the v4 mobile-nav pin holds** (the standing task re-check); clone console clean both censuses. The reference-side fields CARRY BY DOCUMENTATION from the round-38 live measurement; the WOMEN-inert posture re-check + the 2 ref screenshots stay DEFERRED (§12 item 13). **The clone's mobile-menu behavior verified end-to-end on the dev server** (`rm -rf .next` first; `env -u DATABASE_URL` boot; the sandbox's detached-process-group kill honored — boot + probe + kill in ONE foreground command): burger → drawer (dialog:1) → overflow hidden → **Women → `/shop?category=women` NAVIGATION LANDS (8 product cards rendered)** → menu closed → overflow restored → zero console/page errors. Harness note: the session-38 probe's fixed 800ms post-click wait races the dev soft-nav in this slower sandbox — `scripts/dev-nav-settle-session47.cjs` (the round's settle probe) waits the URL explicitly (10s bound) and lands the navigation every time; a HARNESS timing note, NOT a product bug (the production standalone's navigation stays pinned green by mobile-navigation.spec.ts). Screenshots: 11 refreshed (the census's 7 clone shots + the dev-server login set via `scripts/dev-shots-session39.cjs`: clone-login/cart/account/admin-dashboard — zero console errors); 13 of 15 byte-identical to the committed versions (deterministic rendering — itself a zero-drift signal); the 2 differing (clone-mobile-home, clone-mobile-menu-open) are the documented timing-dependent class (hero carousel / live countdown ticks — geometry pins byte-stable); the dev cart's row cleaned via `scripts/dev-hygiene-session46.cjs`, canonical 4/12/2/4 re-verified |
| 7 | Final gates on the final tree | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **282 passed + 2 skipped** (142 unique × 2 − 2 desktop-only skips; 6.4m) — the FORTY-EIGHTH consecutive fully-green session, exactly the §7 count ledger (141→142 unique, 280→282 passed); the F-RR case-runs green on BOTH device projects (~1.7s each) |
| 8 | Docs alignment + stale-count sweep | ✅ SKILL v1.40.0 (frontmatter 282/142 + the F-RR gate; §2 E2E row + F-RR; §11 command 142; Appendix B NEW session-47 row with the explicit-Cookie wire note + the dev-nav settle-probe harness note); README (badge 173+282, the Testing architecture row's F-RR pin + 142, the Testing command block 142, the status row's F-RR entry + 142); CLAUDE.md (gate line 142 + the F-QQ→F-RR chain + the NEW F-RR segment + commands 142); PAD (test table 18\|142\|282, §7.3 command 142, the coverage-map session-47 extension); AGENTS.md (the security line's F-RR gate + the E2E command row 142); docs/remediation-plan-session47.md (this record); scripts/plan-probe-session47.cjs + scripts/dev-nav-settle-session47.cjs (the round's probe artifacts). `.env.example` unchanged and matching the codebase. Stale-count sweep over the five living docs: zero stale counts |

## 12. Residual risks / next steps (post-F-RR)

1. The merge's H-29 transaction-atomicity half stays source-read-only
   (wire fault-injection into a SQLite tx is not Playwright-reachable;
   carried).
2. The success gate's foreign-owner row stays covered-by-shape (carried).
3. The PDP og:image annotation / og:type union / `style-src 'unsafe-inline'`
   exceptions (carried, sessions 26–46) — now the FIRST named candidate for
   the next round.
4. Real PSP behind the checkout seam (carried).
5. Dev-toolchain npm-audit findings (11, all dev-only) — carried.
6. The cart/wishlist sweeper-anchor touch writes (cart.ts:39/41) stay
   source-read-only (carried).
7. The zero-drift streak is a streak, not a guarantee — the census ritual
   stays mandatory.
8. security.txt `Expires` (2027-11-01) renewal cadence (carried).
9. `NewsletterSubscriber` stays outside global-setup's wipe list
   (carried).
10. The sandbox kills detached process groups — long gates in the
    foreground (carried, honored again this round).
11. `rm -rf .next` before `npm run dev` after build-heavy rounds, then
    rebuild before re-running the sweep (the session-39/40 lessons).
12. The F-OO/F-PP/F-QQ throwaway-server harnesses spawn a child process
    per case-run (6 per full suite run, ~2s boot each) — amortization
    candidate (carried).
13. The reference platform's 503 outage (Base44 — down through sessions
    44/45/46/47 census windows) keeps the two-sided census's reference
    half, the WOMEN-inert posture re-check, and the 2 ref screenshots
    DEFERRED; the NEXT round re-runs the full two-sided sweep FIRST THING
    if the platform recovered (carried forward).
14. With F-RR, every address-book mutation seam's owner-wall owns a gate;
    the next seam-census should sweep the ADMIN mutation actions
    (adminUpdateOrderAction's role wall is gated via the offline-mint admin
    session precedent; adminUpdateProductAction's role wall + field
    validation gates — the next audit pass's first check).
