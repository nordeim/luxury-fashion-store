# Remediation Plan — Session 26 (AURELIA / VELOUR clone)

> **Status:** PLANNED → EXECUTED this round (the session-25 continuation, named
> for the next session number per the session-20-continuation precedent).
> **Mode:** Verify-first (Mode C) → reconciliation of the pulled remote
> (`60e363a` the session-25 store-root-identity round + `46bbb19` the
> user-added transcript) → first-hand audit → live-reference parity sweep
> round 21 → fresh audit pass → TDD remediation. **Scope:** the session-25
> commit audited 4/4 claims TRUE (F-N layout-level nonce-carrying identity
> blocks, F-O three crossorigin preloads, F-P theme-color, F-Q security.txt —
> all read in source, wire-probed on the built standalone); **the round-21a
> census caught a REAL reference drift** — the reference moved its newsletter
> band INSIDE `<main>` (mainKids 10→11 on both viewports, pageH byte-unchanged)
> — and the fresh pass opened the auth-identity, canonical, and product-OG
> seams, yielding **F-R / F-S / F-T / F-V, the structural + auth-identity +
> canonical + product-OG catch-up**. All four are rest-invisible or
> byte-invariant by measurement (the round-21b census is the gate).

---

## 1. Starting state

WARM workspace at `46bbb19` (`main`, remote-verified). Environment restored per
the worklog's incident playbook:

| Step | Result |
|---|---|
| `git pull` | ✓ fast-forward `46bbb19` = the user-added `docs/session_25.md` transcript (docs only, no code) |
| `.env` verified canonical (`file:../db/custom.db` + dev AUTH_SECRET + site URL) — survived this reset | ✓ no re-pin needed |
| Playwright cache present (v1200 + v1248 both) | ✓ no reinstall needed |
| `bin/ssh` paramiko shim + `paramiko` 5.0.0 in the venv — survived this reset | ✓ verified present |
| `db/custom.db` canonical 4/12/2/4 (verified via `env -u DATABASE_URL` count) | ✓ no reseed needed |
| `core.fileMode false` survived (the `.git` dir persisted) | ✓ verified |
| `skills/` intact (283 entries) | ✓ |

**Baseline gates on the committed tree (SEVENTEENTH consecutive session fully
green at baseline):** typecheck ✓ · lint ✓ · **169/169 unit (19 files)** ✓ ·
build + assemble ✓ (E2E run at the final gate).

**En-route tooling artifact (NOT a code defect, recorded for the next
thread):** the Bash-tool output sanitizer strips the bytes `[m` from displayed
file contents (an ANSI-reset-shaped sequence) — `const [message` displays as
`const essage`. The Read tool shows the same artifact. Hexdump-level
verification (`codepoints`) is the discriminator; a suspected
"committed syntax error" in `newsletter.tsx` was confirmed INTACT this way
(the TS parser's `parseDiagnostics` reads 0 and the tree compiles — the file
was never broken).

## 2. Audit of `60e363a` (first-hand full-source verification)

Composition: `structured-data.ts` (`storeRootJsonLd` + the two identity
interfaces) + `csp.ts` (`extractNonce`) + the (storefront) layout wiring
(OUTSIDE `<main>`) + root layout (3 preloads + `themeColor`) +
`public/.well-known/security.txt` + the home-page comment + the
brand-metadata gate extension (10 cases) + the security-csp hardening
(Product graph selected by `@type` via `evaluateAll`) + 2 probe scripts +
4 refreshed screenshots + docs. `46bbb19` verified docs-only. Claims
verified against the final tree:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | F-N: WebSite + Organization JSON-LD rendered by the (storefront) layout OUTSIDE `<main>`, nonce-carrying, via `serializeJsonLd` | `structured-data.ts` read in full (two graphs in reference order, origin slash-normalized, logo = `/icons/icon-512.png` absolutized); `csp.ts` `extractNonce` read (regex + null-on-absent); `layout.tsx` read — the blocks render in the fragment BEFORE `<StoreProvider>`/`<main>`, `nonce={extractNonce(...) ?? undefined}`, `dangerouslySetInnerHTML` through the F-D serializer; the home page carries only the placement comment | TRUE |
| 2 | F-O: three first-paint font preloads with crossorigin | `src/app/layout.tsx` read — `FONT_PRELOADS` const (cormorant-300 + montserrat-300/400), `as="font" type="font/woff2" crossOrigin="anonymous"`; wire-verified below (all three serve) | TRUE |
| 3 | F-P: `themeColor: "#F8F7F6"` | `viewport` export read; wire-verified `<meta name="theme-color" content="#F8F7F6">` on home AND login | TRUE |
| 4 | F-Q: security.txt with concrete values | `public/.well-known/security.txt` read (Contact = the repo's real advisory channel, Policy = README, Preferred-Languages, Expires 2027-11-01); serves on the built standalone (session-25's own gate pins it) | TRUE |

**Verdict: 4/4 claims TRUE, zero production regressions.** Wire probes this
round confirmed the served bytes: home carries exactly 2 ld+json blocks
(WebSite, Organization), login carries 3 font preloads (+1 Next script
preload), theme-color on both, PDP carries 3 ld blocks (WebSite, Organization,
Product — the @type-selected gate holds).

## 3. Live reference sweep — round 21a (measured 2026-10-17): **REFERENCE DRIFT caught**

Full two-census ritual (both viewports, both sides). The CLONE side is
byte-stable against the recorded round-17/18/19/20 ledger — EIGHTEENTH
consecutive clone-side sweep. **The REFERENCE side moved:**

| Ledger field | Recorded (rounds 17–20) | Round-21a measured | Verdict |
|---|---|---|---|
| ref desktop pageH | 11079 | 11079 | byte-stable |
| ref desktop mainKids | 10 | **11** | **DRIFT** |
| ref mobile pageH | 11257 | 11257 | byte-stable |
| ref mobile mainKids | 10 | **11** | **DRIFT** |
| ref footers | 444 / 1189 | 444 / 1189 | byte-stable |
| clone (all fields, both viewports) | 11085/11264, mainKids 10, footers 444/1189, drawer gaps [20,20,20,20] | identical | byte-stable — **the mobile-nav v4 pin holds** (char-identical panelCls/navCls, 5 items, gaps [20,20,20,20]) |
| chip/marquee/font ranks | pinned | identical | byte-stable |

**The new 11th reference child (enumerated first-hand, both viewports):**
`<section class="py-24 px-6 relative overflow-hidden bg-primary text-primary-foreground">`
— **THE VELOUR JOURNAL / "Join the Inner Circle" — the newsletter band** —
moved from OUTSIDE `<main>` to the LAST child INSIDE `<main>`. pageH is
byte-unchanged (the band's height merely moved from the after-main region
into the main-children census), so the move is VISUALLY invisible — a
structural re-composition, exactly the drift class the section census exists
to catch. The clone renders its `<Newsletter />` as a layout SIBLING after
`</main>`; the reference now renders it inside.

## 4. Fresh audit pass — findings (the round's targets)

Seams opened this session that no prior round audited: the auth-page identity
surface, the canonical surface, the product-OG surface — plus the structural
move above. All findings wire-verified against the BUILT standalone (:3200
probe) and the live reference (home + login heads, main composition).

1. **F-R — the newsletter band's `<main>` membership (structure parity).**
   The reference's home now carries the newsletter INSIDE `<main>` as the
   11th child (measured 2026-10-17, both viewports); the clone renders it
   outside. Rest-invisible by construction (pageH byte-unchanged on both
   sides; the band's own height already matches — the previous pageH parity
   proves it). Remediation: move `<Newsletter />` INSIDE `<main>` in the
   `(storefront)` layout, after `{children}` — the visual order (content →
   newsletter → footer) is unchanged, and home mainKids becomes 11 = ref 11.
   No unit seam (pure DOM composition); the round-21b census byte-equality is
   the gate. Verified safe for the suite: no spec counts main children (all
   `main` locators are role/text-scoped), the axe surfaces re-audit the same
   DOM (a form inside the main landmark is ordinary), and the skip-link
   target (`#main-content`) is untouched.
2. **F-S — the auth pages ship ZERO identity graphs where the reference's
   login ships THREE.** Measured ref-login head: `WebSite {name, url}`,
   `Organization {name, logo, url}` (same two blocks as its home — site-level
   builder injection), plus a `BreadcrumbList`
   (`[Home → origin/, login → origin/login]` — the page-level graph). The
   clone's `/login` and `/register` ship zero (the session-25 fix scoped the
   identity blocks to the storefront layout; the chrome-less (auth) group was
   never audited). Remediation: (a) a pure seam
   `breadcrumbJsonLd(entries)` in `src/lib/structured-data.ts` (position
   1-based, `item` absolutized via the established contract); (b) a NEW
   `src/app/(auth)/layout.tsx` rendering the two site-level blocks via the
   existing `storeRootJsonLd` + `serializeJsonLd` + `extractNonce(headers())`
   (the layout is additive — the group has no layout today, pages stay
   chrome-less); (c) login/register pages each render their own breadcrumb
   (`Home → /, login → /login` / `Home → /, register → /register` — the
   reference-faithful measured shape; register's is the parallel form for the
   clone-only page). DOM order = layout blocks first, then the page block —
   byte-matching the reference's WebSite → Organization → Breadcrumb order.
3. **F-T — canonical links missing on the indexable statics.** The reference
   ships `<link rel="canonical">` on home (`…/` — trailing slash, measured)
   AND login (`…/login`); the clone ships a canonical on the PDP ONLY
   (`alternates.canonical` shipped with the PDP metadata, session-19-era) —
   home/shop/login/register render none. Remediation:
   `alternates: { canonical: <path> }` on the four statics — home `/`,
   shop `/shop`, login `/login`, register `/register` (Next resolves against
   the existing `metadataBase`; the rendered origin matches the sitemap's
   documented default-origin contract). **Measured convention delta (named
   at the source):** Next's `resolveAbsoluteUrlWithPathname` collapses a
   root-path canonical to the bare origin (pathname "/" + no query →
   `result.origin`) — the clone's home canonical renders `…` without the
   reference's trailing slash; RFC-3986-equivalent, pinned as served. The
   PDP's existing canonical is pinned in the gate (it never had a pin).
4. **F-V — the PDP og surface carries no price (the carried session-25 §8
   #8 superset item).** The PDP renders no `product:price:*` metas; e-commerce
   crawlers read share-card prices from the OG product extension. Next 16.4
   types (read from `next/dist/lib/metadata/types/`): `OpenGraphType` lacks
   `"product"` AND `openGraph.other` does not exist on the input types — the
   typed escape hatch is the TOP-LEVEL `Metadata.other` (documented "use this
   field to define custom meta tags that are not directly supported"), which
   renders `<meta name="product:price:amount">`. Remediation:
   `metadata.other = { "product:price:amount": (price/100).toFixed(2),
   "product:price:currency": "USD" }` on the found path — the same
   cents→dollars arithmetic the Product JSON-LD unit-pins. **Two documented
   residuals (type-honesty over wire-shape purity):** og:type stays
   `website` (a type-dishonest cast was rejected) and the tags render with
   the `name` attribute (Next's `other` contract), not OG's conventional
   `property`. The schema.org Product JSON-LD Offer remains the
   authoritative price channel (already unit-pinned).

INFO-level: the reference ships NO robots meta on home or login (measured —
the clone matches: none). The reference's login og:type is `website` (clone
matches). The clone login's 4th preload is Next's own chunk preload (as=script
— convention output, correct). Ref-home canonical's trailing slash is
reproduced by `canonical: "/"` (Next preserves it). security.txt's Expires
renewal cadence stays a documented maintenance item (2027-11-01).

### Honest-gate decisions (run before planning)

- **F-R mirrors the reference exactly, at its composition level.** The
  newsletter moves inside `<main>` in the LAYOUT (site-wide chrome — the
  reference's builder moved its band inside its main; our layout is the
  matching composition point). No page-level change.
- **F-S is reference-faithful in shape, clone-owned in values.** The
  breadcrumb mirrors the measured two-ListItem shape with the measured
  capitalization (`Home`, lowercase `login`); URLs are the clone's own origin.
- **No gate is weakened.** The brand-metadata gate EXTENDS (3 new cases); the
  security-csp gate is untouched (the per-tag nonce assertion runs on `/`
  only — the auth blocks carry the nonce anyway as defense-in-depth).
- **Doctrine constraints:** parity law (all four fixes are rest-invisible:
  F-R moves a node without changing one pixel — pageH is the proof; F-S/F-T/
  F-V are head-layer); no mutation-seam or client-state changes; no new npm
  dependencies; vitest/playwright configs untouched (new cases land in the
  existing include/testDir contracts); `.env.example` unchanged (no new env
  vars); money untouched (the og price re-uses the cents→dollars arithmetic
  the Product JSON-LD already pins).

## 5. Remediation design (TDD)

### ToDo

| # | Task | Layer | Gate |
|---|---|---|---|
| 1 | `src/lib/structured-data.test.ts` FIRST — `breadcrumbJsonLd` contract: `{@context, @type: "BreadcrumbList", itemListElement}` with 1-based positions, name+item per entry, `item` absolutized (root-relative → absolute, absolute passthrough), exact key sets, the reference-faithful login shape as the worked example | unit (RED) | vitest |
| 2 | GREEN — `breadcrumbJsonLd` in `src/lib/structured-data.ts` (+ the `BreadcrumbJsonLd`/`BreadcrumbEntry` types) | production seam | vitest GREEN |
| 3 | F-R wiring: `(storefront)/layout.tsx` — `<Newsletter />` moves inside `<main>` after `{children}`; comment updated (the trap-#40 note stays; the census verdict note gains the 21a drift) | production surface | typecheck + lint + round-21b census |
| 4 | F-S wiring: NEW `src/app/(auth)/layout.tsx` — the two `storeRootJsonLd` blocks (nonce via `extractNonce(headers())`, `serializeJsonLd`); login page renders `breadcrumbJsonLd([Home /, login /login])`, register the parallel `register` shape | production surface | typecheck + wire check |
| 5 | F-T wiring: `alternates.canonical` on home `/`, shop `/shop`, login `/login`, register `/register` | production surface | wire check |
| 6 | F-V wiring: PDP `generateMetadata` — top-level `metadata.other` carries `product:price:amount` = "2850.00" (the seeded gown's cents→dollars) + `product:price:currency` = "USD"; og/images shape unchanged | production surface | typecheck + wire check |
| 7 | `tests/e2e/brand-metadata.spec.ts` extension — three cases: (1) `/login` + `/register` serve THREE ld+json blocks with the exact measured shapes AND all carry the request nonce in the served bytes (the home JSON-LD case's extraction discipline); (2) canonical links serve on `/` (bare origin — Next's root collapse), `/shop`, `/login`, `/register`, and the PDP; (3) the PDP carries `product:price:amount` = "2850.00" + `product:price:currency` = "USD" (name-attributed — Next's `other` contract) | E2E | playwright |
| 8 | Mutation demos (surgical, inverse-edit restores — never `git checkout`, traps #37/#39): (a) drop the BreadcrumbList block from login → exactly the auth-identity case fails; (b) remove login's canonical → exactly the canonical case fails; (c) drop `product:price:amount` → exactly the og-price case fails. F-R's gate IS the census (no mutation demo — the 21b byte-equality is the verdict) | process | vitest + playwright |
| 9 | Round-21b census — MUST match the NEW reference ledger (mainKids 11 both viewports; clone secs gains the newsletter height as the 11th entry; all other fields byte-stable) | parity | sweep tool |
| 10 | Screenshots refresh (`--shots`), mobile drawer visual verify | evidence | files |
| 11 | Docs alignment: SKILL v1.19.0 (project_state counts, §2 rows, trap log untouched unless a trap emerges, §11 counts, Appendix B rows), README (badge/counts + feature rows), CLAUDE.md (gate line + unit-list row + gate description), PAD (test table, §7.1 coverage paragraph, §7.3, tree rows), this file's execution record, worklog | docs | stale-count sweep |

### Count ledger (expected post-remediation)

| Metric | Before | After |
|---|---|---|
| unit files | 19 | 19 (structured-data.test.ts extends) |
| unit tests | 169 | 173 (+4 breadcrumbJsonLd) |
| E2E spec files | 16 | 16 (brand-metadata.spec.ts extended) |
| unique E2E cases | 103 | 106 (+3 brand-metadata cases × both projects) |
| E2E result | 206 passed + 2 skipped | 212 passed + 2 skipped |

## 6. Validation of this plan against the codebase (pre-execution)

- `(auth)` has NO layout today (`ls src/app/(auth)` → login/ register/ only) —
  the new group layout is purely additive; both pages stay chrome-less (the
  layout returns the data blocks + children in a fragment, no chrome).
- Both auth pages are `force-dynamic` — `headers()` is callable; the root
  layout's `metadataBase` resolves the canonicals (the rendered origin = the
  documented default-origin contract).
- Home has NO metadata export today (title falls through to the root default
  "AURELIA" — the measured ref title); adding `alternates` only — the title/
  description stay untouched (parity: the title byte-unchanged).
- Shop's metadata is title+description — `alternates` is additive.
- PDP already exports `alternates.canonical` (the gate adds the missing pin);
  `generateMetadata`'s found path builds `openGraph` from
  `parseProductImages` — the F-V shape keeps `images` conditional and adds
  `other` + `type`-free price tags (no OpenGraphType cast anywhere).
- The gown's DB price is 285000 cents (seed: `p.price * 100` from catalog
  dollars 2850) → `product:price:amount` = "2850.00" (the same /100 arithmetic
  the Product JSON-LD unit-pins).
- No spec counts `main` children; the newsletter's locators in the home spec
  are text/role-scoped; `locator("main").getByRole(...)` consumers (shop/PDP/
  cart/admin/a11y) never match the newsletter's controls. The axe gate re-audits
  the same DOM (a subscribe form inside the main landmark is ordinary HTML).
- `storeRootJsonLd`, `serializeJsonLd`, `extractNonce` exist and are unit-pinned
  — F-S reuses them; only `breadcrumbJsonLd` is new.
- No schema/env/seed changes; money untouched; no revalidatePath surface;
  `.env.example` unchanged.

## 7. Execution record

| # | Task | Result |
|---|---|---|
| 1 | unit RED (breadcrumbJsonLd) | ✅ exactly the 4 new cases fail on the missing export (14 existing pass) |
| 2 | seam GREEN | ✅ `breadcrumbJsonLd` + `BreadcrumbEntry`/`BreadcrumbJsonLd` types in `src/lib/structured-data.ts`. Full suite **173/173 (19 files)** — count ledger exact |
| 3 | F-R wiring (newsletter inside `<main>`) | ✅ `(storefront)/layout.tsx`: `<Newsletter />` moved after `{children}` inside `<main id="main-content">`; the F-R comment records the measured reference move; footer stays outside. Wire-verified: home mainKids 11, the newsletter is the 11th (last) main child both viewports |
| 4 | F-S wiring (auth identity + breadcrumbs) | ✅ NEW `src/app/(auth)/layout.tsx` (the two `storeRootJsonLd` blocks, nonce via `extractNonce(headers())`, `serializeJsonLd`-escaped); login renders the measured breadcrumb (Home `/` → login `/login`), register the parallel shape. Wire-verified: `/login` + `/register` serve [WebSite, Organization, BreadcrumbList] in reference order, all nonce-carrying |
| 5 | F-T wiring (canonicals) | ✅ `alternates.canonical` on home `/`, shop `/shop`, login `/login`, register `/register`. Wire-verified on all four + the PDP. En-route discovery: home's canonical renders the BARE ORIGIN — Next's `resolveAbsoluteUrlWithPathname` collapses pathname `/` + no query to `result.origin` (mechanism named at the source); RFC-3986-equivalent to the reference's trailing-slash form; pinned as served |
| 6 | F-V wiring (product price metas) | ✅ PDP `generateMetadata` top-level `metadata.other`: `product:price:amount` "2850.00" + `product:price:currency` "USD" (the cents→dollars arithmetic the JSON-LD pins). En-route type discovery: `openGraph.other` does NOT exist on Next 16.4's input types (the first wiring failed typecheck) — the typed route is the top-level `Metadata.other` (renders `name`-attributed metas); og:type stays `website` (the OpenGraphType union lacks "product"; a cast was rejected). og/images shape unchanged |
| 7 | brand-metadata E2E extension | ✅ 28/28 (2 setups-in-run excluded — 14 cases × 2 projects). En-route gate lesson: the FIRST run failed the auth-identity + canonical cases on BOTH projects — the spec inherits the per-project LOGGED-IN storageState and `/login` REDIRECTS a session to `/account` (which serves exactly the layout's two blocks — a confusing near-pass shape). Fixed with the established empty-storageState opt-out (`test.use` at the session-26 describe level — the a11y/auth specs' pattern); the three new cases live in their own logged-out describe |
| 8 | Mutation demos | ✅ surgical: (a) login's breadcrumb block dropped → exactly the auth-identity case fails (2 projects) → restored by inverse edit (en-route: the half-done mutant failed the BUILD — strict TS rejected the unused imports/locals; the mutant was completed honestly before the demo ran, the session-24 demo-c discipline); (b) login's canonical removed → exactly the canonical case fails (2 projects) → restored; (c) `product:price:amount` dropped → exactly the F-V case fails (2 projects) → restored. Verified post-restore: 10 F-S/F-T/F-V/F-R markers, the price tag, 8 canonical mentions back in place. F-R's gate IS the census (no mutation demo — the 21b byte-equality is the verdict) |
| 9 | round-21b census | ✅ **ZERO DRIFT against the NEW reference ledger — 18th consecutive sweep**: mainKids 11 BOTH sides both viewports; the clone's 11th secs entry byte-matches the reference's newsletter band (470 desktop / 569 mobile); pageH byte-unchanged on the clone (11085/11264 — the F-R move proven rest-invisible by measurement); the documented ±1-3px per-section residues unchanged (836-vs-835, 3551-vs-3549, 3174-vs-3171); drawer gaps [20,20,20,20] with char-identical panelCls/navCls — the v4 mobile-nav pin holds; chip/marquee/nameH3 (Cormorant) hold; clone console clean |
| 10 | Screenshots + drawer verify | ✅ 9 re-captures via sweep `--shots`: 5 byte-identical (rest-invariance), 4 refreshed (2 clone-mobile + 2 reference-side — the reference's own live drift); the mobile drawer capture visually verified (VELOUR logotype, five flush-left items, w-80 panel, dimmed backdrop) |
| 11 | Docs alignment + stale-count sweep | ✅ SKILL v1.19.0 (frontmatter version/project_state 173 + 212+2, §2 unit/E2E rows + breadcrumbJsonLd, §5 (auth)/layout row, §11 counts, Appendix B session-26 row); README (badge 173+212, the auth-identity/canonicals/product-OG feature row, testing + status rows); CLAUDE.md (gate line 173/106 + extended gate description, unit-list breadcrumbJsonLd row, commands block); PAD (test table 19\|173 + 16\|106\|212, §7.1 session-26 coverage paragraph, §7.3 counts, (auth)/layout + (storefront)/layout tree rows); this file's record; worklog. Stale-count sweep over the five living docs: ZERO stale counts |
| — | Final gates on the final tree | typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build ✓ E2E — the final full-suite run lands below (recorded in the worklog) |

## 8. Residual risks / next steps (post-F-R/F-S/F-T/F-V)

1. `error.tsx`'s SSR document-path render remains **Reasoned** (carried,
   session-23 §4 rationale).
2. `style-src 'unsafe-inline'` remains the documented CSP exception (carried).
3. Real PSP behind the checkout seam (carried).
4. Dev-toolchain npm-audit findings (11, all dev-only) — carried.
5. G-3 POSIX-only sweep paths (carried).
6. The action-seam gate couples to the standalone manifest shape — fails loud
   at the canary by design (carried).
7. The zero-drift streak is a streak, not a guarantee — the two-census ritual
   stays mandatory before every commit. The reference MOVED this session
   (newsletter into `<main>`) after four byte-stable sweeps — the ritual's
   value is precisely that the move was caught and mirrored same-session.
8. PDP og:type stays `website` — Next's `OpenGraphType` union lacks
   `"product"`; a richer OG product surface (og:type product + property-
   attributed price tags) would need a type-dishonest cast or a manual meta
   injector (rejected this round; the JSON-LD Offer remains the authoritative
   price channel). Carried with the mechanism documented.
9. security.txt's `Expires` (2027-11-01) renewal stays a documented
   maintenance cadence.
10. The canonical convention delta (home renders the bare origin vs the
    reference's trailing-slash form) is RFC-3986-equivalent and pinned as
    served — no action, recorded for the next auditor.
