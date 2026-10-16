# Remediation Plan — Session 22 (AURELIA / VELOUR clone)

> **Status:** EXECUTED. **Mode:** Verify-first (Mode C) → warm-workspace
> re-validation → audit → sweep → TDD remediation. **Scope:** (1) reconciliation
> of the pulled remote `71d0f32` (the user-added `docs/session_21.md` transcript
> on top of the round-16 commit `ac304d9`; docs only, no code); (2) an audit of
> the never-audited round-16 commit `ac304d9` (skills: `code-review-checklist`,
> `security-and-hardening`, `tdd`, per `skills/skills-catalog.md`) — test+docs
> only, all claims verified first-hand; (3) a **live reference parity sweep
> round 17** (desktop 1440×900 + mobile 390×844, FULL two-census ritual) —
> **ZERO drift, the FOURTEENTH consecutive**; (4) a fresh audit pass
> (sweeper wiring, next.config headers, sitemap/robots, npm audit) yielding
> **F-H — the sitemap/robots docs-code drift** (same class as F-B: the docs
> advertise a contract the code never built) — TDD-remediated: a pure SEO seam
> (`buildSitemapEntries` + `buildRobots`), the `/sitemap.xml` + `/robots.txt`
> metadata routes, and a new E2E gate, with the build kept DB-free.

---

## 1. Starting state

The workspace was WARM at `ac304d9` with a clean tree; `git pull`
fast-forwarded to `71d0f32` (the user-added `docs/session_21.md` transcript —
docs only, no code). Environment warmth check — **two NEW sandbox-incident
classes observed and repaired** (the previous session's worklog predicted the
browser-cache/shim/`.env` trio; this reset also hit the database):

| Incident | Symptom | Repair |
|---|---|---|
| `db/custom.db` EMPTIED (schema intact, 0 rows — a 4th incident class) | seed check returned all-zero counts | `npm run db:setup` (idempotent seed re-verified 4/12/2/4, zero transient) |
| `.env` reduced to ONE line (`DATABASE_URL` only — the dev `AUTH_SECRET` / `NEXT_PUBLIC_SITE_URL` lines lost — a 5th incident class) | the parity-sweep tool's boot failed: the production `AUTH_SECRET` guard fires in `instrumentation.ts` | full canonical `.env` restored (contract URL + generated dev `AUTH_SECRET` + `NEXT_PUBLIC_SITE_URL`) |

`bin/ssh`, chromium v1248, `.git/info/exclude` (`bin/`, `.deploy/`), and
`core.fileMode false` all SURVIVED this reset (first time). `.env.example`
verified tracked with the canonical contract. The sandbox `DATABASE_URL` leak
persists — all DB/build commands run `env -u DATABASE_URL` (§9 #12).

**Baseline gates on the committed tree (ELEVENTH consecutive session fully
green):**

| Gate | Result |
|---|---|
| typecheck | ✓ |
| lint | ✓ |
| unit | ✓ 142/142 (17 files) |
| build + assemble | ✓ (proxy visible in the build summary) |
| E2E | ✓ 178 passed + 2 skipped (89 unique × 2 − 2 viewport skips + 2 setup) |

`npm audit`: 11 findings (1 moderate, 8 high, 2 critical) — re-verified
unchanged; all dev-toolchain; accepted with rationale — carried.

## 2. Audit of `ac304d9` (first-hand full-diff verification)

The round-16 commit is **test + docs only** (`git show --name-only`: no `src/`
paths; `a54d0b0` verified docs-only). Claims verified against the diff and the
final tree:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | New E2E gate `action-seam-security.spec.ts` closes H-59 over the wire | 261 lines read in full: manifest canary (exactly 4 ids, hex-shaped), the P1/P2/P3 WRITE-FREE probe ladder (P1 classify 2 line-actions + 2 product-actions; P2 splits the Zod-gate candidate from the product-lookup candidate; P3 the real `(productId, "XXL", 1)` payload → `"Invalid bag request."`, no Set-Cookie), the DB-layer write-freedom pin (`cartItem.count == 0`) | TRUE |
| 2 | IDOR census: a foreign guest bag survives unauthenticated cart-line probes | SQL fixture (`Cart` userId NULL + one `CartItem` on a SECOND seed product, random token-derived ids), adjust-shaped AND remove-shaped probes on every line-action assert `"ok":false` + no Set-Cookie, the fixture line's quantity pinned UNTOUCHED, `finally` cleanup | TRUE |
| 3 | Fail-closed census across the route's action surface | every candidate × both write-free payloads → 200 + `"ok":false` + no Set-Cookie, never a 5xx | TRUE |
| 4 | Trap #34 discipline (`spawnSync`, no shell) | `sqlRun` and `dbRead` both use `spawnSync` with args arrays; `$disconnect` survives (the trap's exact failure shape) | TRUE |
| 5 | storageState never rides the probes | fresh cookie-less `request.newContext()` per call, disposed in `finally`; Set-Cookie via `headersArray()` (headers() collapses repeats) | TRUE |
| 6 | The seed IS the contract (L-2) | `SEED_SLUG = "silk-draped-evening-gown"` pinned; product lookup gated on `isActive: true` | TRUE |
| 7 | Docs aligned (SKILL v1.14.0, README/CLAUDE/PAD counts, worklog) | verified in the prior thread's stale-count sweep (ZERO hits) and re-verified this session | TRUE |
| 8 | `.env.example` tracked with the canonical contract | `git ls-files` + content read | TRUE |
| 9 | 89 cases × 2 arithmetic | baseline E2E re-run: 178 passed + 2 skipped | TRUE |

**Verdict: 9/9 claims TRUE, zero production regressions** (no production code
changed). Findings: none new in the test seam itself.

## 3. Live reference sweep — round 17a (measured 2026-10-16): ZERO drift

The full two-census ritual (boot → census → drawer → pinned surfaces → fonts,
both viewports, both sides). **Every ledger field byte-matches the recorded
round-16 values** — the reference has held still across FOURTEEN same-day
sweeps:

- desktop: ref 11079 / clone 11085 (clone deals residue 3551 pinned); footers 444/444
- mobile: ref 11257 / clone 11264 (clone deals residue 3174 pinned); footers 1189/1189
- drawer: `panelCls` and `navCls` CHAR-IDENTICAL both sides (`…w-80 bg-background z-50 p-8 flex flex-col gap-6` / `flex flex-col gap-5 mt-4`); 5 items x=32/w=256/h=20 at y=104/144/184/224/264; gaps [20,20,20,20] — **the Tailwind v4 pin intact**
- fonts: ref h1×1/h2×11/h3×36/h4 Montserrat×3 — clone superset h1×1/h2×13/h3×42/h4×3 (the documented superset deltas)
- chips identical (fs 10px, px 10px/10px, py 4px, radius 0, transparent bg, border rgb(229,224,220)); nameH3 desktop 72px / mobile 48px Cormorant; marquee present on all four censuses
- clone console clean (the two `ref:`-prefixed 401s are the reference site's own auth pings)

## 4. Fresh audit pass — findings

Seams re-checked this session that the round-16 audit did not open:

1. **K-1 sweeper wiring — verified genuinely closed** (was on the residual
   list): `src/lib/sweeper.ts` `runSweep` is wired into
   `src/instrumentation.ts` — one pass at boot + hourly `setInterval` with
   `.unref()`; deletes idempotent; multi-instance duplication harmless. The
   "scheduled cleanup" residual item is CLOSED, not carried.
2. **next.config.ts headers — already complete**: Referrer-Policy, XCTO, HSTS,
   X-Frame-Options DENY, Permissions-Policy (camera/microphone/geolocation/
   interest-cohort), COOP. The CSP is deliberately NOT static (N-1). No gap.
3. **npm audit** — composition unchanged (11, all dev-toolchain). Carried.
4. **F-H (the round's target) — the sitemap/robots docs-code drift**: FOUR
   documents advertise the contract (README:90, CLAUDE.md:77, PAD:453,
   SKILL.md:123 all describe `NEXT_PUBLIC_SITE_URL` as the "sitemap origin")
   and the F-G note (session-20) references sitemap/robots — but
   `src/app/sitemap.ts` and `src/app/robots.ts` DO NOT EXIST (verified: `rg`
   finds zero sitemap/robots sources under `src/`; `src/app/` holds only
   (auth), (storefront), api, globals.css, layout.tsx, not-found.tsx). The
   contract is HALF-BUILT: `layout.tsx` sets `metadataBase` from the env var
   and the PDP JSON-LD consumes it. **Live measurement then upgraded the
   finding (F-H2): the paths were NOT 404s — the scaffold's stale foreign
   statics (`public/robots.txt` + `public/sitemap.xml`, git-tracked since the
   original commit, an ecommerce-store lineage artifact advertising a Vite
   `:4173` origin, an `/order-success` route this app does not have, and a
   disallow list missing `/api` + `/wishlist`) ANSWERED IN THEIR PLACE — Next
   serves `public/` files before metadata routes, so the wire metadata has
   been WRONG since session 1.** Remediation: delete the foreign statics
   (F-H2), build the routes + the pure seam (F-H), and pin the served
   artifact with a new E2E gate. Same remediation class as F-B: **code
   catches up to the documented contract, zero visual change.**

## 5. F-H remediation design (TDD)

**Doctrine constraints:** parity law (the new routes are head/navigational —
invisible at rest, the census MUST stay byte-equal); the build must stay
DB-free (metadata routes run `force-dynamic` so nothing queries the DB at
build time — same posture as the storefront's force-dynamic pages); money and
seed untouched; the L-2 seed-as-contract discipline (the E2E pins the seed's
own slugs and the documented default origin).

### ToDo

| # | Task | Layer | Gate |
|---|---|---|---|
| 1 | `src/lib/sitemap.test.ts` — the pure-seam contract FIRST: base-URL normalization (trailing slash stripped), default-origin fallback, active-only filtering, static-first ordering, lastModified passthrough, robots disallow list exactness, robots default origin | unit (RED by absence) | vitest |
| 2 | `src/lib/sitemap.ts` — `buildSitemapEntries(baseUrl, products)` + `buildRobots(baseUrl)`; statics `/`, `/shop`, `/login`, `/register` then active products `/product/{slug}` (lastModified = `updatedAt`); robots: allow `/`, disallow `/admin /api /account /cart /checkout /wishlist`, sitemap URL | production seam | vitest GREEN |
| 3 | `src/app/sitemap.ts` + `src/app/robots.ts` — metadata routes, `force-dynamic`, read active products via `db`, delegate to the seam | route wiring | build + E2E |
| 3b | **F-H2: `git rm public/robots.txt public/sitemap.xml`** — the stale foreign statics SHADOW metadata routes (public/ wins); they must die for the contract to serve | route wiring | E2E (the gate catches the shadow: it asserts OUR origin/paths, which the foreign statics contradict) |
| 4 | `tests/e2e/seo.spec.ts` — 2 unique cases × 2 projects: `/robots.txt` (200, exact disallow set, sitemap URL) + `/sitemap.xml` (200, `<urlset`, all 12 canonical slugs present on the default origin, no noindex surface listed) | E2E (GREEN-first, then a surgical mutation RED) | playwright |
| 5 | Mutation proof: drop the active-only filter → the E2E/unit pins must catch it surgically; restore, re-verify GREEN | process | vitest + playwright |
| 6 | Round-17b census — MUST be byte-equal to 17a (rest-invariance by measurement) | parity | sweep tool |
| 7 | Screenshots refresh (`--shots`), mobile drawer visual verify | evidence | files |
| 8 | Docs alignment: SKILL v1.15.0 (project_state, §2 rows, §11, Appendix B SEO row, F-H note), README (badge/counts + the env row now TRUE), CLAUDE.md (unit count, testing strategy, env table), PAD (test table 18/149? + 14 files / 91 cases / 182+2, §7.1 coverage map SEO note, §7.3, env row), `docs/remediation-plan-session22.md` (this file), worklog | docs | stale-count sweep |

### Count ledger (expected post-remediation)

| Metric | Before | After |
|---|---|---|
| unit files | 17 | 18 |
| unit tests | 142 | 151 (9 new SEO seam cases) |
| E2E spec files | 13 | 14 |
| unique E2E cases | 89 | 91 (2 new SEO cases × both projects) |
| E2E result | 178 passed + 2 skipped | 182 passed + 2 skipped |

## 6. Validation of this plan against the codebase (pre-execution)

- `Product` has `slug` (unique), `isActive`, `updatedAt` — the seam's inputs
  exist; the seed ships 12/12 active (verified live: `active: 12, total: 12`).
- `MetadataRoute` is a type-only import from `next` — no runtime coupling in
  the seam; the route files own the framework types.
- The proxy matcher (`/((?!api|_next/static|_next/image|favicon.ico).*)`)
  matches `/sitemap.xml` + `/robots.txt` → they receive the nonce CSP header
  (harmless; F-G's note becomes fully true — the header now rides the REAL
  metadata routes' 200s, no longer a foreign static's). No matcher change.
- The E2E boots the standalone with `NEXT_PUBLIC_SITE_URL` UNSET → the
  documented default origin `http://localhost:3000` is deterministic on the
  wire — the SEO gate pins the fallback contract itself.
- Admin E2E fixtures flip `isActive` transiently but restore (H-7); `workers:
  1` means no concurrent flip can race the SEO gate's 12-slug pin.
- vitest `include` covers `src/lib/*.test.ts`; playwright `testDir` covers
  `tests/e2e/*.spec.ts` — both new files are picked up with ZERO config
  changes (the config-file contract is untouched).

## 7. Execution record

Filled in as the work proceeds (see the worklog entry for the final ledger).

| # | Task | Result |
|---|---|---|
| 1 | SEO seam unit contract (RED by absence) | ✅ 9 new cases RED (module missing — collection fails), 142 existing green |
| 2 | `src/lib/sitemap.ts` pure seam | ✅ GREEN 151/151 (18 files) |
| 3 | `/sitemap.xml` + `/robots.txt` routes (force-dynamic) | ✅ build green — then the FIRST gate run caught the SHADOW: the served body was the scaffold's foreign static (Vite :4173 origin + /order-success); forensics: `public/robots.txt` + `public/sitemap.xml` (git-tracked, session-1 lineage) answer BEFORE metadata routes |
| 3b | F-H2: the foreign statics deleted (`git rm`) | ✅ routes take over |
| 4 | `tests/e2e/seo.spec.ts` (2 unique × 2 projects) | ✅ first run CAUGHT THE SHADOW (4 failures — the foreign statics' bodies contradict every assertion); after F-H2 + rebuild: 6/6 (2 setups + 2 cases × 2 projects) |
| 5 | Mutation RED demo (active-only filter dropped) | ✅ surgical: 2 of the 9 SEO unit cases fail (the inactive-product case + the ordering/lastModified case — both in the SEO file only), all 142 others green; restored → 151/151 |
| 6 | Round-17b census | ✅ byte-equal to 17a on EVERY field (77/77 compared programmatically) — the SEO addition is rest-invisible |
| 7 | Screenshots refresh + drawer verify | ✅ 9 re-captures (both sides, desktop + mobile incl. the drawer), drawer visually verified pixel-identical |
| 8 | Docs alignment + stale-count sweep | ✅ SKILL v1.15.0; README/CLAUDE/PAD aligned; ZERO stale counts |
| — | Final gates on the final tree | typecheck ✓ lint ✓ 151/151 unit ✓ build ✓ E2E 182 passed + 2 skipped ✓ |

## 8. Residual risks / next steps (post-F-H)

1. `style-src 'unsafe-inline'` remains the documented CSP exception (carried;
   retiring it needs nonce'd styles — a parity-risky change for near-zero
   gain on a storefront with no third-party style injection).
2. Real PSP behind the checkout seam (carried) — needs external credentials
   and a compliance decision; the COD + card-mock paths remain the superset.
3. Dev-toolchain npm-audit findings (11: 1 moderate / 8 high / 2 critical,
   all dev-only) — revisit when vitest 5 / prisma 7 land non-breaking paths.
4. G-3 POSIX-only sweep paths (carried; no Windows target in scope).
5. The action-seam gate couples to the standalone build's manifest shape — a
   Next.js major upgrade that moves the manifest fails LOUDLY at the canary
   (by design; re-pin then).
6. The zero-drift streak is a streak, not a guarantee — the two-census ritual
   stays mandatory before every commit.
