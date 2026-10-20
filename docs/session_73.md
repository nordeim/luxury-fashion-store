# Session 73 — the session-52 round (F-WW: the bag-add stock/visibility chain — addToCartAction's isActive wall + add-path clamp, and placeOrderAction's STOCK_SHORT guard — three wire-blind halves, gated; four mutation demos, every half independently proven)

Resuming with the standing directive (the session-51 continuation —
session_71/remediation-plan-session51's successor chain session_72/worklog
reviewed). My round = the session-52 continuation auditing `ccc93b5` (the
pulled session-log commit) plus a full re-verification of the committed tree.
**The workspace WAS RESET this round** (fresh clone — no node_modules, no
`.env`, no DBs, no Playwright browsers). The documented recovery sequence ran
and is proven again: `npm install` → write `.env` (the schema-relative
`DATABASE_URL="file:../db/custom.db"` contract + AUTH_SECRET +
NEXT_PUBLIC_SITE_URL + TRUST_PROXY) → `env -u DATABASE_URL npm run db:setup`
(4 categories, 12 products, 2 users, 4 orders — `db/custom.db` at the repo
root) → `npx playwright install chromium`.

**Step 1: Workspace refresh + audit of the pulled HEAD**

Fresh clone at `ccc93b5` = `bdb077b` (session-51's push) + `docs/session_72.md`
(the parallel thread's raw narration of the SAME session-51 round — the
F-VV ledger matching `bdb077b`'s actual work; docs-only, RETAINED). This
round's narration ships as `docs/session_73.md`.

**Step 2: The reference re-probe — FIRST THING**

The live reference (Base44) answered **HTTP 503 on both `/` and `/login`** at
the round's start — the sessions-44..51 outage, now the NINTH consecutive
round. Re-probed once more before the final gates: **STILL 503** — handled
per the honest-outage precedent (the census runs clone-side ×2; the
reference-side fields carry by documentation from the round-38 live
measurement; the WOMEN-inert posture re-check + the 2 ref screenshots stay
deferred).

**Step 3: Baseline gates — re-proven on the recovered workspace**

typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build ✓ E2E **294 passed +
2 skipped** (148 unique × 2, 7.3m) — the 56th consecutive session fully green
at baseline, exactly matching session-51's final gates. The standing pins
re-verified first-hand: the F-VV spec present, the cart-line walls at
cart.ts:142/:234, the merge at cart.ts:154 + both doors at auth.ts:44/:123,
mobile-nav `w-80` + `flex flex-col gap-5 mt-4` + `flex flex-col gap-6`, 26
`hsl()` literals in globals.css, `.env` written to the contract +
`.env.example` matching, `db/` at the root, both test configs intact.

**Step 4: Fresh audit pass — the round's finding (F-WW)**

With both guest→user merge seams fully gated (F-VV) and the mutation seams'
authz walls closed (F-SS/F-TT/F-UU), the fresh audit swept the **bag's
stock/visibility invariant chain** — and found THREE wire-blind halves on the
two write actions every customer path flows through:

1. **addToCartAction's isActive wall** (cart.ts:57-60): the session-21 census
   probes only a NONEXISTENT id — the `!product` branch — so the
   DEACTIVATED-product half (a stale tab or a crafted POST against the
   admin's H-7 visibility toggle) never fired in any gate. And getCartDto
   carries no isActive filter, so a dropped wall renders the hidden line in
   the drawer with live money math — the F-TT class's last ungated reach.
2. **addToCartAction's add-path stock clamp** (clampToStock, cart.ts:24-27 +
   :96/:99): cartAddSchema allows quantity ≤ 99, the UI stepper caps at
   stock, and NO spec ever drove an add above stock. A dropped clamp lands a
   99-quantity line on a stock-12 product — the unplaceable-bag exposure.
3. **placeOrderAction's STOCK_SHORT guard** (checkout.ts:142-154 + the
   :105-107 envelope): `grep STOCK_SHORT tests/` = ZERO hits. F-MM pinned
   the SUCCESS path's write set; the FAILURE path — the oversell invariant's
   last line of defense — was ungated entirely: a dropped stock term
   decrements below zero and lands the order on inventory that never
   existed; a dropped isActive term sells a deactivated line; a "helpful"
   unconditional purge would empty the bag on a REJECTED placement.

Same precedence rule as sessions 47-51: a data-integrity seam with a
wire-reachable surface outranks the named documentation-class candidates.

**Step 5: The plan + the probe**

`docs/remediation-plan-session52.md` written and validated against the
codebase (cart.ts + checkout.ts read IN FULL first-hand; the census/F-UU/F-QQ
helpers mapped; the F-LL fixture INSERT shape cribbed; the port census
verified — :3210 free; CartItem's cascade verified). The plan-probe
(`scripts/plan-probe-session52.cjs`, the throwaway healthy-copy on :3209)
came back **13/13** — with the probe's own lesson: the first run's 2 FAILs
were PROBE bugs (the fixture's own Cart B line collided with the
absolute-zero-rows assertion; the unscoped findFirst matched Cart A's fixture
line — while the DTO's quantity:5 already proved the clamp fired). Fixture
rows on the assertion target must be scoped out, never counted as zero.

**Step 6: The gates (TDD — GREEN first, then the mutation demos)**

- **Spec 1** — the F-WW describe in `action-seam-security.spec.ts` (the
  OWNING spec for addToCartAction; uniques 5 → 6): the manifest canary +
  addToCartAction by exportedName → the cookie-less deactivated craft answers
  the availability envelope + zero new rows + NO cart cookie (the wall fires
  BEFORE getOrCreateCart) → the 99-craft answers ok:true + mints the guest
  cart + the craft's own line (by its minted cart token) at quantity EXACTLY
  the captured stock + the DTO carrying the clamped quantity. GREEN ×2
  projects.
- **Spec 2** — the F-WW describe in `cart-checkout.spec.ts` (the OWNING spec
  for placeOrderAction; uniques 17 → 18): the THROWAWAY healthy-copy
  standalone on :3210 (the F-QQ crib — zero :3100 checkout-limiter
  consumption) + craft A (the over-stock bag) and craft B (the deactivated
  bag) both answer "A piece in your bag just sold out." with the rollback
  held whole — zero orders, stock untouched, the bag line intact (the
  success-only purge). GREEN ×2 projects.
- **Mutation demos ×4** (each: REBUILD → exactly the predicted runs RED →
  restore byte-identical → rebuild → green): (1) the wall-drop → exactly 2
  RED at the envelope, 12 green; (2) the clamp-drop → exactly 2 RED at
  **Expected 5 / Received 99** — the strict-mode TS6133 gate caught the naive
  dropped-calls surgery (the helper went unused and the BUILD failed — a gate
  working as designed), the pass-through body shape used instead; (3) the
  whole-guard drop → exactly 2 RED with **36 green** — the craft SUCCEEDS,
  the order lands, the stock decrements below zero (the wire-blindness
  proof: COD/card/F-MM all place lawful quantities); (4) the isActive-term
  drop → exactly 2 RED at CRAFT B's envelope while CRAFT A's step stayed
  green within the same case — the guard's two terms independently gated.
  Restored byte-identical (`git diff --stat src/` empty) → rebuild → both
  owning files 50/50 green.

**Step 7: Round-47 census + the mobile-menu ritual + screenshots**

Census 47a (final build) + 47b (post-dev-rebuild): **ZERO DRIFT both** —
desktop 11085/11/444, mobile 11264, drawer `flex flex-col gap-5 mt-4` + gaps
[20,20,20,20] (the v4 mobile-nav pin holds), console clean. The dev-server
ritual (rm -rf .next → env -u DATABASE_URL boot → settle probe → dev shots →
hygiene → kill, ONE foreground command): **the mobile menu verified
end-to-end** — burger → drawer (dialog:1) → overflow hidden → Women →
`/shop?category=women` LANDS (8 cards) → drawer closed → overflow restored →
zero errors. Screenshot ledger: **9 byte-identical + 2 timing-class** — the
desktop pair's diffs (5680px / 2192px) proven the pure animated-pixel
signature via the **SELF-DIFF method** (two consecutive same-build census
runs differ by EXACTLY the same pixel counts), the mobile pair confined to
the carousel strip + the behind-drawer column (the drawer crop x<320
byte-identical: 0/270080); the 47c self-diff run's desktop shots then landed
byte-identical to HEAD — the class confirmed twice over.

**Step 8: Final gates + docs**

typecheck ✓ lint ✓ 173/173 unit ✓ build ✓ **E2E 298 passed + 2 skipped**
(150 unique × 2 = 300 total runs, 7.4m) — the 57th consecutive fully-green
session, exactly the plan's count ledger (148 → 150 unique, 294 → 298
passed). Budget honored: addToCartAction carries no limiter; :3100's checkout
bucket UNCHANGED at 8/10 (the F-WW crafts run on the throwaway); zero logins,
zero registers, zero storageState pollution. Docs aligned: SKILL v1.45.0,
README, CLAUDE.md, PAD, AGENTS.md, the plan + execution record, worklog, this
log; `.env.example` verified unchanged and matching; stale-count sweep zero;
lint re-run as the last pre-commit step (Trap #28).

**Session-52 complete — one main-branch commit pushed via the SSH wrapper
v3, verified on the remote, key shredded.**

With F-WW the bag's stock/visibility invariant chain is gated end-to-end:
the add seam's wall + clamp, the checkout guard's both terms, and the
rollback's no-purge half each own an independently-mutation-proven gate. The
next named candidates: the documentation class (the PDP og:image annotation
— the FIRST named candidate) or the real PSP integration — plus the
reference-outage re-check stays the FIRST task of the next round if Base44
recovers.
