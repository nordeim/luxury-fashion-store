# Remediation Plan — Session 24 (AURELIA / VELOUR clone)

> **Status:** EXECUTED. **Mode:** Verify-first (Mode C) → reconciliation of the
> pulled remote (`7e03fc1` the session-23 failure-surfaces round + `9200479` its
> user-added transcript) → first-hand audit → live-reference parity sweep
> round 19 → fresh audit pass → TDD remediation. **Scope:** the session-23
> commit audited 4/4 claims TRUE; the fresh pass opened seams every prior round
> left untouched — the icon/favicon surface, the og/twitter share surface, the
> PWA manifest surface, and static-asset caching — yielding **F-K / F-K2 / F-L /
> F-M, the brand-metadata + cache-hardening catch-up**: the browser-tab mark the
> app never shipped, the share image the reference ships and the clone never
> did, the manifest the Vite→Next transform silently dropped, and immutable
> font binaries served with `max-age=0`. All four are head/wire-layer,
> rest-invisible by measurement (round-19a = 19b byte-equal).

---

## 1. Starting state

WARM workspace at `9200479` (`main`, remote-verified). Environment restored per
the worklog's incident playbook:

| Step | Result |
|---|---|
| `git pull` | ✓ fast-forward `9200479` = the user-added `docs/session_23.md` transcript (docs only, no code) |
| `.env` re-pinned — the sandbox had rewritten it to an ABSOLUTE `DATABASE_URL` (the recurring reset) | ✓ contract restored |
| `skills/` pruned by the sandbox → `git restore -- skills/`; untracked `bun.lock` deleted | ✓ |
| `npx playwright install chromium` — the sandbox cache held the WRONG build (v1200 vs the pinned 1.64.0's v1248; first time this variant) | ✓ v1248 reinstalled |
| `bin/ssh` paramiko shim rebuilt (Appendix A recipe) + `paramiko` 5.0.0 into the venv (`pip` binary absent — `python3 -m pip`) | ✓ |
| `git config core.fileMode false` | ✓ |
| `db/custom.db` EMPTY (zero rows — the session-22 incident class again) → `npm run db:setup` | ✓ canonical 4/12/2/4 |

**Baseline gates on the committed tree (FOURTEENTH consecutive session fully
green):** typecheck ✓ · lint ✓ · **154/154 unit (18 files)** ✓ · build +
assemble ✓ (E2E run at the final gate).

`npm audit`: 11 findings (1 moderate, 8 high, 2 critical) — unchanged; all
dev-toolchain; carried.

**En-route process incident (trap #36 family, again):** the first manual
standalone probe booted WITHOUT `AUTH_SECRET` (the instrumentation gate failed
loudly — the documented recipe requires it), and the SECOND probe's `pkill`
pattern missed the first server's child: `next-server` held :3100 and a later
probe 500'd against the broken parent. Killed by LISTENING pid; the sweep's
port-probe (M1) also refused to run against an occupied port by design.

## 2. Audit of `7e03fc1` (first-hand full-source verification)

Composition: 3 new src files (`error.tsx` / `global-error.tsx` /
`error-surfaces.spec.ts`) + `sweeper.ts`/`sweeper.test.ts`/`instrumentation.ts`
edits + docs/screenshots — `9200479` verified docs-only. Claims verified
against the final tree:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | F-I: segment + ROOT error boundaries in the measured slate language | Both files read in full: kicker + Cormorant h1 + copy + Try-again (`reset()`) + Go-Home (`Link`); `global-error.tsx` renders its own `<html>/<body>` and imports `globals.css`; `useEffect` `console.error` for observability; `digest` NOT displayed | TRUE |
| 2 | F-I2: the 404 card pinned over the wire | `error-surfaces.spec.ts` case 1: status 404 + "404"/"Page Not Found" copy + a WORKING Go-Home escape | TRUE |
| 3 | RSC-fallback hard-navigation contract pinned (the spike made permanent) | Case 2: `page.route` sinks `rsc:1` payloads (500) for the canonical PDP, `route.fallback()` passes documents through; asserts URL + heading + zero "boom" + the size panel; case-insensitive `^size$` pin (trap #38 honored) | TRUE |
| 4 | F-J: `isSchemaNotReady` classifier + boot-catch downgrade | `sweeper.ts` exports the pure classifier (`code === "P2021"` only); `instrumentation.ts` downgrades the BOOT catch to one soft line, hourly catch stays loud; `sweeper.test.ts` 8 cases (3 new: recognize ×2 + reject ×6 shapes) | TRUE |

**Verdict: 4/4 claims TRUE, zero production regressions.** The round-18 census
values hold at the round-19a re-measure below (rest-invariance proven twice).

## 3. Live reference sweep — round 19a (measured 2026-10-17): ZERO drift

Full two-census ritual (both viewports, both sides). **Every ledger field
byte-matches the recorded round-17/18 values** — SIXTEEN consecutive sweeps:

- desktop: ref 11079 / clone 11085 (clone deals residue 3551 pinned); footers 444/444
- mobile: ref 11257 / clone 11264 (clone deals residue 3174 pinned); footers 1189/1189
- drawer: `panelCls` / `navCls` CHAR-IDENTICAL both sides; 5 items x=32 / w=256 /
  h=20 at y=104/144/184/224/264; gaps [20,20,20,20] — **the Tailwind v4
  mobile-drawer pin intact** (the task's standing mobile-nav re-check)
- fonts/chips/marquee hold (clone superset h2×13 / h3×42 documented); clone
  console clean (the two `ref:` 401s are the reference's own auth pings)

## 4. Fresh audit pass — findings (the round's targets)

Seams opened this session that no prior round audited: the icon/favicon
surface, the og/twitter share surface, the PWA manifest surface, static-asset
cache headers. All findings wire-verified against the BUILT standalone.

1. **F-K — no favicon or icon asset exists anywhere.** `public/` holds only
   `fonts/`; `src/app/` holds no `favicon.ico` / `icon.*` / `apple-icon.*`.
   Wire evidence: `/favicon.ico` → **404** on the built standalone, and the
   served `<head>` contains ZERO `<link rel="icon">` tags. Every browser tab
   shows the default globe and every page view logs a 404. The reference
   serves `/favicon.ico` → **302** to its swan logo PNG (measured: charcoal
   circle `rgb(64,64,64)` + cream swan `rgb(244,236,214)`). The repo's own
   proxy matcher even EXCLUDES `favicon.ico` from CSP minting — anticipating a
   file that never shipped. Same class as F-B/F-H/F-I: **the production-ready
   superset claim catches up to the browser-chrome surface, zero visual change
   to the page itself.**
2. **F-K2 — no `og:image` / `twitter:image` anywhere.** The reference home
   ships `og:image` (its logo rendered at 1200×630); the clone's home AND PDP
   heads carry og:title/og:description/twitter:card but NO image (wire-
   verified). Product URLs shared on social render text-only. PDP remediation
   is FREE: `generateMetadata` can point `openGraph.images` at the product's
   first seeded image — per-product share cards with zero new assets. The
   root/home gets a static 1200×630 brand card (`opengraph-image.png` — the
   Next metadata file convention auto-injects og:image + twitter:image).
3. **F-L — the Vite lineage's PWA manifest was silently dropped in the
   transform.** `168d2ec` (legacy) shipped `public/manifest.webmanifest` +
   `tests/e2e/pwa-manifest.spec.ts` (the R18-01 remediation); `8c675a7` (the
   Next.js transform) carried neither. The reference's `/manifest.webmanifest`
   is its SPA catch-all (content-type `text/html` — not a real manifest), so
   the manifest is PURE superset (installability), but the transform losing a
   documented remediation silently is exactly the F-H class of drift.
   Remediation mirrors F-H: a pure seam (`buildManifest`), a static
   `src/app/manifest.ts` route (no DB — the build stays DB-free; NOT
   force-dynamic), self-hosted icons, and a served-BODY E2E gate.
4. **F-M — self-hosted fonts ship `Cache-Control: public, max-age=0`.** The 12
   immutable woff2 binaries in `public/fonts/` are re-downloaded on EVERY
   visit (wire-verified). Remediation: a `next.config.ts` `headers()` entry
   pinning `public, max-age=31536000, immutable` for `/fonts/:path*`. Zero
   visual change; pure transport-layer hardening.

INFO-level: the session-23 plan's §2 claim "public/ holds only fonts + images +
favicon now" was aspirational (public/ holds ONLY fonts — no favicon, no
images; F-K makes the favicon half true). Historical ledgers stay untouched;
this note is the correction of record.

### Honest-gate decisions (run before planning)

- **No external brand assets.** The swan mark is re-authored as a hand-written
  SVG in the MEASURED reference colors (`#404040` circle / `#F4ECD6` swan) —
  not hotlinked (no third-party runtime dependency; `img-src 'self' data:`
  stays).
- **ICO authoring, not placeholder.** `favicon.ico` is a real multi-size ICO
  (16/32/48) rendered from the SVG via the installed Playwright chromium +
  Pillow (available, 11.3.0) — one-time authoring scripts persisted under
  `scripts/`, the binaries committed. Regeneration is reproducible.
- **og:image for PDPs comes from data, not new binaries** — the first seeded
  unsplash image per product (already allowed by `images.remotePatterns`).
- **The manifest route is STATIC** (no `force-dynamic`) — it reads no DB and
  must not open a boot-time DB dependency; mirrors `sitemap.ts`'s structure
  without its query.

## 5. Remediation design (TDD)

**Doctrine constraints:** parity law (all four fixes are head/wire-layer and
rest-invisible — no page-body byte changes; the census MUST stay byte-equal);
no mutation-seam or client-state changes; no new npm dependencies (Pillow is
authoring-time only, outside the lockfile); vitest/playwright configs
untouched (the new test files land in the existing include/testDir contracts).

### ToDo

| # | Task | Layer | Gate |
|---|---|---|---|
| 1 | `src/lib/manifest.test.ts` FIRST — the `buildManifest` contract: name/short_name "AURELIA", id/scope/start_url `/`, display standalone, measured colors `#F8F7F6`, two self-hosted icons (192 + 512, type image/png, purpose any), description present. RED by absence (collection fails on the missing module) | unit (RED) | vitest |
| 2 | GREEN — `src/lib/manifest.ts` (pure seam) + `src/app/manifest.ts` (static metadata route; `MetadataRoute.Manifest` return type) | production seam | vitest GREEN |
| 3 | Brand assets: `src/app/icon.svg` (hand-authored swan mark in the measured colors) → `scripts/brand-assets.cjs` renders favicon-16/32/48 PNGs + `apple-icon.png` (180) + `icon-192.png`/`icon-512.png` (public/icons/) via chromium screenshots → `scripts/png-to-ico.py` (Pillow) wraps `src/app/favicon.ico` | assets | files parse (PIL verify) |
| 4 | `src/app/opengraph-image.png` — 1200×630 brand card rendered from an authoring HTML in the measured language (warm-paper bg, swan mark, AURELIA wordmark, Cormorant/Montserrat self-hosted via file://); Next's convention auto-injects og:image + twitter:image on every route | assets | wire check |
| 5 | F-K2: PDP `generateMetadata` adds `openGraph.images` (the product's first image) — og:type stays website, alternates untouched | production surface | typecheck + lint + wire check |
| 6 | F-M: `next.config.ts` `headers()` adds `Cache-Control: public, max-age=31536000, immutable` for `/fonts/:path*` | transport | wire check |
| 7 | `tests/e2e/brand-metadata.spec.ts` — the served-artifact gate: `/favicon.ico` 200 + image/x-icon magic; `/icon.svg` 200 + svg; home `<head>` carries icon links + og:image + twitter:image; `/manifest.webmanifest` 200 + `application/manifest+json` + the EXACT served-body contract (name/display/colors/icons); PDP og:image = the product's first image; `/fonts/…` Cache-Control immutable | E2E | playwright |
| 8 | Mutation demos (surgical): (a) the seam's display flips to `browser` → exactly the manifest unit cases fail; (b) the fonts header dropped → exactly the cache case fails; (c) the PDP og:image line removed → exactly that case fails. All restored → GREEN | process | vitest + playwright |
| 9 | Round-19b census — MUST be byte-equal to 19a (rest-invariance by measurement) | parity | sweep tool |
| 10 | Screenshots refresh (`--shots`), mobile drawer visual verify | evidence | files |
| 11 | Docs alignment: SKILL v1.17.0 (project_state counts, §2 rows, §5 tree/asset rows, §10 symptom rows if a trap emerges, §11 counts, Appendix B rows), README (badge/counts + the metadata-assets feature row + testing rows), CLAUDE.md (gate line + unit-list manifest row + the brand-metadata gate), PAD (tree rows, test table, §7.1 coverage-map paragraph, §7.3), this file's execution record, worklog | docs | stale-count sweep |

### Count ledger (expected post-remediation)

| Metric | Before | After |
|---|---|---|
| unit files | 18 | 19 (`manifest.test.ts` new) |
| unit tests | 154 | 160 (6 new manifest cases) |
| E2E spec files | 15 | 16 (`brand-metadata.spec.ts` new) |
| unique E2E cases | 93 | 99 (6 new brand-metadata cases × both projects) |
| E2E result | 186 passed + 2 skipped | 198 passed + 2 skipped |

## 6. Validation of this plan against the codebase (pre-execution)

- `MetadataRoute.Manifest` exists in the installed Next 16.4.0
  (`metadata-interface.d.ts` namespace export; `manifest-types.d.ts` shape
  read first-hand — icons `{src,type?,sizes?,purpose?}`).
- The proxy matcher EXCLUDES `favicon.ico` from CSP minting already
  (`src/proxy.ts:38`) — the new static icon files need no proxy change;
  `icon.svg` / `apple-icon.png` / `opengraph-image.png` receive the nonce CSP
  harmlessly (no scripts).
- `metadataBase` is set in the root layout (`NEXT_PUBLIC_SITE_URL` fallback
  `http://localhost:3000`) — the opengraph-image convention resolves absolute
  og:image URLs against it; the E2E webServer's unset env pins the DOCUMENTED
  default origin (the seo gate's existing discipline).
- Pillow 11.3.0 available in the venv; chromium v1248 reinstalled — the
  authoring pipeline runs today.
- `public/icons/` is a NEW directory — `public/` is copied wholesale into the
  standalone by `scripts/assemble-standalone.mjs` (verified: it rsyncs the
  whole folder), so the 192/512 PNGs ship in the bundle with zero script
  change.
- PDP `generateMetadata` returns early (`Product Not Found`) for unknown slugs
  — the og:image addition sits ONLY on the product-found path.
- The axe gate (14 surfaces) and every other E2E case are DOM-bound — head-tag
  additions cannot touch them; the census is head-excluded by construction
  (the sweep measures body geometry/fonts only).
- No schema/env/seed changes; money untouched; no revalidatePath surface;
  `.env.example` unchanged (F-K/F-K2/F-L/F-M add no env vars).

## 7. Execution record

Filled in as the work proceeds (see the worklog entry for the final ledger).

| # | Task | Result |
|---|---|---|
| 1 | manifest unit contract | ✅ RED by absence — 6 new cases fail on the missing module |
| 2 | `buildManifest` seam + `manifest.ts` route | ✅ GREEN 6/6; 160/160 unit (19 files); the route is STATIC (`○ /manifest.webmanifest` in the build output — the build stays DB-free) |
| 3 | Brand assets | ✅ icon.svg authored (measured `#404040`/`#F4ECD6` swan; one head/neck refinement pass); favicon.ico (16/32/48, explicit ICO container via `scripts/png-to-ico.py` — Pillow's ICO save resamples from one base, the exact renders ship verbatim) + apple-icon.png + icon-192/512.png rendered via `scripts/brand-assets.cjs` and PIL-verified |
| 4 | opengraph-image.png (1200×630) | ✅ rendered in the measured language (warm paper, swan mark, Cormorant AURELIA, Montserrat kicker/tagline from public/fonts) |
| 5 | PDP og:image | ✅ shipped (`parseProductImages` seam in `src/lib/products.ts` — malformed JSON degrades to the root card, never throws) |
| 6 | fonts Cache-Control | ✅ shipped (`next.config.ts` `/fonts/:file*` → immutable) |
| 7 | brand-metadata E2E gate | ✅ 14/14 (2 setups + 6 cases × 2 projects); the wire verification caught the real head shape en route (favicon.ico link emits `sizes="48x48"`, icon.svg `sizes="any"` — the spec pins href, not exact attrs) |
| 8 | Mutation demos | ✅ surgical: (a) seam display → `browser` → exactly the display case fails (1/6) → restored; (c) PDP og:image stripped → exactly the PDP case fails (2 projects) → restored; (b) fonts cache dropped → exactly the cache case fails (2 projects) → restored. EN-ROUTE INCIDENT (new trap #39): demo (a)'s restore used `git checkout src/lib/manifest.ts` — a NO-OP on an untracked file (the mutation stayed in the tree while appearing restored); caught by reading the file, fixed by inverse edit. Demo (c) also caught the strict-TS gate failing the half-done mutation (unused import) and a stale :3100 server being adopted by `reuseExistingServer` (trap #36 recurrence) — both killed/fixed before the valid demo ran |
| 9 | Round-19b census | ✅ byte-equal to 19a on EVERY field (77/77 compared programmatically) — the brand-metadata additions are rest-INVISIBLE; ZERO drift, 16th consecutive |
| 10 | Screenshots + drawer verify | ✅ 9 re-captures refreshed via sweep --shots; the mobile drawer capture visually verified pixel-identical (VELOUR logotype, five flush-left items, w-80 panel, dimmed backdrop) |
| 11 | Docs alignment + stale-count sweep | ✅ SKILL v1.17.0 (project_state 160 + 198+2, §2 rows, §5 tree/asset rows, trap #39 + §10 row, §11 counts, Appendix B brand-metadata + manifest rows); README (badge 160+198, features/testing rows, architecture table); CLAUDE.md (gate line 160/99 + the brand-metadata gate, unit-list manifest row); PAD (tree rows, test table 19\|160 + 16\|99\|198, §7.1 coverage-map paragraph, §7.3); this file's record; worklog. Stale-count sweep over the six docs: only this plan's own historical baseline rows — zero real drift |
| — | Final gates on the final tree | typecheck ✓ lint ✓ 160/160 unit (19 files) ✓ build ✓ E2E 198 passed + 2 skipped ✓ — the FIFTEENTH consecutive fully-green session |

## 8. Residual risks / next steps (post-F-K/F-K2/F-L/F-M)

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
   richer e-commerce OG surface is a future superset item if social commerce
   ever needs it.
