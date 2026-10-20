# Remediation Plan — Session 54 (F-YY: the search overlay's UI seam — the typeahead rendering, the trending-chip navigation, the Enter-submit navigation, the hit-click navigation, and the close behavior, all wire-blind; the overlay is one of the reference's only three WORKING features)

The session-53 continuation round. Per the standing precedent: audit the pulled
HEAD (`b1b816b`), re-verify the baseline, re-probe the reference platform FIRST
THING, run the fresh audit pass, then close the strongest finding with a TDD
ladder. Like sessions 50-53 this is a **gate-only round**: the source contract
is CORRECT today (verified first-hand below); what is missing is the GATE —
every overlay half can drop with every existing case green (the silent-class
definition).

## 1. Starting state

- **The workspace WAS RESET this round** (fresh clone at `b1b816b` = `c65338d`
  (session-53's push: the F-XX describe + the probe + docs — zero `src/` delta,
  verified via `git show --stat`) + `docs/session_76.md` (the prior round's raw
  narration; docs-only, RETAINED). The documented recovery sequence ran and is
  proven again: `npm install` (486 packages) → write `.env` (the schema-relative
  `DATABASE_URL="file:../db/custom.db"` contract + AUTH_SECRET +
  NEXT_PUBLIC_SITE_URL + TRUST_PROXY) → `env -u DATABASE_URL npm run db:setup`
  (4 categories, 12 products, 2 users, 4 orders — `db/custom.db` at the repo
  root) → `npx playwright install chromium`.
- Baseline gates on the recovered workspace: typecheck ✓ lint ✓ **173/173 unit
  (19 files)** ✓ build ✓ (the E2E baseline run is recorded in §8).
- Standing pins re-verified first-hand: the F-XX spec present in
  cart-checkout.spec.ts, the isActive wall at cart.ts:59, the cart-line walls
  at :142/:234, the STOCK_SHORT guard at checkout.ts:105/:148, mobile-nav
  `w-80` + `flex flex-col gap-5 mt-4` + `flex flex-col gap-6`, 26 `hsl()`
  literals in globals.css, `.env` written to the contract + `.env.example`
  matching, `db/` at the repo root, both test configs intact.

## 2. Reference platform re-probe (the FIRST-THING directive)

The live reference (Base44) answered **HTTP 503 on both `/` and `/login`** at
the round's start — the sessions-44..53 outage, now the ELEVENTH consecutive
round. Additionally probed in a real browser (agent-browser): the app serves
the platform's "AURELIA isn't available yet / This app isn't available yet"
page — the outage is platform-side, before any login form. Handled per the
honest-outage precedent: the census runs CLONE-side ×2; the reference-side
fields carry by documentation from the round-38 live measurement; the
WOMEN-inert posture re-check + the 2 ref screenshots stay DEFERRED; one final
re-probe before the final gates. If the platform recovers mid-round, the full
two-sided sweep runs then.

## 3. Fresh audit pass — the round's finding (F-YY)

With every mutation seam gated (all 15 server actions + the 3 REST routes +
the sweeper's runtime seam), the fresh audit swept the remaining ungated UI
surfaces — and found the sharpest one: **the search overlay's UI contract is
wire-blind**. The search overlay is one of the reference's only three WORKING
features (login, cart drawer, search overlay — the reference's own search
overlay is one of the three things it actually does), and the clone's version
is a registered superset (typeahead via `/api/search` + submit navigation +
hit-click navigation). The API's own contract is exhaustively gated
(api-contract.spec.ts: the empty-query fast path, the five-field DTO, the
no-hit degradation, the limit clamp, the 405 matrix; F-OO: the 503 degradation
+ the 429 limiter floor) — but the COMPONENT that consumes it
(`src/components/store/search-overlay.tsx`, 159 lines) has ZERO UI-level
coverage:

| Contract half | Source | Gate before this round |
|---|---|---|
| The overlay opens + the input takes focus + the trending chips render | search-overlay.tsx:35-47, 111-128 | **ACCIDENTAL PARTIAL** — security-csp.spec.ts:170-186 opens the overlay as a "parity-safe interaction" for the CSP console check (one click + `getByPlaceholder(/search/i)` visible); the focus contract, the TRENDING SEARCHES block, and the chips' submit wiring are NOT asserted anywhere |
| The typeahead fetch (debounce + abort + `/api/search` + setHits) | search-overlay.tsx:49-68 | **ZERO** — a dropped effect renders no results ever, no test fails |
| The visibleHits stale-query guard | search-overlay.tsx:70-72 | **ZERO** |
| The rendered hit rows (image/brand/name/price — the five-field DTO consumed) | search-overlay.tsx:133-153 | **ZERO** |
| The hit-click navigation to `/product/[slug]` | search-overlay.tsx:139-142 | **ZERO** — a dropped handler means clicking a hit does nothing |
| The Enter-submit navigation to `/shop?search=…` | search-overlay.tsx:76-81, 92-94 | **ZERO** — shop.spec.ts:26/:42 navigates DIRECTLY by URL, bypassing the overlay's submit entirely |
| The trending-chip submit navigation | search-overlay.tsx:117-126 | **ZERO** |
| The no-results guidance | search-overlay.tsx:130-132 | **ZERO** |
| Escape + the X button dismiss the overlay | search-overlay.tsx:38-40, 99-106 | **ZERO** beyond the CSP spec's open-only interaction |

The harm shapes: every half above can drop with the full suite green — a
dead submit (Enter does nothing), a dead typeahead (no results ever render),
a dead hit-click (clicking a result is a no-op), a dead chip (the trending
term navigates nowhere), an undismissable overlay (Escape/X dead). The
search overlay is a PARITY SURFACE (measured live 2026-10-14 — the fixed
inset-0 bg-background/98 backdrop-blur-md overlay with the header row, the
border-b input, and the TRENDING SEARCHES chips); its superset behavior is
the storefront's first search reach for every visitor.

### 3.1 Why this outranks the named candidates

Same precedence rule as sessions 47-53: a wire-blind seam on a flagship
surface outranks the documentation-class polish. The named candidates (the
PDP og:image annotation, the og:type union, `style-src 'unsafe-inline'`) were
re-read first-hand — all three carry DOCUMENTED deliberate decisions in the
source (product/[slug]/page.tsx:33-51 + csp.ts:8-13), AND the parent
architecture (ecommerce-store) ships the same three decisions
(verified first-hand against `ecommerce-store-ref` this round: og:type
"website" in its PDP + metadata.ts, `style-src 'self' 'unsafe-inline'` in its
csp.ts). The real PSP integration remains out of scope for a local round
(no credentials, no 3rd-party contract). The search overlay is the last
reference-WORKING surface without its own gate: login owns auth.spec.ts (+
F-PP/F-II/F-KK/F-NN/F-VV), the cart drawer owns cart-checkout.spec.ts (+
F-WW/F-UU/F-MM…), the search overlay owns nothing.

## 4. Plan-probe discipline (run BEFORE the spec)

`scripts/plan-probe-session54.cjs` — boots the EXISTING production standalone
on :3100 (the E2E webServer contract; no throwaway needed — the surface is
pure-read, zero DB writes) and wire-verifies every F-YY assumption through
real Playwright Chromium:

1. the overlay opens via the header Search button and the input takes focus;
2. the TRENDING SEARCHES label + all five chips render at rest (q < 2 chars);
3. typing "silk" renders ≥ 2 typeahead hit rows (the seeded catalog: "Silk
   Draped Evening Gown" + "Embroidered Silk Blouse") carrying brand + name +
   price, and the trending block disappears;
4. a garbage query shows the "No results" guidance;
5. clicking the gown hit lands `/product/silk-draped-evening-gown`;
6. Enter on "silk" lands `/shop?search=silk` with a narrowed result count;
7. the "Cashmere" chip lands `/shop?search=Cashmere`;
8. Escape and the X button both dismiss the overlay;
9. zero console errors across the whole ladder.

## 5. Remediation design (gate-only round — the F-UU/F-VV/F-WW/F-XX ladder)

**The TDD ladder**: write the spec → verify GREEN against the CORRECT source
→ the mutation demos drop one half → REBUILD → exactly the predicted
case-runs RED → restore byte-identical → rebuild → green. The source ships
NO delta.

### 5.1 The gate — a NEW owning spec: tests/e2e/search-overlay.spec.ts

The overlay is a layout-level parity surface (mounted in the storefront
layout beside MobileNav) — it gets its own spec file, exactly as the mobile
drawer owns mobile-navigation.spec.ts. Seven cases (each runs identically on
both device projects — the Search button is NOT hidden on mobile):

1. **"opening the overlay focuses the input and offers the trending chips"** —
   click the header Search button → the overlay (testid `search-overlay`)
   visible, the input FOCUSED (`document.activeElement` is the input — the
   focus contract), the TRENDING SEARCHES label + all five chips visible
   (Silk Gown, Cashmere, Tailored Blazer, Leather Bag, Accessories).
2. **"typing a 2-char query renders the typeahead hits"** — type "silk" →
   ≥ 2 hit rows (the gown + the blouse) each carrying the brand + the name +
   the price; the trending block GONE at q ≥ 2.
3. **"a no-hit query shows the guidance, not a blank panel"** — type the
   api-contract spec's own no-hit term (`zzzznothing9999`) → "No results for
   …" visible.
4. **"clicking a hit navigates to the PDP"** — type "silk", click the row
   containing "Silk Draped Evening Gown" → URL `/product/silk-draped-
   evening-gown`, the PDP's buy panel visible, the overlay closed.
5. **"Enter submits to the filtered PLP"** — type "silk", press Enter → URL
   `/shop?search=silk`, the product grid visible, `result-count` narrowed
   (0 < count < 12), the overlay closed.
6. **"a trending chip submits to the filtered PLP"** — open, click the
   "Cashmere" chip → URL `/shop?search=Cashmere`, the grid visible, the
   overlay closed.
7. **"Escape and the X button dismiss the overlay"** — open, Escape →
   hidden; reopen, click the X button → hidden; body scroll restored.

Assertion notes: hits are located by row TEXT (the gown row), never by index
(the isBestseller/sortOrder ordering is the API's own contract, not this
gate's); the result-count assertions reuse shop.spec.ts's own narrowed-band
shape; the focus assertion reads `document.activeElement` (the mobile-nav
spec's own pattern).

### 5.2 Count ledger

A NEW spec file: **151 → 158 unique cases; 300 → 314 passed** (+2 skipped
unchanged — the desktop-only geometry pin; 158 unique × 2 = 316 total
case-runs). Spec files 18 → 19.

### 5.3 Budget ledger

- **limiter consumption: ~5 search calls per project** (the 200ms debounce +
  the ≥2-char guard collapse each case's typing to one fetch; the 60/min/IP
  bucket on :3100 currently sees ~8 calls from api-contract — the round's
  addition is far under the floor; zero login/register/checkout/newsletter
  bucket consumption anywhere).
- **login/register buckets: ZERO consumption** (a pure guest surface; the
  project storageState is irrelevant here).
- **DB writes: ZERO** (the search API is read-only; navigation is read-only).

### 5.4 Scoping decision (the honest ledger)

- The overlay's VISUAL parity (the fixed inset-0 / backdrop-blur / border-b
  input geometry) is carried by the round-38 documented reference measurement
  + the clone-side census — this round gates the FUNCTIONAL contract only
  (the reference's own overlay is inert beyond its input; the typeahead +
  navigation are the registered superset).
- The CSP spec's accidental open-only interaction (security-csp.spec.ts:170-
  186) stays as-is — it gates the CSP hydration, not the overlay; F-YY owns
  the overlay's contract.
- The mobile-project run: the Search button renders at every viewport (no
  responsive hiding in the header's icon cluster) — the same seven cases pin
  the mobile overlay for free.

## 6. Mutation demos (each: REBUILD → exactly the predicted case-runs RED → restore byte-identical → rebuild → green)

1. **The typeahead fetch-effect drop** (a neutering guard inserted at
   search-overlay.tsx:51-52 so the debounce fetch NEVER fires — the
   type-safe pass-through shape) → cases 2 + 4 RED ×4 runs (case 2: the
   hits never render; case 4: the gown row never becomes visible so the
   click times out — BOTH halves read the same rendered seam) while case 3
   stays GREEN (the no-results paragraph renders VACUOUSLY when
   visibleHits is always empty — the two consumer halves independently
   observable within the suite) and cases 5/6/7 stay GREEN (submit/
   dismissal never touch the fetch).
2. **The submit-navigation drop** (`router.push` removed from `submit()`,
   the `setSearchOpen(false)` kept) → cases 5 + 6 RED ×4 runs (Enter + the
   chip land nowhere — the URL assertion fails while the overlay closes).
3. **The hit-click navigation drop** (the `router.push` inside the hit
   button's onClick removed) → case 4 RED ×2 runs.

## 7. Round-49 census + the mobile-menu ritual + screenshots

Census 49a (final build) + 49b (post-dev-rebuild): ZERO DRIFT expected
against the standing ledger (desktop 11085/11/444, mobile 11264/1189, drawer
`flex flex-col gap-5 mt-4` + gaps [20,20,20,20] — the v4 mobile-nav pin
holds). The dev-server ritual (rm -rf .next → env -u DATABASE_URL boot →
settle probe → dev shots → hygiene → kill, ONE foreground command): the
mobile menu verified end-to-end — burger → drawer → Women →
`/shop?category=women` LANDS (8 cards) → drawer closed → overflow restored →
zero errors. Screenshot ledger: the 11 standing shots refreshed; byte-diffs
confined to the documented timing classes (the carousel strip, the
behind-drawer column, the countdown digits).

## 8. Final gates + docs

typecheck ✓ lint ✓ 173/173 unit ✓ build ✓ E2E **314 passed + 2 skipped**
(158 unique × 2 = 316 total runs) — the plan's count ledger (151 → 158
unique, 300 → 314 passed). Docs aligned: SKILL (frontmatter + §2 row + the
F-YY segment), README (badge + the Testing row + the Project Status row +
the F-YY gate line), CLAUDE.md (the gate chain segment + command counts),
PAD (test table + the coverage-map session-54 extension), AGENTS.md (E2E row
+ the F-YY segment), this plan + the execution record, `docs/session_77.md`,
worklog; `.env.example` verified unchanged and matching; stale-count sweep
zero; lint re-run as the last pre-commit step (Trap #28). One main-branch
commit pushed via the SSH wrapper v3, verified on the remote, key shredded.

## 9. Execution record (observed first-hand this round)

| Step | Planned | Observed |
|---|---|---|
| §1 recovery | npm install → .env → db:setup → chromium | 486 packages ✓; `db/custom.db` at the root (4/12/2/4) ✓; chromium v1248 ✓ |
| §2 reference re-probe | FIRST THING | **503 on both / and /login — the ELEVENTH consecutive round**; ALSO probed in a real browser (agent-browser): the platform serves its "AURELIA isn't available yet" page — outage platform-side, before any login form; honest-outage precedent applied (census clone-side ×4, reference fields carried by documentation) |
| §3 baseline | typecheck/lint/unit/build/E2E | typecheck ✓ lint ✓ **173/173 unit** ✓ build ✓ E2E **300 passed + 2 skipped** (7.6m) — exactly session-53's final gates |
| §4 probe | 11 checks | **11/11 PASSED** (scripts/plan-probe-session54.cjs on :3209) — incl. the typeahead row text ("MAISON ÉLITESilk Draped Evening Gown$2,850"), Enter→count=2, chip→count=1, focus, Escape/X, zero console errors |
| §5.1 the gate | 7 cases GREEN | first run caught TWO locator-scoping bugs in the SPEC itself (the strict-mode collision: the header's own "Accessories" nav button on the unscoped chip locator; main's related-products "Add to Bag" ×4 on the PDP assert) — scoped to the overlay + `.first()` per the product.spec precedent → **16 passed** (7 × 2 + 2 setup) |
| §6 demo 1 (typeahead-fetch drop) | cases 2+4 RED ×4 | **exactly 4 RED** (cases 2+4 × both projects), case 3 GREEN vacuously, cases 1/5/6/7 GREEN — the corrected prediction §6.1 (the plan's original "case 2 only" missed case 4's shared rendered seam; corrected BEFORE the demo ran) |
| §6 demo 2 (submit-nav drop) | cases 5+6 RED ×4 | **exactly 4 RED** at toHaveURL (Enter + chip land nowhere while the overlay closes) |
| §6 demo 3 (hit-click drop) | case 4 RED ×2 | **exactly 2 RED** at toHaveURL (clicking a hit is a no-op) |
| restore | byte-identical | `git diff --stat src/` EMPTY → rebuild → owning file 16/16 green |
| §7 census | ×2 zero drift | **49a + 49b + 49c + 49d ZERO DRIFT** (desktop 11085/11/444, mobile 11264/1189, drawer `flex flex-col gap-5 mt-4` + gaps [20,20,20,20], console clean all four) |
| §7 mobile-menu ritual | end-to-end | **verified**: burger visible → dialog 1 → overflow hidden → Women → `/shop?category=women` LANDS → dialog 0 → overflow restored → 8 cards → zero console/page errors (dev-nav-settle-session47.cjs) |
| §7 screenshots | 11 refreshed | **8 byte-identical + 3 documented classes**: clone-mobile-home = the carousel slide phase (consecutive same-build self-diff BYTE-IDENTICAL — the pure animated signature; vs-HEAD = a different slide visible); clone-mobile-menu-open = 271px entirely within the behind-drawer x>320 column, drawer crop x<320 BYTE-IDENTICAL; clone-exclusive-deals = the countdown strip (y147-164, 155px — the standing class) + remote-CDN image texture variance (same-structure, same dominant colors, recurring between consecutive same-build runs — the images.unsplash.com re-encode class, outside the codebase's control, geometry byte-stable ×4); PIL-verified |
| §8 final gates | all green | typecheck ✓ lint ✓ 173/173 ✓ build ✓ E2E **314 passed + 2 skipped** (158 unique × 2 = 316 runs) — the count ledger 151→158/300→314 holds |

Budget honored: zero logins, zero registers, zero DB writes (the pure guest
surface), ~1 search call per case (the 60/min bucket far under floor).
Docs aligned: SKILL v1.47.0 (frontmatter + project_state + §2 + §11 + the
Appendix B session-54 row), README (badge 314 + counts + both gate lines),
CLAUDE.md (line 33's carried 150→158 + the F-YY chain segment + command),
PAD (test table 26|151|300 → 27|158|314 + §7.3 + the coverage-map
session-54 extension), AGENTS.md (E2E row 158 + the F-YY segment), this
plan + the execution record, docs/session_77.md, worklog. `.env.example`
verified unchanged and matching.
