# Session 71 — the session-51 round (F-VV: the guest-cart merge's dedupe/union/clamp contract + the register door — the F-GG sibling seam, gated; five mutation demos, every half independently proven)

Resuming with the standing directive (the session-50 continuation —
session_69/remediation-plan-session50's successor chain
session_70/worklog reviewed). My round = the session-51 continuation
auditing `50b27be` (the pulled session-log commit) plus a full re-verification
of the committed tree. **NO workspace reset this round** (git pull only —
node_modules, `.env`, both DBs, the built standalone all present).

**Step 1: Workspace refresh + audit of the pulled HEAD**

`git pull` fast-forwarded `ea78524..50b27be`: ONE change, `docs/session_70.md`
(+87 — the parallel thread's raw narration of the SAME session-50 round; its
ledger matches `ea78524`'s actual work: the F-UU describe, the
storageState-ride discovery, the census, the five-docs alignment). Docs-only,
RETAINED. This round's narration ships as `docs/session_71.md`.

**Step 2: The reference re-probe — FIRST THING**

The live reference (Base44) answered **HTTP 503 on both `/` and `/login`** at
the round's start — the sessions-44..50 outage, now the EIGHTH consecutive
round. Re-probed once more before the final gates: **STILL 503** — handled per
the honest-outage precedent (the census runs clone-side ×2; the
reference-side fields carry by documentation from the round-38 live
measurement; the WOMEN-inert posture re-check + the 2 ref screenshots stay
deferred).

**Step 3: Baseline gates — re-proven**

typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build ✓ E2E **290 passed +
2 skipped** (146 unique × 2, 7.0m) — the 54th consecutive session fully green
at baseline, exactly matching session-50's final gates. The standing pins
re-verified first-hand: the F-UU spec present (4 references), the cart-line
ownership walls at cart.ts:142/:234, mobile-nav `w-80` + `flex flex-col
gap-6` + `flex flex-col gap-5 mt-4`, 26 `hsl()` literals in globals.css,
`.env`/`.env.example` matching, db/ at the root, both test configs intact.

**Step 4: Fresh audit pass — the round's finding (F-VV)**

The fresh audit swept the **guest→user merge seams** — the F-EE/F-GG
lineage's remaining sibling. The wishlist merge owns BOTH auth doors (F-EE) +
its dedupe half (F-GG); the CART merge (`mergeGuestCartIntoUser`,
cart.ts:154-192) is gated ONLY on its survival half through the LOGIN door
(H-8, session-5 — a UI flow whose james cart is EMPTY pre-merge). Read
first-hand, every remaining half wire-blind since session-3: the overlap
DEDUPE split (findUnique + update/create at :180/:185-192 — the branch never
fires in any test), the quantity-max UNION (:184, both directions), the F-13
STOCK CLAMP (:184 — the documented session-3 fix), and the REGISTER door's
merge call (auth.ts:123 — entirely ungated). The harm chain: a guest-wins
union drop silently SHRINKS the user's larger line; a keep-existing drop
drops the guest's larger quantity; a clamp drop resurrects the oversell
invariant (only a STALE bag carries an over-stock line — the UI clamps, the
H-39 shape); a dedupe-split drop P2002s inside the merge's `$transaction` and
500s the LOGIN ITSELF (the crash class F-GG named for the wishlist); a
register-door call drop silently loses the guest bag at register. Same
precedence rule as sessions 47-50: the data-integrity seam outranks the
documentation-class candidates (the PDP og:image annotation).

**Step 5: The plan + the probe**

`docs/remediation-plan-session51.md` written (the gate-only F-GG/F-UU
ladder). `scripts/plan-probe-session51.cjs` — the throwaway healthy-copy
standalone on :3209 — **16/16 checks**: boot+health; both auth-page
manifests' exactly 2 identical ids + the F-PP envelope discrimination; the
fixture user minted with an offline scrypt hash (s1$salt$hex, keylen 64 —
the F-II replication) that VERIFIES offline; **the login-door merge holds
the standing contract end-to-end** (the no-JS login craft carrying the
explicit guest-cart cookie answers 303 + a session row; overlap-A exactly 1
row at the MAX 2; overlap-B exactly 1 row at the MAX 3; the clamp line at
the captured stock; the survival line; the guest cart row GONE; the cookie
CLEARED on the wire — `aurelia_cart=` in Set-Cookie); **the register-door
merge holds** (the user minted, the merge upserts the cart at exactly the
clamped + survival lines, the guest row GONE); the cookie-less login no-ops
(4 merged lines unchanged); cleanup confirmed.

**Step 6: The spec — GREEN on the correct source**

The F-VV describe appended to `tests/e2e/cart-checkout.spec.ts` (the OWNING
spec — H-8's own file; uniques 15 → 17), TWO request-level cases on the
F-PP no-JS progressive-enhancement wire shape ($ACTION_REF_1/$ACTION_1:0/
$ACTION_1:1/$ACTION_KEY + form fields; the guest cart riding an EXPLICIT
Cookie header on plain Node fetch — the F-RR/F-UU wire facts): **case 1 (the
login door)** asserts the manifest canary + the envelope discrimination, the
craft's sub-400 status (the P2002 canary), the session row server-truth,
overlap-A exactly 1 row at the MAX 2 (user-larger), overlap-B exactly 1 row
at the MAX 3 (guest-larger), the clamp line at the runtime-captured stock,
the survival line, the guest row GONE, the cookie cleared on the wire;
**case 2 (the register door)** asserts the user minted, the merge-upserted
cart at exactly the clamped + survival lines, the guest row GONE, the cookie
cleared (the overlap half is INHERENTLY absent on this door — the cart is
created BY the merge; documented). Budget honored: the fixture email = a
fresh login bucket (the key is ip+email); the register bucket 4/10 per run
(F-GG 2 + F-VV 2). **6/6 GREEN** on the F-VV grep (both projects + setup),
then **36 passed** on the full owning file (17 × 2 + 2 setup), source
byte-identical.

**Step 7: The mutation demos — five surgeries, every half independently
proven RED**

1. **The union drop (guest-wins)**: `Math.max(existing?.quantity ?? 0,
   item.quantity)` → `item.quantity` → REBUILD → **exactly 2 RED** (case 1
   both projects) at the overlap-A MAX-quantity assertion (2 → 1 observed);
   case 2 green.
2. **The union drop (keep-existing mirror)**: `existing ? existing.quantity
   : item.quantity` → **exactly 2 RED** at the overlap-B assertion (3 → 1
   observed) — BOTH directions of the union contract independently gated.
3. **The clamp drop**: the `Math.min(..., stock)` removed → **exactly 4 RED**
   (BOTH cases, both projects) at their clamp assertions (stock+5 observed).
4. **The dedupe-split drop** (blind create): **exactly 2 RED** (case 1) at
   the sub-400 status assertion — the WebServer log shows the raw
   `Unique constraint failed on the fields: (cartId, productId, size)` and
   the LOGIN ITSELF 500s mid-flow (the crash class F-GG named); case 2 green.
5. **The register-door call drop**: `await mergeGuestCartIntoUser(user.id)`
   deleted from registerAction → **exactly 2 RED** (case 2) at the
   merge-upsert assertion (no user cart, the guest row survives); case 1
   green (the login door's call is H-8-pinned).

All restored byte-identical (`git checkout src/lib/cart.ts` +
`src/lib/actions/auth.ts`; `git diff --stat src/` empty) → rebuild → 36/36
green on the owning file.

**Step 8: Round-46 parity census + the mobile-menu ritual**

Reference STILL 503 (eighth round). **46a** (post-restore build, with
shots): **ZERO DRIFT** — desktop 11085/11/444, mobile 11264/1189, drawer
`flex flex-col gap-5 mt-4` + gaps [20,20,20,20] (the v4 mobile-nav pin
holds), console clean. The mobile menu verified end-to-end on the dev server
(rm -rf .next first; env -u DATABASE_URL boot; boot + probe + kill in ONE
foreground command; `scripts/dev-nav-settle-session47.cjs`): burger → drawer
(dialog:1) → overflow hidden → Women → /shop?category=women LANDS (8 cards)
→ closed → overflow restored → zero errors. Dev shots captured
(login/cart/account/admin) + dev-hygiene cleaned the shot's cart row +
canonical 4/12/2/4 re-verified → **46b** (post-dev-rebuild): **ZERO DRIFT**
— byte-identical to 46a.

**Step 9: Screenshots + final gates + docs**

11 screenshots refreshed: **9 byte-identical** (home-desktop,
exclusive-deals, pdp, size-chips, shop-plp, login, account, admin-dashboard,
cart — itself a zero-drift signal); the 2 differing are the documented
timing class, pixel-diff-verified via PIL: clone-mobile-home 799/329,160 px
(0.243%) confined to the y[728..746] hero-carousel strip;
clone-mobile-menu-open 766/329,160 px (0.233%) entirely within the
behind-drawer x[320..390] column — the drawer crop (x<320) byte-identical
(scripts/diff-shots-session51.py + the confine check) — every geometry pin
byte-stable, this round's carousel phase just caught mid-transition. Final
gates on the final tree: typecheck ✓ lint ✓ 173/173 unit ✓ build ✓ E2E
**294 passed + 2 skipped** (148 unique × 2, 7.2m) — the 55th consecutive
fully-green session, exactly the plan's count ledger (146 → 148 unique,
290 → 294 passed). Docs aligned: SKILL v1.44.0 (frontmatter 294/148 + F-VV;
§2 row + the F-VV segment; §11 command 148; Appendix B NEW session-51 row),
README (badge 173+294 + the F-VV pin + 148 ×3 + the Project Status row),
CLAUDE.md (gate line 148 + the F-UU→F-VV chain segment + command 148), PAD
(test table 21|146|290 → 23|148|294 + §7.3 command 148 + the coverage-map
session-51 extension), AGENTS.md (the security line's F-VV segment + the
E2E row 148); `.env.example` unchanged and matching (tracked, verified);
stale-count sweep zero; lint re-run as the last pre-commit step (Trap #28).

**Step 10: Commit + push**

One main-branch commit pushed via the SSH wrapper v3
(`--remote git@github.com:nordeim/luxury-fashion-store.git`), verified on
the remote, key shredded.

**Next named candidates** (carried): the reference outage re-check stays the
FIRST task of the next round if the platform recovers (the full two-sided
sweep + the WOMEN posture); then the documentation class (the PDP og:image
annotation / og:type union / `style-src 'unsafe-inline'` exceptions), or the
real PSP integration. The TOCTOU badge note carries as a documented
observation. The register limiter bucket now consumes 4/10 per run — future
register-driving specs must count before adding.
