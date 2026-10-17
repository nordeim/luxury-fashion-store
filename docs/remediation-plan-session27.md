# Remediation Plan — Session 27 (AURELIA / VELOUR clone)

> **Status:** PLANNED → EXECUTED this round (the session-26 continuation, named
> for the next session number per the standing precedent).
> **Mode:** Verify-first (Mode C) → reconciliation of the pulled remote
> (`c15c0fb` the session-26 structure/auth-identity/canonical/product-OG round
> + `8c467a0` its session log) → first-hand audit → live-reference parity
> sweep round 22 → fresh audit pass → TDD remediation. **Scope:** the
> session-26 commit audited 4/4 claims TRUE first-hand (F-R newsletter inside
> `<main>`, F-S the (auth) identity + breadcrumb graphs, F-T the canonicals,
> F-V the product-price metas — all read in source and wire-probed on the
> built standalone, 13/14 probe checks passing); **the round-22a census
> measured ZERO DRIFT** (19th consecutive clone-side sweep — the reference is
> byte-stable against the NEW round-21 ledger, mainKids 11 both sides both
> viewports); **the fresh pass opened the PDP's OG surface and found F-W** —
> the child `openGraph` override silently REPLACES the root layout's
> site-level OG identity (Next shallow metadata merge), dropping
> `og:type` / `og:site_name` / `og:url` from the PDP head. F-W is head-layer,
> zero visual footprint; the round-22b census is the rest-invariance verdict.

---

## 1. Starting state

WARM workspace at `8c467a0` (`main`, remote-verified after the fast-forward
`c15c0fb..8c467a0` — the pull brought only `docs/session_26.md`, the previous
thread's session log; docs only, no code). Environment per the worklog's
incident playbook:

| Step | Result |
|---|---|
| `git pull` | ✓ fast-forward to `8c467a0`; tree clean |
| `.env` verified canonical (`file:../db/custom.db` + dev AUTH_SECRET + site URL) | ✓ survived this reset |
| Playwright cache present (v1200 + v1248) | ✓ no reinstall needed |
| `bin/ssh` paramiko shim + `paramiko` 5.0.0 in the venv | ✓ verified present |
| `db/custom.db` canonical 4/12/2/4 (verified via `env -u DATABASE_URL` count) | ✓ no reseed needed |
| `core.fileMode false` survived | ✓ verified |
| `skills/` intact | ✓ |

**Baseline gates on the committed tree (NINETEENTH consecutive session fully
green at baseline):** typecheck ✓ · lint ✓ · **173/173 unit (19 files)** ✓ ·
build + assemble ✓ (E2E runs at the final gate).

## 2. Audit of `c15c0fb` (first-hand full-source verification)

Composition: `(storefront)/layout.tsx` (the F-R newsletter move + the F-N
blocks retained) + the NEW `(auth)/layout.tsx` (F-S site-level identity) +
login/register pages (F-S breadcrumbs + F-T canonicals) + home/shop pages
(F-T canonicals) + the PDP `generateMetadata` (F-V `metadata.other` price +
the pre-existing canonical) + `structured-data.ts` `breadcrumbJsonLd` (+
unit extension) + the brand-metadata gate extension (session-26 describe,
logged-out opt-out) + probe scripts + 9 screenshot re-captures + docs.
Claims verified against the final tree:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | F-R: `<Newsletter />` renders INSIDE `<main>` after `{children}` in the (storefront) layout; footer stays outside; the F-R comment records the measured reference move | `layout.tsx` read in full — `<main id="main-content" …>{children}<Newsletter /></main>`; wire probe: the newsletter markup sits inside the main element | TRUE |
| 2 | F-S: the (auth) layout ships WebSite + Organization (nonce-carrying, serializeJsonLd-escaped) and login/register each render `breadcrumbJsonLd` in the measured flat shape | `(auth)/layout.tsx` read in full (blocks render BEFORE children — served order WebSite → Organization → Breadcrumb); both pages import + render the seam; wire probe: 3 blocks each, order + shapes exact, all nonce-tagged (`nonce="<header-nonce>"` in the served bytes) | TRUE |
| 3 | F-T: `alternates.canonical` on home `/` (serves the bare origin — Next's root collapse), shop `/shop`, login `/login`, register `/register`; the PDP's canonical pinned | all four `page.tsx`/`page.tsx` metadata exports read; wire probe: all four canonicals serve exactly the pinned hrefs | TRUE |
| 4 | F-V: the PDP's top-level `metadata.other` carries `product:price:amount` "2850.00" + `product:price:currency` "USD" (the cents→dollars arithmetic) | `generateMetadata` read; wire probe: both metas serve name-attributed; the Product JSON-LD Offer remains authoritative | TRUE |

**Verdict: 4/4 claims TRUE, zero production regressions.** The served
breadcrumb shape is the unit-pinned flat `{@type, position, name, item}` form
(`structured-data.test.ts` lines 192-193) — the audit's first probe draft
asserted a nested `item.name` shape and mis-reported two FAILs; fixed in the
probe (kept as `scripts/wire-probe-session27.cjs`, the session's evidence
tool), NOT in the product.

## 3. Live reference sweep — round 22a (measured 2026-10-17): ZERO DRIFT

Full two-census ritual (both viewports, both sides). The reference is
byte-stable against the NEW round-21 ledger — **19th consecutive clone-side
sweep**:

| Ledger field | Round-21 ledger | Round-22a measured | Verdict |
|---|---|---|---|
| ref desktop pageH / mainKids | 11079 / 11 | 11079 / 11 | byte-stable |
| ref mobile pageH / mainKids | 11257 / 11 | 11257 / 11 | byte-stable |
| ref footers | 444 / 1189 | 444 / 1189 | byte-stable |
| clone (all fields, both viewports) | 11085/11264, mainKids 11, footers 444/1189, drawer gaps [20,20,20,20] | identical | byte-stable — **the mobile-nav v4 pin holds** (char-identical panelCls/navCls, 5 items, gaps [20,20,20,20]; the standing task re-check) |
| chip/marquee/nameH3 (Cormorant Garamond) ranks | pinned | identical | byte-stable |
| ref console | 2× 401 (the reference's own auth endpoints — pre-existing) | identical | documented residue |

The reference did NOT move this round. F-R's round-21 catch-up remains the
correct mirror (mainKids 11 BOTH sides).

## 4. Fresh audit pass — findings (the round's targets)

Seam opened that no prior round audited: the PDP's OG identity surface (the
F-K2/F-V rounds pinned the PDP's og:image and price metas but never the
site-level OG fields). Wire-verified against the BUILT standalone (:3200
probe + full head dump on PDP/home/shop/login).

1. **F-W — the PDP head silently drops the site-level OG identity fields.**
   Served-bytes evidence: home and shop render `og:type="website"`,
   `og:site_name="AURELIA"`, `og:url="<origin>"` (inherited from the root
   layout's `openGraph: { siteName: "AURELIA", type: "website", url: siteUrl }`);
   **the PDP renders NONE of the three** — only `og:title`, `og:description`,
   `og:image` (the F-K2 product photograph) + the twitter mirror. Root cause
   (named at the mechanism): Next.js metadata is merged SHALLOWLY per
   segment — a child segment's `openGraph` object REPLACES the root's
   wholesale (it does not deep-merge), and the PDP's
   `openGraph: images.length > 0 ? { images: [{ url: images[0] }] } :
   undefined` therefore discards the parent's `siteName`/`type`/`url`.
   Secondary effect: the PDP's og:image also loses the
   `og:image:type/width/height` annotations the root card carries (the file
   convention knows its own PNG's dimensions; the remote catalog URL's
   dimensions are not statically known — declaring them would be dishonest;
   left as a documented residual). Impact: share crawlers read the PDP card
   without the site identity (og:type falls back to "website" per the OG
   spec, so the practical harm is low — but the served head is inconsistent
   with every other page and with the session-26 plan's own residual note,
   which assumed og:type "stays website"). Severity: LOW (head-layer,
   zero visual footprint, machine-reader-facing only). Remediation: the PDP's
   `openGraph` re-declares the three site-level fields — `type: "website"`
   (the honest type; Next's `OpenGraphType` union lacks `"product"`, the
   session-26 documented residual) + `siteName: "AURELIA"` + `url: siteUrl`
   (the site-wide origin convention the root declares for every page; the
   canonical link carries the per-page identity). No new seam (page wiring),
   gate = the brand-metadata E2E extension + the round-22b census.

INFO-level (verified, no action): only ONE child `openGraph` override exists
in `src/app/` (the PDP — the sole instance of the pattern); login/register/
cart/checkout/account/admin inherit the root block wholesale (og:type serves
on them); the PDP og:image width/height annotations residual (above); the
reference ships no robots meta on any audited page (clone matches);
`/shop`'s inherited `og:url` = origin (the root convention — documented, the
canonical link disambiguates).

### Honest-gate decisions (run before planning)

- **F-W restores consistency; it does not restyle anything.** The three metas
  are head-layer; the PDP's rendered DOM is untouched; the reference has no
  PDP (superset surface — the parity law governs shared surfaces only).
- **No gate is weakened.** The brand-metadata gate EXTENDS (+1 case); the
  og:image and F-V price pins are untouched; og:type stays the honest
  "website" (no cast).
- **Doctrine constraints:** parity law (F-W is invisible at rest — the
  round-22b census is the verdict); no mutation-seam or client-state changes;
  no new npm dependencies; vitest/playwright configs untouched (the new case
  lands in the existing spec's describe contract); `.env.example` unchanged
  (no new env vars); money untouched.

## 5. Remediation design (TDD)

### ToDo

| # | Task | Layer | Gate |
|---|---|---|---|
| 1 | `tests/e2e/brand-metadata.spec.ts` FIRST — F-W case: the PDP head carries `og:type="website"` + `og:site_name="AURELIA"` + `og:url="<origin>"` (exact served-bytes serialization, property-attributed). Spec header comment gains the session-27 extension note. RED on the pre-fix tree (verified: the probe's evidence run) | E2E (RED) | playwright |
| 2 | GREEN — the PDP `generateMetadata`'s `openGraph` re-declares `type: "website"`, `siteName: "AURELIA"`, `url: siteUrl` (hoisted `const siteUrl`, re-used by the JSON-LD call); comment names the shallow-merge mechanism + the two documented residuals (og:type honest-website; og:image annotations) | production surface | typecheck + playwright GREEN |
| 3 | Mutation demo (surgical, inverse-edit restore — traps #37/#39): drop the three re-declared fields → exactly the F-W case fails (both projects) → restore by inverse edit; `rg` verifies the markers are back | process | playwright |
| 4 | Round-22b census — MUST be byte-stable vs the 22a ledger (F-W is head-layer on the PDP; the census measures home — the verdict closes the rest-invariance claim) | parity | sweep tool |
| 5 | Final gates on the final tree: typecheck → lint → unit → build → full E2E | gates | npm run verify + test:e2e |
| 6 | Screenshots refresh (`--shots`), mobile drawer visual verify (the standing re-check) | evidence | files |
| 7 | Docs alignment: SKILL v1.20.0 (trap #41 — the shallow-merge trap + §10 symptom row; frontmatter/project_state counts; §2 E2E row; Appendix B brand-metadata row), README (badge + feature row + testing rows), CLAUDE.md (gate line + gate description), PAD (test table, §7.1 paragraph, §7.3), this file's execution record, worklog | docs | stale-count sweep |

### Count ledger (expected post-remediation)

| Metric | Before | After |
|---|---|---|
| unit files / tests | 19 / 173 | 19 / 173 (no new pure seam — F-W is page wiring) |
| E2E spec files | 16 | 16 (brand-metadata.spec.ts extended) |
| unique E2E cases | 106 | 107 (+1 F-W case × both projects) |
| E2E result | 212 passed + 2 skipped | 214 passed + 2 skipped |

## 6. Validation of this plan against the codebase (pre-execution)

- The PDP's `generateMetadata` builds `openGraph` from `parseProductImages`
  — the F-W shape keeps `images` conditional and adds the three fields only
  (no OpenGraphType cast anywhere; `"website"` is a union member).
- `siteUrl` is already computed inline in the same function for the JSON-LD
  call — hoisting it is a pure readability change (single source in-scope).
- The main describe's PDP cases run on the per-project logged-in storageState;
  the PDP does NOT redirect sessions (the page guard lives on the auth pages)
  — the F-W case joins the main describe with no opt-out needed.
- The brand-metadata gate's F-V case pins exact served strings
  (`<meta name="product:price:amount" content="2850.00"/>`) — the F-W case
  follows the same served-bytes discipline with the property-attributed
  serialization Next emits (`<meta property="og:type" content="website"/>`).
- No schema/env/seed changes; money untouched; no revalidatePath surface;
  `.env.example` unchanged; `next.config.ts` untouched.
- The census measures the home page only — the F-W change (PDP head) cannot
  drift it; the ritual still runs as the verdict (trap #40's discipline).

## 7. Execution record

| # | Task | Result |
|---|---|---|
| 1 | unit/E2E RED (F-W case) | ✅ the new case failed on BOTH projects against the pre-fix standalone (og:type/og:site_name/og:url absent — the probe's pre-fix evidence run showed the same three ABSENT) |
| 2 | GREEN (PDP openGraph re-declaration) | ✅ `type: "website"` + `siteName: "AURELIA"` + `url: siteUrl` restored; `siteUrl` hoisted and re-used by the JSON-LD call; the F-W case passed both projects; the full brand-metadata file GREEN |
| 3 | Mutation demo | ✅ surgical: the three fields dropped → exactly the F-W case failed (2 projects) → restored by inverse edit; `rg` verified the markers back before the rebuild |
| 4 | round-22b census | ✅ ZERO DRIFT — 19th/20th consecutive: mainKids 11 both sides both viewports; pageH 11079/11085 + 11257/11264 byte-stable; footers 444/1189; drawer gaps [20,20,20,20] char-identical (the v4 mobile-nav pin holds); chip/marquee/nameH3 hold; clone console clean |
| 5 | Final gates on the final tree | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **214 passed + 2 skipped** (107 unique × 2 − 2 desktop-only skips + 2 setup) |
| 6 | Screenshots + drawer verify | ✅ re-captures via sweep `--shots`; the clone side byte-identical (rest-invariance); the mobile drawer capture visually verified (VELOUR logotype, five flush-left items, w-80 panel) |
| 7 | Docs alignment + stale-count sweep | ✅ SKILL v1.20.0 (trap #41 + §10 row, frontmatter, §2, Appendix B); README (badge 173+214, feature row, testing/status rows); CLAUDE.md (gate line 173/107 + description); PAD (test table 19\|173 + 16\|107\|214, §7.1 session-27 paragraph, §7.3); this file's record; worklog. Stale-count sweep: zero stale counts |

## 8. Residual risks / next steps (post-F-W)

1. The PDP og:image carries no `og:image:type/width/height` annotations (the
   remote catalog URL's dimensions are not statically known — declaring them
   would be dishonest). The root card keeps its annotations. Carried, documented.
2. og:type on ALL pages stays `website` — Next's `OpenGraphType` union lacks
   `"product"`; a type-dishonest cast remains rejected (the JSON-LD Offer is
   the authoritative price channel). Carried (session-26 §8 #8).
3. `style-src 'unsafe-inline'` remains the documented CSP exception (carried).
4. Real PSP behind the checkout seam (carried).
5. Dev-toolchain npm-audit findings (11, all dev-only) — carried.
6. G-3 POSIX-only sweep paths (carried).
7. The action-seam gate couples to the standalone manifest shape — fails loud
   at the canary by design (carried).
8. The zero-drift streak is a streak, not a guarantee — the two-census ritual
   stays mandatory. The reference moved in round 21 after four stable sweeps;
   round 22 measured zero drift; the ritual's value is the verified "no news".
9. security.txt's `Expires` (2027-11-01) renewal stays a documented
   maintenance cadence.
10. The canonical convention delta (home renders the bare origin vs the
    reference's trailing-slash form) remains RFC-3986-equivalent, pinned as
    served (carried, session-26).
11. `/shop`'s inherited `og:url` = origin (the root convention; the canonical
    link disambiguates) — accepted; a per-page og:url would diverge from the
    site-wide root declaration for no measured consumer benefit. Carried.
