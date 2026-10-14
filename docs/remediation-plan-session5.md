# Remediation Plan — Session 5 (AURELIA / VELOUR clone)

> **Status:** EXECUTED. **Mode:** Audit-first (Mode C) → TDD fixes (Mode A/B).
> **Scope:** (1) re-validation of `efc0ee8` (session-4 + session log); (2) a fresh
> 12-category audit of the session-4 remediation commit `183e4ad` and current HEAD
> (skills: `code-review-checklist`, `security-and-hardening`, `code-quality-standards`,
> `tdd`, `agent-browser`, per `skills/skills-catalog.md`); (3) a **live reference
> parity sweep** of pastel-aurelia-fashion-edit.base44.app (desktop 1440×900 +
> mobile 390×844, logged-out surfaces) — which found **real reference drift** on
> the home page; (4) TDD remediation of the verified findings.

---

## 1. Starting state

Fresh clone at `efc0ee8` (workspace had been reset). Environment rebuilt: npm
install (486 pkgs), `.env` from `.env.example` (`DATABASE_URL="file:../db/custom.db"`
+ dev AUTH_SECRET), `db:setup` (4/12/2/4), Playwright chromium installed.
**Baseline gates all green, matching the session-4 ledger exactly:**
typecheck ✓ lint ✓ **72/72 unit (9 files)** ✓ build ✓ **E2E 66 passed**
(32 unique × 2 + 2 setup) ✓. Docs (SKILL/README/CLAUDE/PAD/plan) verified
aligned with the codebase at HEAD.

`npm audit`: 11 findings (1 moderate / 8 high / 2 critical) — **all dev-toolchain
only** (vitest→tinypool ×2 critical + mocker path-traversal; eslint-config-next
→braces/micromatch ×8 high; prisma CLI→deepmerge-ts ×1 high). Every fix is a
breaking major jump (vitest@5, eslint-config-next@14 downgrade, prisma@6.12
downgrade). Zero runtime exposure → **accepted with rationale** per the
security skill's triage tree (same disposition as sessions 2–4).

## 2. Audit method

Explore-agent full-HEAD scan (12 categories) + main-agent first-hand verification
of every 🔴/🟡 before acceptance (all 8 accepted findings were re-confirmed by
reading the code). Browser sweep on the clone (dev server, 0 console errors) and
the reference (logged-out home/shop surfaces + live DOM measurement).

## 3. Findings → Remediation

### A. Reference drift — visual parity (all measured live 2026-10-14, desktop 1440×900)

The reference prototype has **changed materially since the session-1 recon**.
Session-4's own `ref-home-desktop.png` already shows the new hero, but that
sweep only re-measured the mobile menu — the home-page drift went unnoticed.

| ID | Measured drift (reference = ground truth) | Remediation |
|---|---|---|
| P-1 🟡 | **Hero slides are horizontally anchored, not centered.** Slide 1 ("The New Autumn Collection"): `flex items-center justify-start` + inner `text-white max-w-lg text-left` (all content at x=80). Slides 2 ("Timeless Tailoring") + 3 ("Rare Accessories"): same but `justify-end`. Copy/description **left-aligned**; description has no `mx-auto` (x=80, flush). Clone renders all three slides `justify-center` + `text-center` + `max-w-sm mx-auto`. Type sizes/faces match exactly (eyebrow 12px ls 4.8px white/70 mb-4; h2 96px/300 mb-2; h3 italic 72px mb-6 (48/60 mobile); p 14px ls 0.7px mb-10 max-w-sm; CTA 12px ls 3.6px border-white px-10 py-4). `HERO_SLIDES` already carries an `align` field (left/right/center) that the component ignores. | Honor `align` in `hero-carousel.tsx` (`justify-start`/`justify-end`, inner `text-left`, drop `mx-auto`); fix slide 3 data `center`→`right` (live-measured justify-end). E2E pins: per-slide computed `justify-content` + `text-align`. |
| P-2 🟡 | **Hero transition is a horizontal push, not a fade.** Reference slide wrappers translate (measured `matrix(1,0,0,1,-744.78,0)` mid-transition; slides sit at ±100%). Clone cross-fades (`transition-opacity`). | Per-slide `transform: translateX((i - active) * 100%)` + `transition-transform duration-700`; keep `aria-hidden` semantics (spec-compatible). E2E pin: computed transform of the inactive slide ≠ none, active = identity. |
| P-3 🟡 | **Brand marquee strip is missing entirely.** Directly under the hero (y=923, h=70): `border-y border-border py-5 overflow-hidden bg-background` + `flex animate-marquee whitespace-nowrap` (`30s linear infinite`, keyframes translate 0→-50%); items `inline-flex items-center gap-8 mx-8`; brand span 18px fw300 ls 5.4px color rgb(126,113,103); separator ◆ 18px color rgb(224,169,41) (gold). Brand list (×2 for the loop): MAISON ÉLITE, NORDIC ATELIER, SAVILE & CO, LUNA VOSS, ORIENT LUXE, CRESTWOOD, BIJOUX ÉTOILE, ATELIER CAPRI. | New `brand-marquee.tsx` rendered between hero and New Arrivals; `--animate-marquee` theme token + **top-level** `@keyframes marquee` (trap: `@theme inline` does NOT emit nested `@keyframes` — the first GREEN attempt produced `animation-name: none`; caught by the E2E pin). |
| P-4 🟡 | **Product-row card widths.** Reference cards are fixed `flex-shrink-0 w-[260px] lg:w-[280px]` in a `flex gap-6 overflow-x-auto hide-scrollbar pb-4` row (image 280×373 = 3:4). Clone cards fill `w-[calc(25%-18px)]` (=302px, image 302×403) with snap-x/pb-2. Row sections consequently 39px short (835 vs 796). | Product-row wrapper/card → reference classes (`w-[240px] sm:w-[260px] lg:w-[280px]` equivalents kept for mobile usability, desktop pinned at 280); row `pb-4` + hide-scrollbar (snap kept as a functional superset — resting geometry unchanged). E2E pins: card width 280 @1440, image height 373. |
| P-5 🟢 | **The Edit tiles**: reference image 302×403 (**3:4**); clone `aspect-[4/5]` (302×378). Section 706 vs 681. | `aspect-[3/4]` on the Edit card. E2E height pin. |
| P-6 🟢 | **Styled by You**: reference `grid-cols-4 gap-4` (293×390 = 3:4 tiles); clone `gap-6` + 4:5. Subtitle copy: reference *"Tag @velour in your looks to be featured"*; clone *"Tag #Velour to be featured in our community lookbook."* | `gap-4 lg:gap-6`→`gap-4` … align to `gap-4` (lg 16px), `aspect-[3/4]`, subtitle copy pinned. E2E pins. |
| P-7 🟢 | Footer © line: reference **"© 2026 VELOUR. ALL RIGHTS RESERVED."** (uppercase); clone sentence case. | VERIFIED CLEAN DURING EXECUTION — the clone's © line already carries the `uppercase` class; the rendered text matches. No change. |

**Verified-identical (no action):** announcement bar, header chrome, newsletter
band (bg rgb(23,20,17), py 96px, 60px h2, copy), footer columns + payment chips,
Exclusive Deals copy (40% Shop Women / 30% / 35%), UGC tile labels, product-row
headers (48px serif), card type scale (10px brand / 14px name), section order.

**Reference mobile menu re-verified @390×844:** drawer `fixed left-0 top-0 h-full
w-80 bg-background z-50 p-8 flex flex-col gap-6` — **character-identical** to the
clone; nav `flex flex-col gap-5 mt-4`; items 256px @x=32 h=20, gaps [20,20,20,20],
first item y=104, fs 14px ls 2.8px fw500. Clone gaps [20,20,20,20,29,20] (divider +
superset ACCOUNT/WISHLIST, as documented). NOTE: the reference's menu items are
now inert `<div>`s (prototype `hasOnClick:false` regression on their side) — the
clone keeps real `<a>` links per the superset law. No clone change needed.

### B. Code audit (current HEAD)

#### P1 — correctness (all fixed, TDD)

| ID | Finding | Remediation |
|---|---|---|
| H-21 🔴 | **Found by the new guest-merge E2E (red→green proof): `?redirect=/cart` logins bounced to /account, flakily.** Root cause: `loginAction` returned the envelope for the client to `router.push` — but a server action's response re-renders the CURRENT route, and by then `createSession` has already set the cookie, so the re-rendered /login's own `if (user) redirect("/account")` rode along in the action payload. Whichever redirect landed last won (client push vs in-payload page redirect). | `loginAction`/`registerAction` now `redirect(...)` SERVER-side on success (Next responds with the redirect directive alone; the router follows it to a fresh RSC of the target — session, merged cart, updated badge; /login is never re-rendered). Failures keep the ActionResult envelope. The AuthForm ok-branch (push/refresh) deleted. Pinned by the merge spec (asserts /cart + the merged line across a reload). |
| H-22 🟡 | **Found by the second full-suite run: cross-run residue broke the drawer specs.** The idempotent seed upserts but never deletes — a previous run's guest→user merge left the demo user's cart non-empty, so the next run's drawer saw two lines (strict-mode click failures). | `global-setup` now wipes TRANSIENT tables after seeding (cart/wishlist/session rows + this suite's own artifacts: `e2e-%` users, `E2E%` addresses, `ORD-9999-%` injected orders). Every run starts from the canonical state. |
| H-1 🟡 | **G-8 was applied only to `t`.** `checkout/success` `order`, `admin/orders` `status`/`q` still flow `string[]` (repeated query keys) straight into Prisma → unhandled 500 on malformed URLs. TS types (`string`) mask it — the exact G-8 hazard class. | Shared `firstParam()` helper (`src/lib/search-params.ts`, pure + unit-pinned), applied at every `searchParams` consumer (`checkout/success`, `admin/orders`, login, shop). Unit RED→GREEN. |
| H-2 🟡 | **Admin orders table renders `orders.length` against `take: 100`** — the exact F-21/G-3 class, live on an admin surface ("100 orders" forever past 100). | Dedicated `db.order.count({ where })` alongside `findMany`; table renders the true total. E2E pin injects 104 orders via raw SQL so COUNT (108) and the capped list (100) genuinely diverge — the header must read a three-digit total while exactly 100 rows render; cleanup in `finally` + the global-setup wipe. |
| H-3 🟡 | **Two P2002 races still escape the envelope:** (a) `registerAction` findUnique→create on concurrent register → raw 500; (b) `getOrCreateCart`/`getOrCreateWishlist` user path findUnique→create outside `addToCartAction`'s retry loop → P2002 across the seam. Sessions 3–4 sealed every other site; `mergeGuestCartIntoUser` already models the fix (`upsert`). | (a) try/catch `isUniqueViolation` → the existing "account exists" `fail(...)`. (b) `upsert({ where: { userId }, update: {}, create })` for both user paths. |
| H-4 🟡 | **Account "Edit address" prefill is dead:** uncontrolled inputs keep mount-time `defaultValue` when `editing` changes (Radix keeps the tab mounted), and there is no cancel — one stale submit can silently overwrite the wrong address. | Remount via `key={editing?.id ?? "new"}` on the form + explicit "Cancel" control (`setEditing(null)`). Pinned by the new address E2E (prefill assertion). |
| H-7 🟡 | **`adminUpdateProductAction` has zero test coverage** — the exact G-1 lesson ("every mutation seam needs an exercising E2E"). | New E2E: admin sets stock → persists after reload; visibility toggle → product leaves `/shop` and returns. Doubled as the H-15 vehicle (see below). |
| H-8 🟡 | **Untested seams:** register happy path, all four account actions, guest→user cart merge, card-payment checkout, `/api/search`. | Additive E2E specs: register→account; guest cart merge at login; address CRUD (with H-4 prefill pin); card checkout incl. the H-5 field-error pin. Rate-limit budget respected (few auth attempts, per-project storage states). |

#### P2 — robustness/UX (all fixed)

| ID | Finding | Remediation |
|---|---|---|
| H-5 🟡 | Checkout review step shows only "Check the highlighted fields" — the action's `fieldErrors` are computed but never rendered (the code even `console.error`s them because the UI can't). Card fields live on step 1; a Luhn failure is a dead-end. | Review step renders `state.error.fieldErrors` (cardNumber/cardExpiry/cardCvc lines, `role="alert"`) + "Edit payment" affordance. Pinned by the card E2E (invalid card → visible field error). |
| H-6 🟡 | Cart/PDP/quick-view/wishlist mutations swallow `!res.ok` (the F-12 class, fixed for account in session 3 but not here): out-of-stock adds and vanished lines vanish silently. | Surface the failure message inline (PDP/quick-view note, cart drawer/page banner) mirroring `account-tabs`' pattern. Pinned via the zero-stock E2E. |
| H-15 🟡 | `clampToStock` floors at 1 — with the G-4 per-attempt re-read, stock that hits 0 mid-loop still writes a qty-1 line (unbuyable bag line; checkout guard catches later). | Zero-stock semantics: create → `fail("This piece is currently out of stock.")`; update → leave the existing line untouched (checkout guard owns it). E2E: admin zeroes stock → PDP add fails visibly, bag unchanged. |
| H-11 🟢 | Account order page still renders a dangling `carrier — ` when tracking is null (G-11's render-site sibling). | `filter(Boolean).join(" — ")`. |
| H-19 🟢 | `saveAddressAction` hand-rolls a **last-wins** fieldErrors loop; `fieldErrorsFrom` is first-wins (the G-7 drift class). | Reuse `fieldErrorsFrom`. |
| H-20 🟢 | `/api/newsletter` upsert unguarded (raw 500 on DB blip; search got the degrade treatment, newsletter didn't). | try/catch → `{ ok: false }` JSON, mirroring the search route. |

#### P3 — hygiene (all fixed)

| ID | Finding | Remediation |
|---|---|---|
| H-9 🟢 | Catalog per-line price comments contradict the file's own ×100 contract (`price: 3400, // $34.00` — actually $3,400.00). | Comments corrected (value = reference dollars; seed ×100). |
| H-10 🟢 | G-6 seed backfill matches `"by admin@aurelia.com"` only — an upgraded DB with a renamed admin re-leaks events (F-16's scenario). | Broadened matcher: `contains "by admin@"`. |
| H-12 🟢 | Missing hot-path indexes: `Order.userId` (account history) and `Order.placedAt` (admin sort); expired sessions never swept (carried). | Additive `@@index([userId])` + `@@index([placedAt])` on `Order` (F-20 pattern; `db:push` + PAD data-model note). Session sweeper stays on the roadmap. |
| H-13 🟢 | Hidden hero slides keep focusable CTAs in tab order (aria-hidden + focusable = WCAG violation). | `inert` on inactive slides (React 19 attribute) — also silences their links from AT. |
| H-14 🟢 | ESLint DOM-global guard covers 5 of the realistic bare-global set; `title/length/top/self/parent/closed` still typecheck via DOM lib. | Guard extended with those six. |
| H-16 🟢 | `vitest.config.ts` comment claims slugify coverage that doesn't exist; `package.json` dev script `| tee dev.log` masks exit code + drops `dev.log` in the repo root. | Comment fixed; dev script = `next dev -p 3000` (server exit code is moot in practice, but the tee is pure downside). |
| H-18 🟢 | `clientIpFrom` takes the **leftmost** XFF hop — safe only if the trusted proxy *overwrites* the header; an appending proxy re-opens bucket rotation. | Assumption pinned in a comment + README deploy note (code unchanged — both behaviors are deployment-dependent). |

**Accepted tradeoffs (documented, not fixed):** dev-toolchain npm-audit findings
(breaking-major fixes, zero runtime reach); shop-client `result-count` derives
from the take-capped page load (catalog is fixed at 12 — latent only, noted);
CSP `script-src 'unsafe-inline'` (RSC hydration; nonce-based CSP is a backlog
item); session sweeper + real PSP + skip-to-content/`prefers-reduced-motion`
(carried from sessions 3–4).

## 4. ToDo ledger (execution order)

| # | Item | Status |
|---|---|---|
| 1 | RED (unit): `firstParam` pins in a new `search-params.test.ts` | ✅ |
| 2 | GREEN (unit): `search-params.ts` + consumers (H-1) | ✅ |
| 3 | RED (E2E, baseline build): 8 home/address pins + 4 admin/checkout/merge pins fail as designed | ✅ |
| 4 | GREEN: hero-carousel (align + push + inert), brand-marquee (new), product-row, category-edit, styled-by-you, catalog data (align + H-9 comments) | ✅ |
| 5 | GREEN: register P2002 catch + cart/wishlist upserts (H-3); account-tabs key remount + cancel (H-4); checkout fieldErrors render (H-5); client failure surfacing ×5 islands (H-6); clampToStock zero-stock (H-15); account carrier join (H-11); fieldErrorsFrom reuse (H-19); newsletter guard (H-20) | ✅ |
| 6 | RED→GREEN discovered: H-21 login redirect race (server-side redirect in auth actions) | ✅ |
| 7 | RED→GREEN discovered: H-22 cross-run residue (global-setup transient wipe) + P-3 keyframes trap (top-level @keyframes) | ✅ |
| 8 | Schema: Order `@@index([userId])` + `@@index([placedAt])`, db push (H-12) | ✅ |
| 9 | Hygiene: ESLint guard extension (H-14), vitest comment + dev script (H-16), XFF comment (H-18), seed matcher (H-10) | ✅ |
| 10 | Rebuild → full gates (typecheck/lint/unit/build/E2E) — **build BEFORE E2E** (SKILL §9 #16) | ✅ |
| 11 | Browser sweep post-fix (parity live-verified, console clean) + 12 screenshots → docs/screenshots/ | ✅ |
| 12 | Docs alignment: SKILL (counts, traps #19–#20, sections), README, CLAUDE, PAD (sections/test table/indexes), plan ledger; worklog | ✅ |
| 13 | Commit to main; SSH-wrapper push; verify remote ref | ✅ |

## 5. Verification ledger (post-remediation, evidence-backed)

- Unit: **77/77** (10 files — 72 prior + 5 `search-params.test.ts`) ·
  E2E: **91 passed + 1 skipped** (45 unique cases × chromium + mobile, the
  desktop-only 280px pin skips on the 390px project; + 2 setup projects) ·
  typecheck/lint (incl. the extended global guard)/build + assemble clean.
- Red→green evidence: 12 new/updated pins failed RED against the pre-fix
  build (hero align ×2, push, marquee, 280px cards, 3:4 tiles, UGC copy,
  section order, address prefill, H-2 count, H-7/15 sellout, H-5 card
  errors, H-8 merge) — all green post-fix, twice consecutively.
- Parity live-verified on the remediated build: slide 1 `flex-start`/left,
  slides 2–3 `flex-end`/left parked at ±1 viewport; marquee `marquee 30s`,
  border-y 1px, gold ◆; row cards 280px; mobile nav gaps
  `[20,20,20,20,29,20]` unchanged; console 0 errors across the sweep.
- Screenshots refreshed (12): 10 clone surfaces (incl. NEW
  `clone-hero-slide2.png` right-anchor evidence) + 2 reference recon aids.

## 6. Residual risks / next steps

1. Dev-toolchain npm-audit findings — revisit when vitest 5 / prisma 7 land non-breaking paths.
2. Scheduled sweeps for expired sessions/abandoned guest carts (carried).
3. Real PSP behind the checkout seam (carried).
4. Skip-to-content + `prefers-reduced-motion` (carried a11y roadmap).
5. Nonce-based CSP to retire `'unsafe-inline'` (carried).
6. Reference oscillates (menu items flipped to inert divs this session; the
   hero alignment drift predates session 4 unnoticed) — re-measure before
   touching any parity surface; follow-the-latest-measurement doctrine.
7. shop-client `result-count` derives from the take-capped page load
   (catalog fixed at 12 — latent only).
