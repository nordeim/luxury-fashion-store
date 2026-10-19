# Session 63 — the session-47 round (F-RR: the address seam's IDOR walls — three owner-checks that no gate ever read, pinned through the wire with an explicit-Cookie fetch)

Resuming with the standing directive (the session-46 continuation —
session_61/remediation-plan-session46/session_62/worklog reviewed, the session
numbers advanced by the parallel thread's logs). Per the standing precedent, my
round = the session-47 continuation auditing `aa1eaa8` (the parallel thread's
session-log commit + the skills/ folder removal) plus a full re-verification of
the committed tree. NO workspace reset this round — the standing tree was
intact (node_modules, the canonical `.env`, both DB files, the built
standalone); `git pull` fast-forwarded `16c3f2c → aa1eaa8`.

**Step 1: Workspace refresh + audit of the pulled HEAD**

`git log --name-status aa1eaa8` (path-limited — this sandbox times out
enumerating a 2,612-file tree diff) → TWO changes: `docs/session_62.md` (+85,
the parallel thread's raw narration of the SAME session-46 round — its ledger
matches `16c3f2c`'s actual work; docs-only, RETAINED) and **the `skills/`
folder deleted wholesale** (~2,600 files, −1.38M lines) — the repo-hygiene
follow-through of the standing "excluded from code checking, testing and
compilation" directive; verified zero references from package.json, tsconfig,
eslint, vitest, playwright, and src/ (nothing the build, tests, or runtime
ever read). RETAINED. This round's narration ships as `docs/session_63.md`
(session_62.md taken by the pulled commit).

**Step 2: The reference re-probe — FIRST THING (§12 item 14 of the
session-46 plan)**

The live reference (Base44) answered **HTTP 503 on both `/` and `/login`** at
the round's start — the sessions-44/45/46 outage, now the FOURTH consecutive
round. Re-probed at the census window and once more before the final gates:
**STILL 503** — handled per the honest-outage precedent (the census runs
clone-side ×2; the reference-side fields carry by documentation from the
round-38 live measurement; the WOMEN-inert posture re-check + the 2 ref
screenshots stay deferred; §12 item 13 carried forward).

**Step 3: Baseline gates — re-proven on the standing tree**

typecheck ✓ lint ✓ **173/173 unit (19 files)** ✓ build + assemble ✓ E2E
**280 passed + 2 skipped** (141 unique × 2; 6.3m) — the 48th consecutive
session fully green at baseline, exactly matching session-46's final gates.
The standing Tailwind v4 / mobile-nav pins re-verified first-hand during the
audit (mobile-nav.tsx:76 `flex flex-col gap-5 mt-4`, the `w-80` panel at :59,
26 full `hsl()` literals in globals.css `@theme`). The sandbox quirk honored:
the shell exports a parent-workspace `DATABASE_URL` — every DB-touching
command ran under `env -u DATABASE_URL`.

**Step 4: Fresh audit pass — the seam census outranks the named candidates**

The session-46 plan §12 named the next candidates (the PDP og:image
annotation, the real PSP, npm-audit dev-only) — but the fresh audit pass's
first discipline is the mutation-seam census over the actions surface, and it
found a **HIGH-severity ungated security class**: the address book's three
IDOR owner-walls.

**F-RR — account.ts's three walls**, each
`if (!existing || existing.userId !== user.id) return fail("That address no
longer exists.")`:

| Seam | The ungated shape (the wall dropped) |
|---|---|
| saveAddressAction:91 (edit path) | any signed-in customer OVERWRITES another user's address by id — the attacker's toast reads "Address saved." while the victim's street silently changes (the order-redirection integrity class) |
| deleteAddressAction:112 | any signed-in customer DESTROYS another user's address row (victim data loss) |
| setDefaultAddressAction:122 | any signed-in customer flags the victim's row `isDefault: true` while the attacker's own defaults clear in the same exclusive tx (exclusivity corruption for both books) |

**Wire-blindness (verified)**: the address seam's ONLY spec
(account-addresses.spec.ts, session-5's H-4/H-8 UI case) consumes only the
caller's OWN ids; the action-seam security gate probes the PDP route's four
actions (no address coverage); the account page renders only the caller's
rows (`findMany({ where: { userId: user.id } })`) — the foreign row never
appears in any UI, so the harm is **server-truth-only**, invisible at the
wire surface. The F-DD precedent closed the same class for order details;
the address walls predate it and were never gated. The attack surface is
real: the `/account` route's manifest exposes exactly 8 action ids (read
first-hand), the JSON-arg craft is the action-seam gate's proven shape, and
the saveAddress edit rides the F-QQ multipart shape (Zod BEFORE the wall —
a VALID payload is required to reach it).

**Step 5: Plan-probe discipline (BEFORE the spec) — 14/14**

`scripts/plan-probe-session47.cjs` — the throwaway healthy-copy standalone on
:3209 (the F-PP/F-QQ copyFile pattern). **The round's new wire fact verified
first-hand: authentication rides an EXPLICIT Cookie header on request-level
fetch** — `cookies()` reads the header inside the action exactly as a
browser's automatic attach, so the F-NN mint's HMAC cookie authenticates
crafted POSTs without any browser or storageState. All 14 checks passed:
boot + health; the manifest canary (exactly 8 ids; the three address actions
by exportedName); the cookie-less probes answering the auth wall; all three
walls answering the owner envelope with the victim row surviving
byte-identical; the OWN-id controls proving the same wire shapes write
(edit → street updated, delete → row gone, setDefault → flag flipped — the
false-positive guard); the minted session row surviving (FUTURE expiry, no
inline prune); zero writes outside the copy.

**Step 6: The TDD spec**

NEW describe **"address IDOR walls (F-RR, session-47)"** at the END of
`tests/e2e/account-addresses.spec.ts` (the OWNING spec — the address seam's
own; the file's uniques 1 → 2). ONE request-level case (Node fetch +
explicit Cookie headers — the projects' storageState never rides the probes):
beforeAll mints james's session (FUTURE expiry, +1d) + the ADMIN-owned
victim address (INSERT..SELECT the userId — never hardcoded) + james's own
control address (idempotent delete-then-insert, `frr-`-prefixed); the ladder
— the manifest canary → the auth-wall half → **LOAD-BEARING 1** (the three
walls vs the victim id: delete + setDefault via the JSON-arg shape, the
saveAddress edit via the F-QQ multipart shape — each answers "That address no
longer exists." AND the victim row survives byte-identical server-truth) →
**LOAD-BEARING 2** (the controls: the same shapes vs the OWN id SUCCEED —
the edit writes, the delete removes, the setDefault flips) → the
zero-victim-writes final delta; afterAll deletes the prefix-scoped rows.
**ZERO logins, ZERO registers, ZERO limiter consumption (the address actions
carry none), ZERO writes to any row the gate did not mint.** GREEN **6
passed** (2 uniques × 2 + 2 setups; F-RR ~1.7s on BOTH projects).

**Step 7: THREE mutation demos — the walls independently gated**

Each demo dropped ONE wall's owner-half (the `!existing` null-half stays —
own-id flows lawful), REBUILD → the UI case GREEN on both projects (the
wire-blindness proof) while **exactly the 2 F-RR case-runs failed**:

1. **deleteAddressAction's wall** → failed at the delete-wall envelope
   assertion (line 254 — the crafted delete answered a success stream).
2. **saveAddressAction's edit wall** → failed at the edit-wall assertion
   (line 277) with the delete step GREEN (its wall intact — the ladder
   orders the walls).
3. **setDefaultAddressAction's wall** → failed at the setDefault-wall
   assertion with the delete + edit steps GREEN.

All restored via inverse edit (`git diff --stat src/` EMPTY — byte-identical)
→ rebuild → **6/6 green**. With F-RR every address-book mutation seam's
owner-wall owns a gate.

**Step 8: Round-42 census — the reference outage handled honestly (again)**

**ENVIRONMENT: the LIVE reference (Base44) answered HTTP 503 across every
probe this round** (start, census window, final re-probe — the fourth round).
The census ran **clone-side ×2** (42a on the post-restore build + 42b on the
post-dev-rebuild): **ZERO DRIFT — byte-identical to the round-38/39/40/41
clone-side ledger in ALL census fields**: desktop pageH 11085 / mainKids 11 /
footerH 444, mobile pageH 11264 / mainKids 11 / footerH 1189, the drawer
char-identical (`w-80` + `flex flex-col gap-6` + `flex flex-col gap-5 mt-4`
+ gaps [20,20,20,20]) — **the v4 mobile-nav pin holds**; clone console clean
both censuses.

**The clone's mobile menu verified end-to-end on the dev server** (`rm -rf
.next` first; `env -u DATABASE_URL` boot; the sandbox's detached-process-group
kill honored — boot + probe + kill in ONE foreground command): burger →
drawer (dialog:1) → overflow hidden → **Women → `/shop?category=women`
NAVIGATION LANDS (8 product cards rendered)** → menu closed → overflow
restored → zero console/page errors. **A harness note, not a product bug**:
the session-38 probe's fixed 800ms post-click wait raced the dev soft-nav in
this slower sandbox (the drawer closed but the URL hadn't moved within the
window) — `scripts/dev-nav-settle-session47.cjs` (the round's settle probe)
waits the URL explicitly (10s bound) and lands the navigation every time;
the production standalone's navigation stays pinned green by
mobile-navigation.spec.ts. 11 screenshots refreshed; 13 of 15 byte-identical
to the committed versions (the 2 differing — clone-mobile-home,
clone-mobile-menu-open — are the documented timing-dependent class); the dev
cart's row cleaned, canonical 4/12/2/4 re-verified.

**Step 9: Final gates + docs**

typecheck ✓ lint ✓ 173/173 unit (19 files) ✓ build + assemble ✓ E2E **282
passed + 2 skipped** (142 unique × 2; 6.4m) — the 48th consecutive
fully-green session, exactly the plan's count ledger (141→142 unique,
280→282 passed). Docs aligned: SKILL v1.40.0 (frontmatter 282/142 + F-RR;
§2 E2E row + F-RR; §11 command 142; Appendix B NEW session-47 row), README
(badge 173+282 + the F-RR pins + counts 142), CLAUDE.md (gate line 142 +
the F-QQ→F-RR chain + the NEW F-RR segment + commands 142), PAD (test table
18|142|282 + §7.3 command 142 + the coverage-map session-47 extension),
AGENTS.md (the security line's F-RR gate + the E2E command row 142),
`docs/remediation-plan-session47.md` (the plan + this execution record),
worklog, this log; `.env.example` unchanged and matching; stale-count sweep
zero.

**Step 10: Commit + push (main only)**

One main-branch commit (test-only round — zero `src/` changes in the final
tree; the artifacts: the F-RR describe + the plan + the two probe scripts +
the refreshed screenshots + the five-docs alignment + the worklog + this
log) pushed via the SSH wrapper v3 with `--remote
git@github.com:nordeim/luxury-fashion-store.git`, verified on the remote,
key shredded.
