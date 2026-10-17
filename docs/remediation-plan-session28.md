# Remediation Plan — Session 28 (AURELIA / VELOUR clone)

> **Status:** PLANNED → EXECUTED this round (the session-27 continuation, named
> for the next session number per the standing precedent).
> **Mode:** Verify-first (Mode C) → reconciliation of the pulled remote
> (`c26490a` the session-27 PDP-OG-identity round + `8c467a0`/`2bfa98d` its
> session logs) → first-hand audit → live-reference parity sweep round 23 →
> fresh audit pass → gate-coverage remediation (F-X). **Scope:** the
> session-27 commit audited 5/5 claims TRUE first-hand (the F-W fix verified
> in source AND over the wire — the session-27 probe re-run 14/14 on the
> built standalone; the twitter half of trap #41 has NO instance: no child
> `twitter` override exists anywhere, the file-convention card carries every
> route); **the round-23a census measured ZERO DRIFT** (21st consecutive
> clone-side sweep — the reference byte-stable against the round-22 ledger,
> mainKids 11 both sides both viewports, drawer gaps [20,20,20,20] — the v4
> mobile-nav pin holds, the standing task re-check); **the fresh pass opened
> two seams no prior round audited** — the referenced-brand-asset surface and
> the per-route head census beyond the four audited routes — and found **F-X**
> (a gate-coverage gap, the files themselves verified serving) plus one
> expected-by-design confirmation (canonical absence on the robots-disallowed
> surfaces).

---

## 1. Starting state

WARM workspace fast-forwarded `c26490a..2bfa98d` (the pull brought only
`docs/session_27.md` — the previous thread's session log; docs only, no code).
Environment incidents this reset (the recurring reset set, FOUR this round):

| Step | Result |
|---|---|
| `git pull` | ✓ fast-forward to `2bfa98d`; `skills/` pruned → `git restore`; untracked `bun.lock` deleted |
| `.env` rewritten ABSOLUTE (and re-pinned) | ⚠️ FIRST re-pin truncated the contract to ONE line — the sweep's boot then failed on the missing `AUTH_SECRET` (the standalone does not load `.env` at runtime; the sweep tool inherits the shell env). Restored the canonical 3-line contract (DATABASE_URL + dev AUTH_SECRET + NEXT_PUBLIC_SITE_URL) |
| Playwright cache present but the WRONG BUILD (v1200 vs the pinned 1.64.0's v1248) | ⚠️ `npx playwright install chromium` (the session-25 incident class, second recurrence) |
| `bin/ssh` shim missing + paramiko missing | ⚠️ shim rebuilt (venv shebang) + paramiko 5.0.0 via `/home/z/.venv/bin/python3 -m pip` |
| `db/custom.db` EMPTY (zero rows) | ⚠️ `db:setup` restored canonical 4/12/2/4 (the session-22 incident class) |
| `core.fileMode false` survived | ✓ verified |
| Shell-level `AUTH_SECRET` absent | ⚠️ the sweep tool needs it inline at invocation (`AUTH_SECRET=… node scripts/parity-sweep-session11.cjs`) — playwright.config is self-sufficient (E2E_AUTH_SECRET), the sweep is not; recorded as an environment note, zero product diff |

**Baseline gates on the committed tree (TWENTIETH consecutive session fully
green at baseline):** typecheck ✓ · lint ✓ · **173/173 unit (19 files)** ✓ ·
build + assemble ✓ (E2E runs at the final gate).

## 2. Audit of `c26490a` (first-hand full-source verification)

Composition: the PDP `generateMetadata` (the F-W openGraph re-declaration,
comment naming the shallow-merge mechanism + the two documented residuals) +
the brand-metadata gate extension (the F-W case) + probe/dump tools +
`docs/remediation-plan-session27.md` + SKILL v1.20.0 (trap #41) + README/
CLAUDE/PAD alignment + 3 screenshot re-captures + worklog. Claims verified
against the final tree:

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | The PDP's `openGraph` re-declares `type: "website"` + `siteName: "AURELIA"` + `url: siteUrl` | `product/[slug]/page.tsx` read in full — lines 44-52, the F-W comment records the mechanism + residuals; `siteUrl` hoisted (line 27) and NOT re-used out of scope (the session-27 en-route over-reach was reverted pre-commit) | TRUE |
| 2 | The fix holds over the wire | `scripts/wire-probe-session27.cjs` re-run on the fresh build: **14/14** — "PDP carries og:type + og:site_name + og:url (F-W)" PASS, all session-26 claims (F-R/F-S/F-T/F-V) still PASS | TRUE |
| 3 | The brand-metadata gate extended with the F-W case (107 unique × 2) | `brand-metadata.spec.ts` "the PDP head carries the site-level OG identity fields" present (served-bytes, property-attributed serialization) | TRUE |
| 4 | The twitter half of trap #41 has no live instance | `grep openGraph\|twitter:` over `src/app` — the PDP is the SOLE child override (openGraph only); the root declares no `twitter` object (the file-convention PNG injects twitter:image + twitter:card on every route — wire-verified in the round's census: `twitter:card = summary_large_image` + `twitter:image` on all ten probed routes) | TRUE |
| 5 | Docs aligned (SKILL v1.20.0 trap #41 + §10 row + Appendix B row; README/CLAUDE/PAD counts 173/107/214) | all read in full this round; counts consistent | TRUE |

**Verdict: 5/5 claims TRUE, zero production regressions.**

## 3. Live reference sweep — round 23a (measured 2026-10-17): ZERO DRIFT

Full two-census ritual (both viewports, both sides). The reference is
byte-stable against the round-22 ledger — **21st consecutive clone-side
sweep**:

| Ledger field | Round-22 ledger | Round-23a measured | Verdict |
|---|---|---|---|
| ref desktop pageH / mainKids | 11079 / 11 | 11079 / 11 | byte-stable |
| ref mobile pageH / mainKids | 11257 / 11 | 11257 / 11 | byte-stable |
| ref footers | 444 / 1189 | 444 / 1189 | byte-stable |
| clone (all fields, both viewports) | 11085/11264, mainKids 11, footers 444/1189, drawer gaps [20,20,20,20] | identical | byte-stable — **the mobile-nav v4 pin holds** (panelCls/navCls char-identical, 5 items, gaps [20,20,20,20]; the standing task re-check) |
| chip/marquee/nameH3 (Cormorant Garamond) ranks | pinned | identical | byte-stable |

The reference did NOT move this round (round 22 held too; two stable sweeps
since the round-21 move).

## 4. Fresh audit pass — findings (the round's targets)

Two seams no prior round audited, opened via the new wire census
(`scripts/head-census-session28.cjs` — boots the standalone, fetches every
referenced brand asset, dumps + checks the head on TEN routes; 43/43 green on
the final probe revision):

1. **F-X — the brand-metadata gate pins every reference but never the
   referenced target.** The manifest case asserts `icons[0].src ===
   "/icons/icon-192.png"` and `icons[1].src === "/icons/icon-512.png"` as
   STRINGS; the store-root JSON-LD case asserts `logo ===
   "http://localhost:3000/icons/icon-512.png"`; the head cases assert the
   `apple-touch-icon` link and the `og:image`/`twitter:image` URLs — but NO
   case ever FETCHES `/icons/icon-192.png`, `/icons/icon-512.png`,
   `/apple-icon.png`, or `/opengraph-image.png`. A future rename, deletion,
   or `public/`-layout regression would 404 the PWA install icons and the
   Organization graph's logo while EVERY gate stays green (the manifest body
   still says the right strings; the JSON-LD still says the right URL).
   Evidence: the full spec read (13 test cases, zero asset fetches beyond
   favicon.ico/icon.svg — the F-K two) + the probe's first-hand fetch: all
   six assets serve 200 + correct content-type + nonzero body TODAY. This is
   the F-H2 lesson's sibling (F-H2: "assert BODIES, never just status codes";
   F-X: "assert the REFERENCED TARGETS, not just the reference") — same
   failure family, one layer out: a contract pin that stops one hop short of
   the wire. Severity: LOW (gate-coverage gap; the product is correct today —
   verified serving; the risk is silent future breakage). Remediation: the
   brand-metadata gate gains one case that fetches EVERY referenced asset
   (the manifest's two icons, the Organization logo target, the apple icon,
   the share card) and asserts 200 + content-type + nonzero body — the
   "referenced ⇒ serves" contract pinned for good. No production change (the
   assets serve; verified first-hand). Gate = the new case + the mutation
   demo (an icon rename must fail exactly that case).

INFO-level (verified, no action):
- **Canonical absence on /cart, /checkout, /wishlist is BY DESIGN** — all
  three are in `ROBOTS_DISALLOW` (`src/lib/sitemap.ts`: /admin, /api,
  /account, /cart, /checkout, /wishlist), so a canonical there would be
  meaningless; F-T scoped canonicals to the indexable set (the four sitemap
  statics + the PDP). The census probe initially asserted canonical presence
  on every non-404 route — an over-broad expectation; fixed in the PROBE
  (the tool now asserts the absence as the contract), not in the product.
  Same discipline as session-27's probe-shape fix.
- The 404 head carries `robots = noindex` (Next auto-emits for not-found) —
  correct; the reference has no comparable surface.
- The twitter surface: `twitter:card = summary_large_image` + the file-
  convention image on every probed route; no child `twitter` override exists
  anywhere (trap #41's second half has no instance — the sole child override
  remains the PDP's openGraph, now re-declaring).
- /account + /admin logged-out visits are server redirects (3xx) — the head
  census cannot see their logged-in heads without a session; the redirect
  behavior itself is the gate (the a11y gate covers their logged-in surfaces
  via the SQL-minted sessions).

### Honest-gate decisions (run before planning)

- **F-X adds gate coverage; it changes no product behavior.** The served DOM
  is untouched; the parity census cannot drift (test-only round).
- **No gate is weakened.** The brand-metadata gate EXTENDS (+1 case); the
  F-K/F-K2/F-N pins are untouched; the fetch case reuses the exact referenced
  strings the existing cases already assert (single source of expectations).
- **Doctrine constraints:** parity law (test-only — rest-invisible by
  construction, proven by the round-23b census anyway); no mutation-seam or
  client-state changes; no new npm dependencies; vitest/playwright configs
  untouched (the new case lands in the existing spec's describe contract);
  `.env.example` unchanged (no new env vars); money untouched.

## 5. Remediation design (TDD)

### ToDo

| # | Task | Layer | Gate |
|---|---|---|---|
| 1 | `tests/e2e/brand-metadata.spec.ts` — new F-X case: fetch every referenced asset (the manifest's two icons read from the SERVED manifest body, the Organization logo target read from the SERVED JSON-LD, /apple-icon.png, /opengraph-image.png) and assert 200 + content-type + nonzero body — expectations derived from the served artifacts, not duplicated literals. GREEN on the current tree (coverage case, not bug fix — the files verified serving); the spec header comment gains the session-28 note | E2E | playwright |
| 2 | Mutation demo (surgical, inverse-restore — traps #37/#39): rename `public/icons/icon-512.png` → exactly the F-X case fails (the manifest references a 404) while the OTHER cases stay green (the string assertions still match the manifest body) → restore by rename-back; `ls` verifies the file is back; REBUILD before the demo (trap #16 — the standalone serves `public/` via the assemble copy) | process | playwright |
| 3 | Round-23b census — MUST be byte-stable vs the 23a ledger (test-only round; the verdict closes the rest-invariance claim) | parity | sweep tool (--shots for the screenshot refresh) |
| 4 | Final gates on the final tree: typecheck → lint → unit → build → full E2E | gates | npm run verify + test:e2e |
| 5 | Docs alignment: README (badge 173+216, brand-metadata feature row + the referenced-assets serve pin, testing rows), CLAUDE.md (gate line 108 + gate description), PAD (test table 16\|108\|216, §7.1 session-28 paragraph), SKILL (frontmatter project_state 108/216+2, §2 E2E row, Appendix B session-28 row on the F-K/F-N row), this file's execution record, worklog | docs | stale-count sweep |

### Count ledger (expected post-remediation)

| Metric | Before | After |
|---|---|---|
| unit files / tests | 19 / 173 | 19 / 173 (no new pure seam — F-X is gate coverage) |
| E2E spec files | 16 | 16 (brand-metadata.spec.ts extended) |
| unique E2E cases | 107 | 108 (+1 F-X case × both projects) |
| E2E result | 214 passed + 2 skipped | 216 passed + 2 skipped |

## 6. Validation of this plan against the codebase (pre-execution)

- The F-X case derives its expectations from the SERVED artifacts (the
  manifest body's icon array; the home JSON-LD's Organization logo) — no
  duplicated literals to drift; the fetch list is exactly the set the
  existing cases already assert as strings.
- `/apple-icon.png` + `/opengraph-image.png` are file-convention routes —
  Next serves them from `src/app/`; the probe verified 200 + image/png on
  the fresh build (the assemble step copies `public/`; the file routes ship
  in the bundle).
- The mutation demo renames a `public/` file — the standalone serves the
  ASSEMBLED copy, so the demo rebuilds first (trap #16) and restores before
  the final build (the restore is verified by `ls` + the 23b census).
- The brand-metadata spec's request fixture carries no storageState opt-out
  need — the fetches are unauthenticated by design (favicon-class surfaces).
- No schema/env/seed changes; money untouched; no revalidatePath surface;
  `.env.example` unchanged; `next.config.ts` untouched.
- The census measures the home page only — a test-only round cannot drift
  it; the ritual still runs as the verdict (trap #40's discipline).

## 7. Execution record

| # | Task | Result |
|---|---|---|
| 1 | F-X case in the brand-metadata gate | ✅ "every referenced brand asset serves over the wire" — fetches the two manifest icons (read from the SERVED manifest body), the Organization logo (read from the SERVED home JSON-LD), /apple-icon.png, /opengraph-image.png; asserts 200 + content-type + nonzero body; GREEN both projects on the current tree (the probe's first-hand evidence) |
| 2 | Mutation demo | ✅ icon-512.png renamed → rebuild → exactly the F-X case failed (both projects; the string-pinning cases stayed green — the gap's exact shape) → restored by rename-back, `ls` verified → rebuild |
| 3 | round-23b census (--shots) | ✅ ZERO DRIFT — byte-identical to 23a: mainKids 11 both sides both viewports; pageH 11079/11085 + 11257/11264; footers 444/1189; drawer gaps [20,20,20,20] char-identical (the v4 mobile-nav pin holds); chip/marquee/nameH3 hold; clone console clean |
| 4 | Final gates on the final tree | ✅ typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **216 passed + 2 skipped** (108 unique × 2 − 2 desktop-only skips + 2 setup) |
| 5 | Docs alignment + stale-count sweep | ✅ README (badge 173+216, feature row, testing/status rows); CLAUDE.md (gate line 108 + description); PAD (test table 16\|108\|216, §7.1 session-28 paragraph); SKILL (frontmatter project_state, §2 E2E row, Appendix B brand-metadata row extension); this file's record; worklog. Stale-count sweep: zero stale counts |

## 8. Residual risks / next steps (post-F-X)

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
   stays mandatory. Two stable rounds since the round-21 move.
9. security.txt's `Expires` (2027-11-01) renewal stays a documented
   maintenance cadence.
10. The canonical convention delta (home renders the bare origin vs the
    reference's trailing-slash form) remains RFC-3986-equivalent, pinned as
    served (carried, session-26).
11. `/shop`'s inherited `og:url` = origin (the root convention; the canonical
    link disambiguates) — accepted; carried.
12. The sweep tool inherits the shell's `AUTH_SECRET` (playwright.config is
    self-sufficient; the sweep is not) — this round's env incident; a future
    round may harden the tool with an inline dev-secret fallback (zero
    product impact, tooling-only).
