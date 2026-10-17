# Remediation Plan — Session 25 (AURELIA / VELOUR clone)

> **Status:** PLANNED → EXECUTED this round (the session-24 continuation, named
> for the next session number per the session-20-continuation precedent).
> **Mode:** Verify-first (Mode C) → reconciliation of the pulled remote
> (`36ef8e9` the session-24 brand-metadata round + `9200479`/`02231ec` the
> user-added transcripts) → first-hand audit → live-reference parity sweep
> round 20 → fresh audit pass → TDD remediation. **Scope:** the session-24
> commit audited 4/4 claims TRUE (F-K swan assets read + PIL-parsed, F-K2
> og:image diff + defensive parseProductImages, F-L buildManifest seam + static
> route + unit contract, F-M fonts immutable header); the fresh pass opened
> seams every prior round left untouched — the home structured-data surface,
> the font transport (preload) surface, the browser-chrome tint surface, and
> the RFC 9116 security-contact surface — yielding **F-N / F-O / F-P / F-Q,
> the store-root identity + first-paint transport catch-up**: the WebSite +
> Organization JSON-LD the reference itself ships and the clone never did,
> the font preloads that close the first-paint FOUT window, the theme-color
> that tints mobile browser chrome to the measured paper, and the
> security.txt the production-ready claim never shipped. All four are
> head/asset-layer, rest-invisible by construction (round-20a = 20b
> byte-equal is the gate).

---

## 1. Starting state

WARM workspace at `02231ec` (`main`, remote-verified). Environment restored per
the worklog's incident playbook:

| Step | Result |
|---|---|
| `git pull` | ✓ fast-forward `02231ec` = the user-added `docs/session_24.md` transcript (docs only, no code) |
| `.env` re-pinned — the sandbox had rewritten it to an ABSOLUTE single-line `DATABASE_URL` (the recurring reset) | ✓ canonical 3-line contract restored (DATABASE_URL + dev AUTH_SECRET + site URL) |
| `skills/` pruned by the sandbox → `git restore -- skills/`; untracked `bun.lock` deleted | ✓ |
| Playwright cache had the WRONG build (v1200 vs the pinned 1.64.0's v1248 — the session-24 variant, again) | ✓ `npx playwright install chromium` → v1248 |
| `bin/ssh` paramiko shim rebuilt (Appendix A recipe) + `paramiko` 5.0.0 into the venv (`pip` binary absent — `python3 -m pip`) | ✓ |
| `db/custom.db` EMPTY (zero rows — the session-22 incident class, third recurrence) → `npm run db:setup` (`env -u DATABASE_URL`) | ✓ canonical 4/12/2/4 |
| `core.fileMode false` survived this reset (the `.git` dir persisted) | ✓ verified, no re-set needed |

**Baseline gates on the committed tree (SIXTEENTH consecutive session fully
green at baseline):** typecheck ✓ · lint ✓ · **160/160 unit (19 files)** ✓ ·
build + assemble ✓ (E2E run at the final gate).

**En-route process incident (the known sandbox class):** a nohup'd standalone
probe died between tool invocations (the sandbox reaps backgrounded process
groups) — re-run as a single-invocation boot-probe-kill script; and one
listener survived its parent's `kill` and had to be killed by LISTENING pid
(the trap-#36 discipline, again). Both handled inside
`scripts/audit-probe-session24b.sh`.

## 2. Audit of `36ef8e9` (first-hand full-source verification)

Composition: 4 new src files (`manifest.ts` / `manifest.test.ts` /
`app/manifest.ts` / `icon.svg`) + 5 binary assets (favicon.ico /
apple-icon.png / opengraph-image.png / icon-{192,512}.png) +
`brand-metadata.spec.ts` + PDP og:image + next.config fonts header + 2
authoring scripts + docs/screenshots — `9200479`/`02231ec` verified docs-only.
Claims verified against the final tree:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | F-K: the swan mark ships (favicon.ico / icon.svg / apple-icon) | `icon.svg` read in full (charcoal circle `#404040` + cream swan `#F4ECD6`, aria-label, swan-mark comment); favicon.ico PIL-verifies as a 3-entry ICO (48×48 largest); apple-icon 180×180; all PIL-parse clean | TRUE |
| 2 | F-K2: og share cards (root card + per-product og:image) | opengraph-image.png PIL 1200×630; PDP diff read: `parseProductImages(product.images)` → `openGraph.images` on the found path only, `undefined` fallback; the parse degrades malformed JSON/non-arrays/non-strings to `[]` | TRUE |
| 3 | F-L: buildManifest seam + static route + served-body gate | seam + route + unit file read in full (6 cases; origin-independent root-relative paths; STATIC route — no force-dynamic, DB-free); E2E body assertions read (content-type + exact installability contract) | TRUE |
| 4 | F-M: fonts immutable caching | next.config.ts diff read: `/fonts/:file*` → `public, max-age=31536000, immutable`; wire-verified in the round's own gate (cache case) | TRUE |

**Verdict: 4/4 claims TRUE, zero production regressions.** The round-19 census
values hold at the round-20a re-measure below.

## 3. Live reference sweep — round 20a (measured 2026-10-17): ZERO drift

Full two-census ritual (both viewports, both sides). **Every ledger field
byte-matches the recorded round-17/18/19 values** — SEVENTEEN consecutive
sweeps:

- desktop: ref 11079 / clone 11085 (clone deals residue 3551 pinned); footers 444/444
- mobile: ref 11257 / clone 11264 (clone deals residue 3174 pinned); footers 1189/1189
- drawer: `panelCls` / `navCls` CHAR-IDENTICAL both sides; 5 items; gaps
  [20,20,20,20] — **the Tailwind v4 mobile-drawer pin intact** (the task's
  standing mobile-nav re-check)
- fonts/chips/marquee hold (clone superset h2×13 / h3×42 documented); clone
  console clean (the two `ref:` 401s are the reference's own auth pings)

## 4. Fresh audit pass — findings (the round's targets)

Seams opened this session that no prior round audited: the home structured-data
surface, the font transport surface, the browser-chrome tint surface, the
security-contact surface. All findings wire-verified against the BUILT
standalone (:3200 probe) and the live reference head.

1. **F-N — the home ships ZERO JSON-LD where the reference ships WebSite +
   Organization.** The reference's home head carries TWO builder-injected
   blocks (measured: `{"@type":"WebSite","name":"AURELIA","url":<origin>}` and
   `{"@type":"Organization","name":"AURELIA","logo":<logo png>,"url":<origin>}`);
   its login page carries three. The clone — which pioneered the PDP's Product
   JSON-LD (F-B/F-D) — renders zero on the store root (wire: `ld+json count 0`
   on `/`). This is a PARITY gap in the non-visual layer, not just superset.
   Remediation: a pure seam (`storeRootJsonLd(origin)` in
   `src/lib/structured-data.ts`, mirroring the reference's two-block shape with
   the clone's self-hosted `/icons/icon-512.png` as the Organization logo,
   absolutized via the established `absolutize` contract) rendered by the home
   page through the existing HTML-safe `serializeJsonLd`.
2. **F-N constraint (the security-gate interaction):** `security-csp.spec.ts`
   asserts EVERY inline script tag in the served home HTML carries the exact
   request nonce (`<script(?![^>]*\bsrc=)[^>]*>` — a data block matches). The
   PDP's Product JSON-LD block is served NONCELESS (wire-verified) and is safe
   only because the per-tag assertion runs on `/` only. Home JSON-LD therefore
   MUST carry the nonce: the home page reads the request's CSP header
   (`headers()` from next/headers — the proxy sets it on BOTH directions) and
   extracts the nonce via a new pure seam `extractNonce(csp)` in
   `src/lib/csp.ts` (null when absent → the attribute is simply omitted; dev
   CSP has no nonce and needs none). No gate is modified; the data block stays
   CSP-exempt (the nonce is inert on a non-executing type) while the gate's
   served-bytes heuristic stays literally true.
3. **F-O — no font preloads anywhere.** The head preloads 16 unsplash images +
   one script but ZERO fonts (wire-verified): the 12 self-hosted woff2
   binaries are discovered only after the CSS downloads and parses — a
   first-paint FOUT window on every cold visit. The reference ships none
   either (its fonts ride a CDN stylesheet), so this is pure superset.
   Remediation: three surgical `<link rel="preload" as="font" type="woff2"
   crossorigin>` tags for the FIRST-PAINT weight set — `cormorant-garamond-300`
   (hero display + header logotype, `font-light` measured), `montserrat-300`
   (hero kicker/accent, `font-light`), `montserrat-400` (the `--font-sans`
   body default) — rendered by the root layout (React 19 hoists `<link>` to
   head). `crossorigin` is REQUIRED even same-origin: @font-face fetches run
   in CORS mode, and a preload without it double-downloads (the documented
   preload gotcha).
4. **F-P — no `<meta name="theme-color">`.** The reference's login page ships
   `#000000` (its home ships none); the clone ships none anywhere — but its
   PWA manifest already pins `theme_color: #F8F7F6` (the measured paper).
   Remediation: `viewport.themeColor = "#F8F7F6"` in the root layout's
   existing `viewport` export — mobile Safari/Chrome tint the URL bar to the
   page paper, consistent with the installed-PWA chrome. Browser chrome only;
   rest-invisible.
5. **F-Q — `/.well-known/security.txt` → 404.** RFC 9116 asks every
   production site to publish its security-contact channel. Remediation: a
   static `public/.well-known/security.txt` (the standalone copies `public/`
   wholesale and serves `.well-known` — wire-verified at execution) with
   CONCRETE values: `Contact:` the GitHub security-advisory URL (the repo's
   real channel), `Policy:` the README anchor, `Expires:` a dated future value
   (the field is designed to be renewed). The proxy matcher still covers the
   path (CSP minting on a static text file is harmless).

INFO-level: the og:image content URL carries Next's hash query
(`?opengraph-image.<hash>.png`) — convention output, resolves fine, left as
served. The 404 route already ships `<meta name="robots" content="noindex">`
(wire-verified — Next default, pinned by the failure-surfaces round). Home
gzip + `Vary: Accept-Encoding` confirmed on (Next default). robots.txt /
sitemap.xml content-types hold (the session-22 gates).

### Honest-gate decisions (run before planning)

- **Reference-faithful shapes, clone-owned assets.** The two JSON-LD blocks
  mirror the reference's measured field sets exactly (WebSite: name/url;
  Organization: name/logo/url) — but the logo URL is the clone's OWN
  self-hosted mark, not the reference's CDN (no third-party runtime
  dependency; `img-src 'self'` + unsplash stays).
- **No gate is weakened for F-N.** The nonce rides the data block; the
  security-csp spec is untouched.
- **Preload set is measured, not maximal.** Three files, the first-paint
  weights only — preloading all twelve would trade one FOUT for twelve
  wasted fetches.
- **security.txt carries no invented identities** — the contact is the
  repository's real advisory channel.
- **Doctrine constraints:** parity law (all four fixes are head/asset-layer —
  no page-body byte changes; the census MUST stay byte-equal); no mutation-seam
  or client-state changes; no new npm dependencies; vitest/playwright configs
  untouched (new cases land in the existing include/testDir contracts);
  `.env.example` unchanged (no new env vars).

## 5. Remediation design (TDD)

### ToDo

| # | Task | Layer | Gate |
|---|---|---|---|
| 1 | `src/lib/structured-data.test.ts` FIRST — `storeRootJsonLd(origin)` contract: exactly two graphs in order [WebSite, Organization]; WebSite = {@context, @type, name "AURELIA", url}; Organization adds logo (absolutized `/icons/icon-512.png`); trailing-slash origin normalized; exact key sets (no extras). `src/lib/csp.test.ts` FIRST — `extractNonce` contract: extracts the base64 nonce from a production CSP header; null on the dev CSP (no nonce directive); null on nonceless `script-src 'self'`; null on empty/garbage | unit (RED) | vitest |
| 2 | GREEN — `storeRootJsonLd` in `src/lib/structured-data.ts` + `extractNonce` in `src/lib/csp.ts` | production seam | vitest GREEN |
| 3 | F-N wiring: home page renders TWO `<script type="application/ld+json">` data blocks via `serializeJsonLd`, nonce from `headers()` + `extractNonce` (attribute omitted when null) | production surface | typecheck + lint |
| 4 | F-O: root layout renders the three font preloads (`as="font" type="font/woff2" crossorigin`), hrefs `/fonts/{cormorant-garamond-300,montserrat-300,montserrat-400}.woff2` | production surface | wire check |
| 5 | F-P: `viewport.themeColor = "#F8F7F6"` in `src/app/layout.tsx` | production surface | wire check |
| 6 | F-Q: `public/.well-known/security.txt` (Contact/Policy/Expires, concrete values) | asset | wire check |
| 7 | `tests/e2e/brand-metadata.spec.ts` extension — four cases: (1) home serves the two JSON-LD blocks with the exact measured contract AND both tags carry the request nonce in the served bytes; (2) the three font preloads ship with crossorigin; (3) theme-color = #F8F7F6; (4) security.txt serves 200 text/plain with the Contact/Expires contract | E2E | playwright |
| 8 | Mutation demos (surgical): (a) `storeRootJsonLd` drops the Organization block → exactly the home-JSON-LD cases fail; (b) a preload loses `crossorigin` → exactly the preload case fails; (c) `themeColor` removed → exactly the theme-color case fails. All restored (inverse edits — never `git checkout` on session-touched files, trap #37/#39) | process | vitest + playwright |
| 9 | Round-20b census — MUST be byte-equal to 20a (rest-invariance by measurement) | parity | sweep tool |
| 10 | Screenshots refresh (`--shots`), mobile drawer visual verify | evidence | files |
| 11 | Docs alignment: SKILL v1.18.0 (project_state counts, §2 rows, §5 rows, §10 symptom rows if a trap emerges, §11 counts, Appendix B rows), README (badge/counts + the structured-data/transport feature rows), CLAUDE.md (gate line + unit-list rows + gate description), PAD (test table, §7.1 coverage-map paragraph, §7.3), this file's execution record, worklog | docs | stale-count sweep |

### Count ledger (expected post-remediation)

| Metric | Before | After |
|---|---|---|
| unit files | 19 | 19 (both test files exist) |
| unit tests | 160 | 169 (+4 extractNonce, +5 storeRootJsonLd) |
| E2E spec files | 16 | 16 (brand-metadata.spec.ts extended) |
| unique E2E cases | 99 | 103 (+4 brand-metadata cases × both projects) |
| E2E result | 198 passed + 2 skipped | 206 passed + 2 skipped |

## 6. Validation of this plan against the codebase (pre-execution)

- `headers()` from `next/headers` is callable in the force-dynamic home page
  (no caching change — the page is already per-request RSC) and the proxy sets
  the CSP on the REQUEST headers (`src/proxy.ts` read: `requestHeaders.set`).
- The security-csp gate's per-tag nonce assertion runs on `/` ONLY
  (`security-csp.spec.ts` read: the loop test navigates `/`; the
  every-document-route case asserts the header, not per-tag attrs) — a
  nonceless PDP block passes today and stays untouched; a nonce-carrying home
  block keeps `/` literally true.
- The three preload hrefs match `globals.css` `@font-face` src URLs exactly
  (`/fonts/cormorant-garamond-300.woff2`, `/fonts/montserrat-300.woff2`,
  `/fonts/montserrat-400.woff2`) and the F-M cache header covers `/fonts/:file*`
  — preloads inherit the immutable caching.
- `viewport` export exists in `src/app/layout.tsx` (line 21) — `themeColor`
  is a documented `Viewport` field in Next 16.4.
- `public/icons/icon-512.png` exists (F-K asset) and `public/` is copied
  wholesale by `scripts/assemble-standalone.mjs` — the new
  `public/.well-known/` rides the same copy; Next's static handler serves
  `.well-known` (wire-verified at execution).
- The brand-metadata spec's existing cases pin COUNTS of icon/og/manifest
  links — the JSON-LD/preload/theme-color additions change none of those
  counts; the axe gate is DOM-bound (data blocks and meta tags are inert to
  axe); the seo gate pins sitemap/robots bodies (untouched).
- Organization logo uses the EXISTING `absolutize` contract (same-origin
  root-relative in, absolute out) — no new URL logic.
- No schema/env/seed changes; money untouched; no revalidatePath surface;
  `.env.example` unchanged.

## 7. Execution record

| # | Task | Result |
|---|---|---|
| 1 | unit RED (storeRootJsonLd + extractNonce) | ✅ 4 extractNonce cases fail on the missing export; structured-data.test.ts fails collection on the missing `storeRootJsonLd` import |
| 2 | seams GREEN | ✅ 29/29 in the two files (en-route: the first GREEN run exposed `absolutize("/")` keeping the trailing slash — the measured reference url carries none; the seam now normalizes the origin itself). Full suite **169/169 (19 files)** — count ledger exact |
| 3 | JSON-LD wiring (nonce-carrying data blocks) | ✅ shipped by the home page first, then MOVED to the storefront layout after the round-20b census caught mainKids 10→12 (two h-0 `<main>` children — see #9). Wire-verified: both blocks serve with the exact request nonce; the PDP's Product block stays nonceless-and-untouched |
| 4 | font preloads | ✅ three first-paint weights with crossorigin, rendered by the root layout `<head>`; wire-verified (exact hrefs, `as="font" type="font/woff2" crossorigin="anonymous"`) |
| 5 | theme-color | ✅ `viewport.themeColor = "#F8F7F6"`; wire-verified `<meta name="theme-color" content="#F8F7F6">` |
| 6 | security.txt | ✅ `public/.well-known/security.txt` serves 200 `text/plain` from the standalone (the wholesale public/ copy covers the dot-directory) |
| 7 | brand-metadata E2E extension | ✅ 22/22 (2 setups + 10 cases × 2). En-route test-side lesson: extracting the nonce from the RAW header splits on the next directive's trailing `;` — the scriptSrcOf directive-isolation discipline applies (the spec now mirrors security-csp's extraction) |
| 8 | Mutation demos | ✅ surgical: (a) Organization block dropped → exactly the 4 shape cases fail (unit) + exactly the JSON-LD case fails (2 projects) → restored by inverse edit (en-route: strict TS rejected the half-done tuple — completed with an honest cast to make the mutant compile, the session-24 demo-c discipline); (b) one preload's crossorigin dropped → exactly the preload case fails (2 projects) → restored; (c) themeColor removed → exactly the theme-color case fails (2 projects) → restored |
| 9 | round-20b census | ✅ **BYTE-EQUAL to 20a on 160/160 leaf fields — zero drift, 17th consecutive — AFTER a caught-and-fixed real drift**: the first 20b run (data blocks inside `<main>` on the home page) measured mainKids 10→12 on BOTH viewports (two h-0 script children — the census excludes head, not body-embedded non-visuals). The blocks moved to the (storefront) layout (site-level entities outside `<main>` — schema.org-correct placement), re-measured byte-equal. NEW TRAP #40 recorded (SKILL v1.18.0) |
| 10 | Screenshots + drawer verify | ✅ 9 re-captures refreshed via sweep --shots (clone home desktop/mobile, deals, menu-open, PDP, shop, size-chips + the two ref captures); the mobile drawer capture visually verified pixel-identical (VELOUR logotype, five flush-left items, w-80 panel, dimmed backdrop) |
| 11 | Docs alignment + stale-count sweep | ✅ SKILL v1.18.0 (project_state 169 + 206+2, §2/§5 rows, trap #40 + §10 row, §11 counts, Appendix B rows); README (badge, features/testing rows); CLAUDE.md (gate line 169/103 + gates description, unit-list rows); PAD (test table 19\|169 + 16\|103\|206, §7.1 coverage paragraph, §7.3); this file's record; worklog. Stale-count sweep: see the worklog entry |
| — | Final gates on the final tree | typecheck ✓ lint ✓ 169/169 unit (19 files) ✓ build ✓ E2E **206 passed + 2 skipped** (103 unique × 2 − 2 desktop-only skips + 2 setup; 4.6m) ✓ — the SEVENTEENTH consecutive fully-green session. The security-csp gate's PDP case was hardened en route (Product graph selected by `@type`, never document position — the layout's identity blocks precede it on every storefront page) |

## 8. Residual risks / next steps (post-F-N/F-O/F-P/F-Q)

1. `error.tsx`'s SSR document-path render remains **Reasoned** (carried,
   session-23 §4 rationale).
2. `style-src 'unsafe-inline'` remains the documented CSP exception (carried).
3. Real PSP behind the checkout seam (carried).
4. Dev-toolchain npm-audit findings (11, all dev-only) — carried.
5. G-3 POSIX-only sweep paths (carried).
6. The action-seam gate couples to the standalone manifest shape — fails loud
   at the canary by design (carried).
7. The zero-drift streak is a streak, not a guarantee — the two-census ritual
   stays mandatory before every commit.
8. PDP og:type stays `website` (not `product` + product:price:amount) — a
   richer e-commerce OG surface is a future superset item (carried).
9. security.txt's `Expires` is a dated value by RFC design — renewal is a
   documented maintenance cadence (a future round may pin it in the sweeper).
