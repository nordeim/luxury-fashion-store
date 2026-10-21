# Remediation Plan — Session 55 (F-ZZ: the homepage + header's navigation chrome beyond the hero's Next arrow — the Previous control, the slide dots, the wrap-around modulo both arms, the live counter, the hero CTA, the row-scroller arrows, the desktop mega menu's dual-param links, the header Sale/Designers links, and the Edit card links, ALL wire-blind)

The session-54 continuation round. Per the standing precedent: audit the pulled
HEAD (`88fca95` = `8c5f93e` + `docs/session_78.md`, the prior round's raw
narration; docs-only, verified via `git show --stat`), re-verify the baseline,
re-probe the reference platform FIRST THING, run the fresh audit pass, then
close the strongest finding with a TDD ladder. Like sessions 50-54 this is a
**gate-only round**: the source contract is CORRECT today (verified first-hand
below); what is missing is the GATE — every chrome half below can drop with
every existing case green (the silent-class definition).

## 1. Starting state

- **The workspace was NOT reset this round** (the repo, node_modules, Playwright
  browsers, and `.auth` states survived; only the git-ignored DB files were
  re-materialized): `git pull` → `88fca95`; `env -u DATABASE_URL npm run
  db:setup` → `db/custom.db` at the repo root (4 categories, 12 products, 2
  users, 4 orders — the canonical seed).
- Baseline gates: typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build ✓
  E2E **314 passed + 2 skipped** (158 unique × 2 = 316 runs, 7.8m) — exactly
  session-54's final gates; the 62nd consecutive fully-green baseline.
- Standing pins re-verified first-hand: the F-YY spec present, the isActive
  wall at cart.ts:59, the cart-line walls at :142/:234, the STOCK_SHORT guard
  at checkout.ts:105/:148, mobile-nav `w-80` + `flex flex-col gap-5 mt-4` +
  `flex flex-col gap-6`, 26 `hsl()` literals in globals.css, `.env` written to
  the contract + `.env.example` matching, `db/` at the root, both test configs
  intact.
- Baseline harness note (re-learned): a backgrounded `npm run test:e2e`
  (nohup) is reaped by the tool sandbox mid-suite — the run died at 12/316
  with a clean-looking log. Long gates run in the FOREGROUND (the standing
  environment note).

## 2. Reference platform re-probe (the FIRST-THING directive)

The live reference (Base44) answered **HTTP 503 on both `/` and `/login`** at
the round's start (curl, ~0.55s each) — the sessions-44..54 outage, now the
TWELFTH consecutive round, matching the standing platform-side signature
(the "AURELIA isn't available yet" page browser-verified in session-54).
Handled per the honest-outage precedent: the census runs CLONE-side ×2; the
reference-side fields carry by documentation from the round-38 live
measurement; the WOMEN-inert posture re-check + the 2 ref screenshots stay
DEFERRED; one final re-probe before the final gates. If the platform recovers
mid-round, the full two-sided sweep runs then.

## 3. Fresh audit pass — the round's finding (F-ZZ)

With every mutation seam gated (all 15 server actions + the 3 REST routes +
the sweeper's runtime seam + the reference's three WORKING surfaces each
owning a spec), the fresh audit swept the remaining ungated UI chrome — and
found the largest remaining cluster: **every navigation affordance on the
resting homepage except ONE arrow is wire-blind**. The hero carousel is the
flagship parity surface (P-1/P-2/P-8 — the most-pinned geometry in the suite,
five existing "Next slide" clicks across home.spec.ts), yet only its FORWARD
half is gated:

| Contract half | Source | Gate before this round |
|---|---|---|
| Hero Previous control (incl. the negative-modulo wrap arm: slide 1 → slide 3) | hero-carousel.tsx:102-109, :46-51 | **ZERO** — never clicked in any spec (grep "Previous slide" tests/ = 0 hits) |
| Hero slide-indicator dots ("Go to slide N") | hero-carousel.tsx:119-129 | **ZERO** — never clicked (grep "Go to slide" tests/ = 0 hits) |
| Hero Next WRAP (slide 3 → slide 1 — the modulo's positive arm; pins against a clamp-shaped regression) | hero-carousel.tsx:46-51, :110-117 | **ZERO** — all 5 existing Next clicks start from slide 1; none reaches the wrap |
| Hero counter "NN / 03" tracking the active slide | hero-carousel.tsx:130-132 | **ZERO** — never asserted (grep "01 / 03" tests/ = 0 hits) |
| Hero CTA anchor → /shop (per-slide "Explore Collection" / "Shop Men's" / …) | hero-carousel.tsx:91-96 | **ZERO** — never clicked (the wishlist spec's "Discover the Collection" visibility check is the WISHLIST empty state, not the hero) |
| Row-scroller arrows (back/forward + the 2-card delta at product-row.tsx:47-52) | product-row.tsx:71-84 | **ZERO** — grep "Scroll … back/forward" tests/ = 0 hits; 10 wire-blind buttons (5 rows × 2) |
| Desktop mega menu: hover-open + the dual-param subcategory links (`/shop?category=women&search=Dresses`) | header.tsx:44-58 | **ZERO** — never opened or clicked anywhere |
| Header Designers/Sale links | header.tsx:86-99 | **ZERO** — shop.spec:34 reaches `/shop?sale=1` by DIRECT URL, bypassing the link |
| The Edit card links → /shop?category=… | category-edit.tsx:26 | **ZERO** — home.spec:169 reads the tile for GEOMETRY only; :199 checks visibility |

The harm shapes: a dead Previous (renders, clicks no-op), dead dots, a
clamp-shaped wrap regression (Next stuck on the last slide), a broken
negative modulo (`next % count` from slide 1 → active = -1 → NO slide active,
counter "00 / 03" — a real crash-class shape), a stale counter, a dead CTA,
dead scroller arrows (the rows only scroll by drag), a dead mega menu (the
dropdown renders on hover but its links navigate nowhere), dead Sale/Designers
links, dead Edit cards. Every one drops with the full suite green.

### 3.1 Why this outranks the named candidates

Same precedence rule as sessions 47-54: a wire-blind seam cluster on the
FLAGSHIP homepage surface outranks documentation-class polish. The three
named candidates (the PDP og:image annotation, the og:type union,
`style-src 'unsafe-inline'`) remain documented deliberate decisions carried
verbatim by the parent architecture (ecommerce-store-ref, verified first-hand
in session-54). The real PSP integration remains out of scope for a local
round (no credentials, no 3rd-party contract). The manual()-resets-the-timer
half (hero-carousel.tsx:60-64) is time-based and stays structurally outside
a deterministic test window (documented, like the sweeper's hourly interval)
— but it is exercised IMPLICITLY by this round's rapid-click cases (each
control click resets the 6s auto-rotate, which is what makes consecutive
clicks deterministic).

### 3.2 Mobile-side coverage note (the honest ledger)

The mobile drawer already owns its gate (mobile-navigation.spec.ts — the
Women link click, the close/Escape/backdrop contracts, the geometry pins).
The drawer renders the same five nav destinations, so the mobile SIDE of the
header-nav class is represented. The desktop-only halves (the mega menu with
its unique dual-param links, the Designers/Sale header links) get
desktop-only cases using home.spec.ts's own `test.skip((page.viewportSize()
?.width ?? 0) < 1024, "desktop-only pin")` pattern (home.spec.ts:72/:466 —
the standing "2 skipped" ledger entries).

## 4. Plan-probe discipline (run BEFORE the spec)

`scripts/plan-probe-session55.cjs` — boots the EXISTING production standalone
on :3209 against `db/custom.db` (a pure-read surface: navigation only, zero
DB writes, zero cookie mints; the E2E webServer stays alone on :3100, exactly
the session-54 probe contract) and wire-verifies every F-ZZ assumption through
real Playwright Chromium:

1. the counter reads "01 / 03" at rest and tracks the active slide;
2. clicking Previous from slide 1 WRAPS to slide 3 (the negative-modulo arm)
   and the counter reads "03 / 03"; a second Previous lands slide 2;
3. clicking "Go to slide 3" jumps there and the counter follows; "Go to
   slide 2" likewise;
4. three Next clicks from slide 1 wrap back to slide 1 (the positive arm);
5. the active slide's CTA click lands `/shop` with the product grid visible;
6. the New Arrivals row's "Scroll … forward" advances scrollLeft by ~2 cards
   + gaps and "Scroll … back" returns it;
7. hovering the desktop Women nav button opens the mega menu and its
   "Dresses" link lands `/shop?category=women&search=Dresses` with a narrowed
   count (the seeded "Silk Draped Evening Gown", subcategory "dresses");
8. the header Sale link lands `/shop?sale=1`;
9. the first Edit card lands `/shop?category=women` with the grid visible;
10. zero console errors across the whole ladder.

## 5. Remediation design (gate-only round — the F-UU…F-YY ladder)

**The TDD ladder**: write the spec → verify GREEN against the CORRECT source
→ the mutation demos drop one half → REBUILD → exactly the predicted
case-runs RED → restore byte-identical → rebuild → green. The source ships
NO delta.

### 5.1 The gate — a NEW owning spec: tests/e2e/homepage-navigation.spec.ts

The file-per-surface convention: the drawer owns mobile-navigation.spec.ts,
the overlay owns search-overlay.spec.ts, the homepage's navigation chrome
owns its own spec (home.spec.ts stays the geometry/rendering owner). Eight
cases — six dual-project, two desktop-only:

1. **"the hero's Previous control steps backward and wraps to the last
   slide"** — counter "01 / 03" at rest → click Prev → slide 3 active
   (`data-active="true"` on hero-slide-2, counter "03 / 03") → click Prev
   again → slide 2 ("02 / 03"). Exercises the NEGATIVE modulo arm.
2. **"the hero's indicator dots jump to their slide"** — click "Go to slide
   2" → slide 2 active + counter; click "Go to slide 3" → slide 3 + counter.
3. **"the hero's Next control wraps from the last slide back to the first"**
   — three rapid Next clicks → slide 1 active again + counter "01 / 03"
   (pins against the clamp shape; the manual() timer-reset keeps consecutive
   clicks deterministic).
4. **"the active hero CTA lands the PLP"** — the CTA scoped to
   `div[data-active="true"]` inside the carousel → click → URL `/shop` + the
   product grid visible.
5. **"the product-row scroller arrows scroll the row and return"** — the New
   Arrivals row: scrollLeft 0 at rest → click "Scroll New Arrivals forward"
   → poll scrollLeft > 100 (2 cards + 2 gaps) → click "Scroll New Arrivals
   back" → poll back to 0. Both projects (the arrows render at every
   breakpoint).
6. **"the mega menu's subcategory link lands the dual-param PLP"**
   (DESKTOP-ONLY, the home.spec:72 skip pattern) — hover the Women nav
   button → the dropdown's "Dresses" link visible → click → URL
   `/shop?category=women&search=Dresses` + the grid visible + a narrowed
   result-count (0 < count < 12).
7. **"the header's Sale link lands the sale PLP"** (DESKTOP-ONLY) — click
   the header Sale link → URL `/shop?sale=1` + the grid + a struck-through
   compare-at price visible (the sale marker).
8. **"an Edit card lands its category PLP"** — the first Edit card (Women)
   → URL `/shop?category=women` + the grid visible. Both projects.

Assertion notes: slide identity is asserted via the `data-active` attribute
(flips synchronously with the click — never the 700ms transform); the
counter via its exact text; the scroller via `expect.poll` on `scrollLeft`
(smooth-scroll settle); the CTA locator is scoped to the ACTIVE slide
(strict mode — the inert slides carry the same CTA class); the mega menu
opens via `page.hover` on the nav group button (CSS group-hover); no
absolute product counts anywhere (the shared-DB rule) — narrowed bands and
UI-visible reality only.

### 5.2 Count ledger

A NEW spec file: **158 → 166 unique cases; 314 → 328 passed; 2 → 4 skipped**
(the two desktop-only cases skip on the mobile project, joining home.spec's
two standing desktop-only pins; 166 unique × 2 = 332 total case-runs).
Spec files 19 → 20.

### 5.3 Budget ledger

- **limiter consumption: ZERO** (navigation is unrate-limited; no login/
  register/checkout/newsletter/search API calls anywhere in the spec).
- **login/register buckets: ZERO consumption** (a pure guest surface).
- **DB writes: ZERO** (navigation only).

### 5.4 Scoping decision (the honest ledger)

- The hero's auto-rotate cadence (6s) and the manual()-resets-the-timer half
  stay OUTSIDE the deterministic window (documented; exercised implicitly by
  the rapid-click cases whose gaps are far under 6s).
- The footer's `href="#"` links are deliberately inert (the reference's own
  footer is inert — visual parity), NOT a finding.
- The mobile drawer's Sale/Designers links ride the drawer's own gated link
  class (mobile-navigation.spec.ts) — not re-gated here.
- The reference's own carousel chrome (arrows w-10 h-10, dots w-2 h-[2px],
  counter "01 / 03") is a RESTING-visual parity surface carried by the
  round-38 documented measurement + the clone-side census — this round gates
  the FUNCTIONAL contract only.

## 6. Mutation demos (each: REBUILD → exactly the predicted case-runs RED → restore byte-identical → rebuild → green)

1. **The Previous-control drop** (the Prev button's onClick removed — the
   type-safe attribute drop) → **case 1 RED ×2** (Prev does nothing; the
   slide never flips) — cases 2/3 stay GREEN (their controls untouched).
2. **The dot onClick drop** → **case 2 RED ×2** (the dots render but jump
   nowhere).
3. **The wrap-modulo neuter** (`go`'s `((next % count) + count) % count` →
   `next % count` — the classic negative-arm bug) → **case 1 RED ×2** (Prev
   from slide 1: -1 % 3 = -1 → NO slide active, counter "00 / 03") — case 3
   stays GREEN (3 % 3 = 0 = the correct wrap; the two arms independently
   observable).
4. **The scroller neuter** (`el.scrollBy({ left: dir * delta })` →
   `left: 0` — the row never moves) → **case 5 RED ×2** (scrollLeft stays 0).
5. **The counter neuter** (`String(active + 1)` → the literal `"01"`) →
   **cases 1+2+3 RED ×6** (the counter stops tracking at every navigation
   assert) — the CORRECTED prediction: the original plan said cases 1+2 ×4,
   but the spec's own first-run hardening (the vacuous-rescue fix below)
   added case 3's INTERMEDIATE counter assert ("03 / 03" after the second
   Next click), which the literal also fails — the prediction corrected
   BEFORE the demo ran, exactly the F-YY §6.1 discipline.
6. **The mega-menu href drop** (the subcategory Link href → `"#"` — the
   link renders but navigates nowhere) → **case 6 RED ×1** (chromium-only
   case; the URL assertion fails).

## 7. Round-50 census + the mobile-menu ritual + screenshots

Census 50a (final build) + 50b (post-dev-rebuild): ZERO DRIFT expected
against the standing ledger (desktop 11085/11/444, mobile 11264/1189,
drawer `flex flex-col gap-5 mt-4` + gaps [20,20,20,20] — the v4 mobile-nav
pin holds). The dev-server ritual (rm -rf .next → env -u DATABASE_URL boot →
settle probe → dev shots → hygiene → kill, ONE foreground command): the
mobile menu verified end-to-end — burger → drawer → Women →
`/shop?category=women` LANDS → drawer closed → overflow restored → zero
errors. Screenshot ledger: the 11 standing shots refreshed; byte-diffs
confined to the documented timing classes (the carousel strip, the
behind-drawer column, the countdown digits, the remote-CDN texture class).

## 8. Final gates + docs

typecheck ✓ lint ✓ 173/173 unit ✓ build ✓ E2E **328 passed + 4 skipped**
(166 unique × 2 = 332 total runs) — the plan's count ledger (158 → 166
unique, 314 → 328 passed, 2 → 4 skipped). Docs aligned: SKILL (frontmatter
+ §2 row + the F-ZZ segment), README (badge + the Testing row + the F-ZZ
gate line), CLAUDE.md (the gate chain segment + command counts), PAD (test
table + the coverage-map session-55 extension), AGENTS.md (E2E row + the
F-ZZ segment), this plan + the execution record, `docs/session_79.md`,
worklog; `.env.example` verified unchanged and matching; stale-count sweep
zero; lint re-run as the last pre-commit step (Trap #28). One main-branch
commit pushed via the SSH wrapper v3, verified on the remote, key shredded.

## 9. Execution record (observed first-hand this round)

| Step | Planned | Observed |
|---|---|---|
| §1 workspace | NOT reset; db:setup only | `git pull` → `88fca95`; `db:setup` → 4/12/2/4 ✓; baseline typecheck ✓ lint ✓ 173/173 ✓ build ✓ E2E **314 passed + 2 skipped** (7.8m) — the 62nd consecutive green baseline; the backgrounded nohup E2E run was reaped at 12/316 by the tool sandbox (the standing foreground-rule re-learned) |
| §2 reference re-probe | FIRST THING | **503 on both / and /login** (curl, ~0.55s) — the TWELFTH consecutive round, the standing platform-side signature; honest-outage precedent applied (census clone-side ×4 — 50a/50b/50c/50d) |
| §3 audit | the wire-blind chrome cluster | confirmed first-hand: grep "Previous slide"/"Go to slide" tests/ = ZERO hits; grep "Scroll … back/forward" tests/ = ZERO hits; home.spec.ts:169 reads the Edit tile for geometry only; shop.spec.ts:34 reaches ?sale=1 by direct URL |
| §4 probe | 10 checks | **17/17 PASSED** (scripts/plan-probe-session55.cjs on :3209, pure-read) — incl. the wrap both arms, the counter tracking, the scroller 0→296→0px, the mega-menu Dresses landing (count=1), the Sale link, the Edit card, zero console errors; the probe's own first run caught its locator bug (the product-row testid sits ON the scroller — home.spec.ts:443's own comment) |
| §5.1 the gate | 8 cases GREEN | **16 passed + 2 skipped** (8 cases × 2 projects, the 2 desktop-only cases skipping on mobile) — after the round's spec lesson below |
| the spec's first-run lesson | — | **the dot-drop demo's first run passed VACUOUSLY** (16 passed, ZERO RED): the default 10s expect window let the 6s auto-rotate tick fake the dead dot's jump (the tick advances to exactly the expected slide); hardened with 2.5s assert windows + tick-resistant expected states (each post-click expectation needs TWO forward ticks = 12s to fake) + case 3's INTERMEDIATE slide-3 assert (a dead Next can't be faked) → re-verified GREEN 16+2 |
| §6 demo 1 (Prev-drop) | case 1 RED ×2 | **exactly 2 RED** (re-run against the FINAL spec shape after the hardening — the F-XX discipline) |
| §6 demo 2 (dot-drop) | case 2 RED ×2 | **exactly 2 RED post-hardening** (the first run's vacuous green is the round's spec lesson, recorded above) |
| §6 demo 3 (wrap-modulo neuter) | case 1 RED ×2 | **exactly 2 RED** (case 1 only — the negative arm; the dots/Next paths stay green, the arms independently observable) |
| §6 demo 4 (scroller neuter) | case 5 RED ×2 | **exactly 2 RED** (the type-safe pass-through shape `0 * dir * delta` — the session-52 TS6133 lesson applied pre-emptively) |
| §6 demo 5 (counter neuter) | cases 1+2+3 RED ×6 (CORRECTED) | **exactly 6 RED** — the original plan said cases 1+2 ×4; corrected BEFORE the demo ran (the hardening added case 3's intermediate counter assert) |
| §6 demo 6 (mega-menu href drop) | case 6 RED ×1 | **exactly 1 RED** (the chromium-only case at toHaveURL) |
| restore | byte-identical | `git diff --stat src/` EMPTY → rebuild → owning file 16/16 + 2 skipped green |
| §7 census | ×2 zero drift | **50a + 50b + 50c + 50d ZERO DRIFT** (desktop 11085/11/444, mobile 11264/11/1189, drawer `flex flex-col gap-5 mt-4` + gaps [20,20,20,20], console clean all four) |
| §7 mobile-menu ritual | end-to-end | **verified**: burger visible → dialog 1 → overflow hidden → Women → `/shop?category=women` LANDS (8 cards) → dialog 0 → overflow restored → zero console/page errors (dev-nav-settle-session47.cjs); dev shots captured (login/account/cart/admin, zero errors); dev-hygiene cleaned 1 cart row; canonical 4/12/2/4 re-verified |
| §7 screenshots | 11 refreshed | **8 byte-identical + 3 documented classes (committed)**: clone-mobile-home = the carousel slide phase (the y[728..746] strip; the consecutive same-build self-diff shows the same strip — the pure animated signature); clone-mobile-menu-open = the behind-drawer x[320..389] column (the drawer crop x<320 byte-identical — the bbox proves it); clone-pdp = the remote-CDN re-encode class ACROSS capture sessions (self-diff 50b vs 50c BYTE-IDENTICAL; the vs-HEAD diff is a 57×6px image-texture region, amplitude ≤ ~18, zero src/ delta, census geometry byte-stable ×3); clone-exclusive-deals = the remote-CDN texture variance class (self-diff 50c vs 50d = EXACTLY the vs-HEAD diff: same 2192px, same bbox (815,260,1359,899), amplitude ~1 — the recurring per-fetch re-encode, conclusively not code drift); PIL-verified |
| §8 final gates | all green | typecheck ✓ lint ✓ 173/173 ✓ build ✓ E2E **328 passed + 4 skipped** (166 unique × 2 = 332 runs, 8.3m) — the count ledger 158→166/314→328/2→4 holds |

Budget honored: zero logins, zero registers, zero DB writes, zero limiter
consumption (pure navigation). Docs aligned: SKILL v1.48.0 (frontmatter +
project_state + the gates list + §2 row + §11 command + the Appendix B
session-55 row), README (badge 328 + the Testing row + the command + the
Project Status row + both F-ZZ gate lines), CLAUDE.md (166 E2E cases + the
F-ZZ chain segment), PAD (test table 27|158|314 → 28|166|328 + §7.3 command +
the coverage-map session-55 extension), AGENTS.md (E2E row 166 + the F-ZZ
segment), this plan + the execution record, docs/session_79.md, worklog.
`.env.example` verified unchanged and matching; stale-count sweep zero.
