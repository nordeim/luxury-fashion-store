# Remediation Plan — Session 11 (AURELIA / VELOUR clone)

> **Status:** EXECUTED. **Mode:** Verify-first (Mode C) → coverage-widening TDD
> + two carried a11y roadmap items delivered.
> **Scope:** (1) fresh-clone re-validation of the pulled remote state `82c0ce6`
> (session-10 work `05c00fb` + the user-added session-10 transcript) — the
> workspace had been RESET, so the environment was rebuilt cold (npm install,
> `.env` re-pinned to `file:../db/custom.db`, `db:setup` → canonical
> 4/12/2/4, Playwright chromium re-install); (2) an audit of the session-10
> commit `05c00fb` (skills: `code-review-checklist`, `security-and-hardening`,
> `code-quality-standards`, `tdd`, per `skills/skills-catalog.md`) — all 8
> commit-message claims verified TRUE, 6 NIT findings, none important; (3) a
> **live reference parity sweep** (round 6; desktop 1440×900 + mobile 390×844,
> logged-out) running the FULL session-9/10 ritual — section-height census AND
> font-family census per heading rank, both sides — which found **ZERO new
> drift** (the reference is byte-equal to the session-7/8/9/10 ledgers at both
> viewports); (4) TDD remediation: three spec-quality fixes from the audit
> (H-67..H-69) plus the two a11y roadmap items carried since session 8
> (A-1 skip-to-content, A-2 `prefers-reduced-motion`) — the first PRODUCTION
> code changes since session 9's P-15, both parity-safe by construction.

---

## 1. Starting state

Workspace RESET again (fresh sandbox): `git status` showed a lone
`bb2f9cb Initial commit` with no remote. Re-cloned
`https://github.com/nordeim/luxury-fashion-store.git` → HEAD `82c0ce6`
(session-10 `05c00fb` + its transcript), tree clean. Cold rebuild:
`npm install`; `.env` re-pinned `DATABASE_URL="file:../db/custom.db"` (the
reset had left an absolute path); `npm run db:setup` verified live via Prisma
counts (4 categories / 12 products / 2 users / 4 orders); `npx playwright
install chromium` (v1248 bundle — same fresh-sandbox quirk as sessions 6–9).

**Baseline gates reproduce the session-10 ledger exactly:**
typecheck ✓ lint ✓ **113/113 unit (14 files)** ✓ build + assemble ✓.

`npm audit`: unchanged dev-toolchain findings — accepted with rationale
(carried since session 2; zero runtime exposure).

Sandbox note: the sandbox reaps background processes within seconds (the
session-2 double-fork trick no longer survives across tool calls), so the
parity sweep ran as a **single-process Playwright script**
(`scripts/parity-sweep-session11.cjs`) that boots the production standalone
on :3100 as a child process, measures clone + live reference with the same
chromium engine as the E2E suite, and kills the server at exit — no
cross-call process lifetime, no HMR interference, same target the E2E
webServer boots.

## 2. Audit method

Explore-agent full-diff scan of `05c00fb` (claims → evidence) + main-agent
acceptance. All 8 session-10 claims verified TRUE in code: the H-63
exact-list pin resolves the catalog product from the card's own rendered h3
and fails LOUDLY on mismatch (`home.spec.ts:337-340`); H-64's pointer park +
200ms transition cover and the `aria-pressed` `expect.poll` are state-truth;
H-65 asserts `visibility === "visible"` in the ≥lg branch; the `__reactFiber$`
hydration probe is present in BOTH chip-clicking specs; the H-66 plan
corrections carry explicit annotation markers (H-60 precedent honored);
SKILL v1.5.0 trap #27 / §10 row / §12 note all present; the commit is
docs+tests-only (zero src/ footprint, `slice(0, -1)` mutation fully
reverted).

### Findings (none important)

| ID | Finding | Remediation |
|---|---|---|
| H-67 🟡 | **The H-63 exact-list pin covers exactly ONE of SEVEN size vocabularies.** The catalog ships 7 distinct vocabularies (`["40".."45"]` numeric shoes, `["One Size"]`, `["S/M","M/L","L/XL"]` slash, `["S","M","L","XL","XXL"]`, `["S","M","L","XL"]`, `["XS","S","M","L","XL"]`, `["XS","S","M","L"]`); the pin exercises only the first New-Arrivals card (letter XS/S/M/L). A dropped/renamed size in ANY other product passes every pin today. | New E2E census case in `product.spec.ts`: for EVERY `CATALOG_PRODUCTS` entry, load `/product/{slug}` and assert the rendered PDP chip label list **exactly equals** `product.sizes` (`toEqual` — count + spelling + order; PDP renders the same `product.sizes.map` path at `product-detail.tsx:163`). 12 navigations per project; no auth (public pages, zero rate budget). Teeth demonstrated by the session-10 mutation applied to the PDP render path (`slice(0, -1)`) → RED → revert → GREEN. |
| H-68 🟢 | The H-63 name→catalog resolution uses `find(p => p.name === name)` — safe today (all 12 names unique) but a future duplicate name would silently compare against the wrong product's sizes. | Assert the match is unique (`filter(...)` length === 1) before resolving. |
| H-69 🟢 | `cart-checkout.spec.ts:38` comment still names the first home-row card ("Cashmere Overcoat: XS S M L") — the test is name-agnostic since session 10; a catalog `isNew` change would leave the comment lying. | Make the comment name-agnostic. |
| A-1 🟡 | **Carried roadmap (sessions 8/9/10 §6): no skip-to-content link.** Keyboard users must Tab through the whole chrome (announcement + header + drawer triggers) before reaching content. | Add `<a href="#main-content">` as the FIRST chrome element in `(storefront)/layout.tsx`, `sr-only` at rest (zero resting visual footprint — parity-safe), revealed on focus; `<main>` gains `id` + `tabIndex={-1}` as the target. E2E pin: at-rest invisibility (no layout box in the viewport), first-Tab focus + visibility, Enter moves focus to `#main-content`. |
| A-2 🟡 | **Carried roadmap (sessions 8/9/10 §6): no `prefers-reduced-motion` support.** The marquee runs a 30s infinite loop; hero/drawer/chips transition — vestibular-disorder users get no relief. | Standard global media query in `globals.css` (`animation-duration: 0.01ms`, `animation-iteration-count: 1`, `transition-duration: 0.01ms`, `scroll-behavior: auto` under `prefers-reduced-motion: reduce`). Normal-path rendering untouched (resting parity unaffected). E2E pin: a `reducedMotion: 'reduce'` context observes `animationDuration === "0.01ms"` on the marquee while a default context still observes `30s`. |

**Accepted (documented, carried):** dev-toolchain npm-audit findings; real PSP
behind the checkout seam; nonce CSP; H-56/H-59 disclosed E2E gaps; the E2E
admin rate budget stays exactly consumed (10/10); clone renders MORE h2/h3
headings than the reference (13/42 vs 11/36) — the documented superset's
fuller catalog rendering, all families Cormorant (the census pins FAMILIES,
not counts).

## 3. Live reference sweep — round 6 (measured 2026-10-15): ZERO drift

Playwright-driven census (`scripts/parity-sweep-session11.cjs`), standalone
:3100 vs live reference, both viewports, single chromium engine:

| Surface (ledger) | Reference (measured) | Clone (measured) | Verdict |
|---|---|---|---|
| Desktop page | **11079** | 11085 (+6) | known line-box rounding |
| Desktop sections | 810/70/835/706/835/835/3549/835/835/746/470 | ≤ +2px each | byte-parity holds |
| Desktop footer | 444 | 444 | equal |
| Mobile page | **11257** | 11264 (+7) | known rounding |
| Mobile sections | 591/70/800/742/800/840/**3171**/800/800/774/569 | ≤ +3px each (deals 3174 — session-9 pinned residue) | holds |
| Mobile footer | 1189 | 1189 | equal |
| Font census h1/h2/h3 | 100% Cormorant (1/11/36) | 100% Cormorant (1/13/42 — superset counts) | families hold |
| Font census h4 | Montserrat ×3 | Montserrat ×3 | holds |
| Mobile drawer panel | `fixed left-0 top-0 h-full w-80 bg-background z-50 p-8 flex flex-col gap-6` | **char-identical** | holds |
| Mobile drawer nav | `flex flex-col gap-5 mt-4`, 5 items x=32/w=256/h=20, y=104..264, gaps [20,20,20,20] | **identical** | v4 pin intact |
| Size chips (resting) | 10px / 10px pad / 4px py / r0 / transparent / rgb(229,224,220) | identical | P-11 holds |
| Card-name h3 | Cormorant (72px desktop / 48px mobile) | identical | P-15 holds |
| Marquee | present, animating | present | P-3 holds |
| Console | 2 ref-side 401s (reference's own backend) | clean | — |

**The reference has now held still across three consecutive same-day sweeps
(sessions 9→10→11); the two-census ritual keeps verifying it instead of
assuming it.**

## 4. ToDo ledger (execution order)

| # | Item | Status |
|---|---|---|
| 1 | Cold env rebuild (clone → install → `.env` → `db:setup` → chromium) + baseline gates | ✅ |
| 2 | Explore audit of `05c00fb` (8 claims + new-issue scan) | ✅ |
| 3 | Playwright parity sweep script + round-6 census (both viewports, zero drift) | ✅ |
| 4 | H-67/H-68/H-69 spec changes (census case + uniqueness guard + comment; counts 113 unit / 63→66 unique E2E) | ✅ |
| 5 | H-67 teeth demo: PDP render-path mutation `slice(0, -1)` → rebuild → RED → revert → rebuild → GREEN | ✅ |
| 6 | A-1 skip-to-content: E2E RED → layout implementation → GREEN | ✅ |
| 7 | A-2 prefers-reduced-motion: E2E RED → globals.css implementation → GREEN | ✅ |
| 8 | Full gates twice on the final build (typecheck/lint/unit/build + E2E) | ✅ |
| 9 | Screenshots refresh → docs/screenshots/ (9 surfaces re-captured on the remediated standalone) | ✅ |
| 10 | Docs alignment (README badge/counts, CLAUDE gate, PAD test table, SKILL §2 counts/§11 checklist) + worklog | ✅ |
| 11 | Commit to main; SSH-wrapper push (dry-run first); verify remote ref | ✅ |

## 5. Verification ledger (post-remediation, evidence-backed)

- Unit: **113/113** (14 files — no unit seams touched) · E2E: **66 unique
  cases × 2 device projects + 2 setup = 132 passed + 2 skipped** (the two
  pre-existing desktop-only viewport pins in home.spec remain
  viewport-conditional — `test.skip(width < 1024)` — and skip on the mobile
  project exactly as before), observed **twice consecutively** on the final
  build · typecheck/lint/build + assemble clean.
- H-67 teeth: mutated PDP render path → the census failed RED at the
  exact-list `toEqual` (shortened chip list vs catalog array diff); reverted
  build → GREEN.
- A-1/A-2 pins went RED before their implementations existed (missing anchor
  / missing media query) and GREEN after — genuine TDD, not characterization.
- Parity re-verified AFTER the production changes (second full sweep): clone
  desktop 11085 / mobile 11264, deals 3174, drawer panel class char-identical,
  gaps [20,20,20,20] — byte-identical to the pre-change numbers and to the
  session-9/10 ledgers. **The A-1/A-2 changes are rest-invisible by
  measurement, not just by construction.**
- Screenshots re-captured (clone-home-desktop, clone-size-chips,
  clone-exclusive-deals, clone-pdp, clone-shop-plp, clone-mobile-home,
  clone-mobile-menu-open + ref-home-desktop, ref-mobile-menu-open).
  Byte-compare vs HEAD is n/a this session — not because the pages moved
  (the census proves they did not) but because the captures are
  choreography-dependent: the hero auto-advance (the HEAD ref capture shows
  slide 02/03, a fresh load shows 01/03), the mount-relative countdown and
  the 30s marquee make two captures byte-equal only under an identical
  capture script, which prior sessions did not record in the repo. The
  census numbers (above) are the reproducible parity evidence of record;
  the screenshots document the remediated surfaces for humans. Note for a
  future session: check the capture script into `scripts/` (this session's
  sweep+shots tool now is: `scripts/parity-sweep-session11.cjs --shots`).

## 6. Residual risks / next steps

1. Dev-toolchain npm-audit findings — revisit when vitest 5 / prisma 7 land
   non-breaking paths (carried).
2. Real PSP behind the checkout seam (carried).
3. Nonce-based CSP to retire `'unsafe-inline'` (carried).
4. H-56/H-59 disclosed E2E gaps (DB-mocking harness) — unchanged, carried.
5. E2E admin rate budget remains EXACTLY consumed (10/10) — SQL-fixture
   pattern only (unchanged).
6. The a11y roadmap is now CLOSED (skip-link + reduced-motion shipped); the
   remaining superset roadmap is commerce-side (PSP).
7. Keep running the FULL two-census ritual every session — three same-day
   zero-drift sweeps is a streak, not a guarantee (session-10 §6 #5).
8. If the reference re-adds the drawer ACCOUNT/WISHLIST tail, restore the
   clone's tail and re-pin 7 items (session-8 §6 #7 — unchanged).
