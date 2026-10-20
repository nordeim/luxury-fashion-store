# Session 67 — the session-49 round (F-TT: the inactive-product visibility contract's two beyond-the-render halves — the wishlist action's missing isActive wall, fixed + pinned; and the PDP's streaming-metadata head leak, caught when the spec overruled the probe)

Resuming with the standing directive (the session-48 continuation —
session_65/remediation-plan-session48/session_66/worklog reviewed). My round =
the session-49 continuation auditing `32d97e1` (the parallel thread's
session-log commit) plus a full re-verification of the committed tree. **No
workspace reset this round** — the recovery set was already materialized
(node_modules, `.env`, both DB files, the built standalone all present); only
`git pull` was needed.

**Step 1: Workspace refresh + audit of the pulled HEAD**

`git pull` → fast-forward `9f9438f..32d97e1`. `git log --name-status -1` →
ONE change: `docs/session_66.md` (+79, the parallel thread's raw narration of
the SAME session-48 round — its ledger matches `9f9438f`'s actual work;
docs-only, RETAINED). This round's narration ships as `docs/session_67.md`
(session_66.md taken by the pulled commit).

**Step 2: The reference re-probe — FIRST THING (the session-48 plan §12
item 14)**

The live reference (Base44) answered **HTTP 503 on both `/` and `/login`** at
the round's start — the sessions-44/45/46/47/48 outage, now the SIXTH
consecutive round. Re-probed before the final gates: **STILL 503** — handled
per the honest-outage precedent (the census runs clone-side ×2; the
reference-side fields carry by documentation from the round-38 live
measurement; the WOMEN-inert posture re-check + the 2 ref screenshots stay
deferred; §12 item 14 carried forward).

**Step 3: Baseline gates — re-proven on the intact workspace**

typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build + assemble ✓ E2E
**284 passed + 2 skipped** (143 unique × 2; 6.8m) — the 50th consecutive
session fully green at baseline, exactly matching session-48's final gates.
The standing Tailwind v4 / mobile-nav pins re-verified first-hand during the
audit (mobile-nav.tsx:59 `w-80 … flex flex-col gap-6`, :76
`flex flex-col gap-5 mt-4`; 26 full `hsl()` literals in globals.css
`@theme`; zero live `space-y-` on parity surfaces).

**Step 4: Fresh audit pass — a class no census had systematically swept**

With F-SS every MUTATION seam's authz wall owns a gate, and the session-48
plan §12 returned the named candidates to the documentation class. The
fresh pass therefore swept **the inactive-product visibility contract beyond
the render seam** — does `isActive:false` actually mean "hidden" at EVERY
seam that reads a product? The isActive read-census (every product read in
`src/`, first-hand): home/PLP/PDP-render+related/wishlist-page/search/
sitemap all filter; cart-add and checkout re-read DENY; but **two seams ran
existence-only**:

- **F-TT half A — `toggleWishlistAction`'s missing isActive wall**
  (wishlist.ts:23-25): the action read `select: { id: true }` and answered
  its own "This piece is no longer available." on EXISTENCE alone — while
  the cart's exact mirror (cart.ts:57-60) guards `!product ||
  !product.isActive` with the SAME message. A deactivated product could be
  wishlisted over the crafted JSON-arg wire or from a stale PDP tab; the
  row's only wire-visible trace is the header badge (the RAW productIds
  set) counting it while the wishlist page's isActive:true read renders the
  empty-state guidance — **the badge-vs-page disagreement**. Wire-blind: no
  spec anywhere posts toggleWishlist with an inactive product.
- **F-TT half B — the PDP's `generateMetadata` head** (product/[slug]/
  page.tsx:29-33): existence-only while the render 404s. Next 16 streams
  metadata in parallel with the render — the hypothesis: the hidden
  product's title/og:image/price leak past the render wall.

**Step 5: Plan-probe discipline (BEFORE the spec)**

`scripts/plan-probe-session49.cjs` — the throwaway healthy-copy standalone
on :3209 (the F-PP/F-QQ/F-RR/F-SS copyFile pattern): **9/9 checks**. Half A
reproduced over the wire (the inactive id toggles `ok:true`, the row MINTS,
the cookie mints); the badge-vs-page disagreement rendered END-TO-END
("Wishlist, 1 item" badge + "Tap the heart…" empty-state guidance + card
absent); the active control's write proved the wire shape. Half B measured
— and initially READ as a non-issue: the raw-fetch title was 'AURELIA' for
BOTH the inactive and the unknown slug.

**The round's signature lesson: THE SPEC OVERRULED THE PROBE.** The TDD RED
run caught what the probe's raw fetch had under-read: the E2E browser case
measured the DOM AFTER streaming resolves and found **"F-TT 404 Probe |
AURELIA"** — the static shell carries the root title while the **RSC flight
payload streams the hidden product's title/og:image/price**
(`scripts/plan-probe-session49b.cjs` measured the flight bytes first-hand:
`18:[["$","title","0",{"children":"F-TT Leak Probe … | AURELIA"}]…]`). Every
JS-executing client resolves the leak. **Raw-fetch title-greps under-read
Next 16's streaming metadata — browser DOM content is the authoritative
head measurement.**

**Step 6: The TDD ladder (RED → fix → GREEN)**

- **RED**: the F-TT wishlist describe (at the END of wishlist.spec.ts, the
  OWNING spec — describes 4 → 5) failed at the wall assertion on both
  projects; the Half-B error-surfaces case (the 404-card-owning spec)
  failed at the title-honesty assertion — 4 failed / 14 passed on the
  pre-fix tree, exactly the two case-runs × 2 projects.
- **The fix (both halves mirrors of existing guards)**: wishlist.ts selects
  `isActive` + the two-branch guard with the SAME message (the cart's exact
  mirror); generateMetadata gets the render's exact `!product ||
  !product.isActive` guard.
- **Harness lesson applied mid-case**: Playwright's APIRequestContext jar
  drops the production-`Secure` cookie over http — the control's toggle
  pair was redesigned to ride a PRE-MINTED guest wishlist row through an
  EXPLICIT `Cookie: aurelia_wishlist=` header (the F-RR wire fact: explicit
  Cookie headers authenticate server actions). Never depend on the jar for
  request-level control pairs.
- **GREEN 18 passed** (both spec files, both projects).

**Step 7: TWO mutation demos — the halves independently gated**

1. **The wishlist wall dropped** (reverted to existence-only) → REBUILD →
   **exactly the 2 F-TT wishlist case-runs RED** (the inactive craft minted
   again) with all 16 others green incl. the Half-B pair.
2. **The metadata guard dropped** → REBUILD → **exactly the 2 Half-B
   case-runs RED** at the title assertion with all 16 others green incl.
   the F-TT pair.

Restored (the tree's `src/` delta = exactly the two intended fix files) →
rebuild → 18/18 green.

**Step 8: Round-44 census — the outage handled honestly (again)**

**ENVIRONMENT: the reference (Base44) answered 503 across every probe this
round** (start + the final re-probe — the sixth round). The census ran
**clone-side ×2** (44a on the post-fix build + 44b after the post-dev
rebuild): **ZERO DRIFT — byte-identical to the round-38..43 clone-side
ledger in ALL census fields**: desktop 11085/11/444, mobile 11264/11/1189,
the drawer char-identical (`w-80` + `flex flex-col gap-6` +
`flex flex-col gap-5 mt-4` + gaps [20,20,20,20]) — **the v4 mobile-nav pin
holds**; clone console clean both censuses. **The clone's mobile menu
verified end-to-end on the dev server** (`rm -rf .next`; `env -u
DATABASE_URL` boot; the settle probe): burger → drawer (dialog:1) →
overflow hidden → **Women → `/shop?category=women` LANDS (8 cards)** →
closed → overflow restored → zero errors. 11 screenshots refreshed; 8
byte-identical to the committed versions; the 3 differing
(clone-mobile-home, clone-mobile-menu-open — the documented timing class;
clone-pdp — a NEW time-dependent delta, pixel-diffed to 315 pixels in a
58×9 text box: **the delivery-estimate date rolled** (estimateDelivery()
uses `new Date()`; every geometry pin byte-stable); dev cart row cleaned,
canonical 4/12/2/4 re-verified.

**Step 9: Final gates + docs**

typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **288
passed + 2 skipped** (145 unique × 2; 6.9m) — the 51st consecutive
fully-green session, exactly the plan's count ledger (wishlist.spec
uniques 4 → 5, error-surfaces 2 → 3 → 143 → 145 unique, 284 → 288 passed).
Docs aligned: SKILL v1.42.0 (frontmatter 288/145 + F-TT; §2 E2E row + F-TT;
§11 command 145; Appendix B NEW session-49 row), README (badge 173+288 +
F-TT pins + 145), CLAUDE.md (gate line 145 + the F-SS→F-TT chain segment +
commands 145), PAD (test table 20|145|288 + §7.3 command 145 + the
coverage-map session-49 extension), AGENTS.md (the security line's F-TT
segment + the E2E command row 145), `docs/remediation-plan-session49.md`
(the plan + execution record), worklog, this log; `.env.example` unchanged
and matching; stale-count sweep zero.

**Step 10: Commit + push (main only)**

One main-branch commit — this round carries BOTH the two-line source fix
(the wishlist wall + the metadata guard — the first src/ delta since the
gate-only streak began) and the gate artifacts (the F-TT describe + the
Half-B case + the two probe scripts + the plan + the refreshed screenshots +
the five-docs alignment + the worklog + this log) — pushed via the SSH
wrapper v3 with `--remote git@github.com:nordeim/luxury-fashion-store.git`,
verified on the remote, key shredded.
