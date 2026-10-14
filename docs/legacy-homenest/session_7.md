Working tree is clean and session-4 work has been committed and pushed. Now let me pull the latest and review the docs — especially the new `docs/session_4.md` and `docs/session_5.md` instructions.
Pull brought in `docs/session_5.md` — the new instruction set. Let me read it plus session_4.md and the current remediation plan.
Session 4 is confirmed complete and pushed (`3ce3933`, plus `ab7830c` which added the session_5.md transcript). This is **Session 5**. Let me set up the plan and review the full document suite.
Baseline green (typecheck ✓, 25/25 unit ✓). Let me read the rest of the remediation plan — especially §9.6 and §10 (session-4 addendum) with next-session candidates.
Full picture established. Now let me review the worklog and root docs to complete the document review phase.
文档审查已完成。第 5 次会话的任务已由 §10.5 明确：**(1)** 改进 demo-auth 安全态势（F-10 最大的开放项），**(2)** 强制性参考重新扫描，**(3)** 桌面搜索组合框键盘导航。让我审核相关代码区域，在做出决定前评估每个候选项。
Confirmed F-10: passwords are stored and compared as plaintext. Let me examine the remaining seams — demo users, desktop search, login call sites, and toast semantics — before finalizing the session plan.
Desktop search confirmed: combobox semantics exist but zero keyboard navigation (no `onKeyDown`, no `aria-activedescendant`, no `aria-selected`). Now the auth call sites and toasts:
All seams confirmed. Let me consult the skills catalog per the audit methodology, then finalize the plan.
Audit complete. The plan for **Session 5** is now finalized:

| ID | Item | Source |
|---|---|---|
| R5-01 | Client-side password hashing (WebCrypto SHA-256 + CSPRNG salt, upgrade-on-login, hashed demo seeds, `homenest.v4` key bump) | §10.5.1 / F-10 partial remediation |
| R5-02 | Desktop search combobox keyboard navigation (Arrow keys, `aria-activedescendant`, Enter/Escape) | §10.5.3 |
| R5-03 | Mandatory live reference re-sweep (§10.5.2 — reference visuals drift between sweeps) | §10.5.2 |
| R5-04 | Extend axe structural gate to `/checkout` + `/contact` (coverage gap) | audit finding |
| R5-05 | Docs alignment, screenshots, worklog, atomic commits, SSH push | standing |
Starting with **R5-03: the live reference re-sweep**. Loading the agent-browser skill:
The reference shows "Sale Up to 40% Off" and different headings — potential drift! Let me verify the viewport actually applied and capture the current state:
The screenshot confirms the canonical mobile home (slide 1 "Elevate Your Kitchen", trailing hamburger) — but the evals returned inconsistent headings. Let me re-measure carefully to determine whether the reference serves varying content:
The DOM genuinely changed after the screenshot — the reference serves varying content. Let me reload and measure fresh:
Mystery solved — the reference's carousel **auto-rotates and each slide title becomes the h1** ("Elevate Your Kitchen" → "New Arrivals" → "Sale Up to 40% Off"). No site redesign; the transient readings were mid-rotation. Canonical resting state matches our pin. Now the critical menu re-measurement:
Panel re-measured: `rgba(255,255,255,0.8)`, no shadow, `1px solid rgba(229,224,220,0.5)` bottom border — consistent with session-4 pins. Now the search pill and row metrics:
**DRIFT FOUND (R5-03 finding)!** The reference's menu rows now show `border-radius: 9999px` (full pill) — session 4 measured and pinned **12px**. The reference's resting visuals changed for the third consecutive sweep. Let me confirm precisely:
False alarm — the 9999px rows are the **hidden desktop nav** (display:inline, zero-size) still in the DOM. The actual mobile menu rows (display:block, 44px tall, `12px 16px` padding, `mt 4px`) measure **12px radius** — session-4 pins hold. Let me confirm the row colors and capture the menu view:
The live capture confirms all session-4 menu pins (muted search pill, 12px active row, white/80 panel, no dim, hero ghosting through). Let me verify the X toggle style and run a desktop spot-check to close the sweep:
X button now measures **transparent bg, dark icon** — session 3 pinned a "green circle X". Potential drift. Let me check our exact spec pin and the prior measured value:
The green disc lives on the **inner span** (the button is transparent) — my measurement looked at the wrong element. Re-measuring the reference's span:
The reference's close button has **no inner span anymore** — the green disc is gone. Let me visually confirm with a header screenshot:
**Confirmed drift**: the reference's close toggle is now a plain dark X on a transparent button — the green disc (session 3/4 pin) is gone. Per the follow-the-latest-measurement doctrine, the clone must be updated. Let me check the closed-state hamburger too:
Both states are now plain dark icon buttons. Quick desktop spot-check to complete the sweep:
Desktop pattern unchanged (full-pill orange active link). **R5-03 sweep complete — one drift found**: the green close disc. Closing the browser and starting TDD. First, let me look at our current close-button implementation:
The clone renders the green disc (`bg-accent` span). Now let me write the RED specs. First, the updated close-button pin in the mobile-navigation spec:
Spec updated (RED against current green-disc build). Now let me examine the search overlay's current keyboard behavior before writing the R5-02 spec:
Let me view the desktop search trigger area to understand visibility rules:
Desktop-only overlay confirmed. Writing the R5-02 RED spec for combobox keyboard navigation:
Fixing the URL regex escape in the spec, then verifying "bowl" matches our catalog:
Now R5-01 (password hashing). Checking the User type, vitest include patterns, and DEMO_USERS shape:
Now I have the full R5-01 picture. Let me check the current storage key and registry state (I also spotted AGENTS.md says `homenest.v2` — possible drift):
More drift found: **user-visible copy hardcodes `homenest.v1`** in content-pages.tsx (×2) and admin-pages.tsx, while the real key is v3 (docs say v2). All will be fixed this session. Writing the R5-01 unit test first (RED):
Now the E2E RED spec for password hashing, following the existing auth spec patterns:
The legacy fixture must use the real pre-session-5 shape (`password` field). Fixing:
Now R5-04: extending the axe gate. Let me review the a11y-smoke structure and checkout flow recipe:
Adding the two R5-04 tests to the a11y smoke spec:
All RED specs written. Building the current code to confirm RED:
RED confirmed across all fronts. Quick unit RED check, then GREEN implementation:
Unit RED confirmed. Now GREEN — starting with the password module:
8/8 unit GREEN. Now the store — reading the auth sections:
Now implementing the store auth changes:
Now the account-pages call sites — reading the submit handler:
Now generating the demo seed hashes with a persisted script:
Now the storage-key bump and registry update. Checking how the hash test computes the digest:
Registry gate GREEN. Now the hardcoded storage-key copy fixes:
Now the chrome.tsx changes — trigger fix + combobox keyboard navigation:
Now implementing the combobox keyboard navigation and the trigger fix in chrome.tsx:
Now the trigger markup (green disc removal) and the search overlay markup (combobox wiring):
All implementations in place. Running typecheck + unit + build:
Unit 33/33 GREEN, but my React `KeyboardEvent` import shadows the DOM type used by the menu modal handler. Fixing:
All GREEN. Now the full E2E gate across both projects:
The race: `logout()` + `navigate("/")` followed immediately by a full-reload `goto` can outpace the persist effect, so the reloaded app restores the session and /login bounces to /account. The test must wait for the logged-out UI:
The screenshot reveals a **real mobile layout bug**: the Log out button is clipped at the right viewport edge — the account header card overflows on 390px. Let me confirm with a live measurement:
Confirmed root cause: the inner identity block lacks `min-w-0`/word-breaking, so long names/emails push the Log out button off-viewport on phones. This is a real production bug (R5-06). Writing the RED spec first:
RED confirmed. Now the GREEN fix — wrap the header row and let the identity text break:
**Full gate GREEN: 144/144 E2E.** Now the session-5 screenshots. Checking the existing capture script:
Both captures confirm the session-5 changes beautifully. Now the documentation phase. Let me review the doc anchors:
All anchors mapped. Now the PAD updates:
Now the remediation-plan §11 addendum:
Now AGENTS.md, CLAUDE.md, and README alignment:
Now writing the session record and worklog entry:
All docs aligned. Final pre-push gate per the wrapper contract:
Pre-push gate fully GREEN. Now staging the atomic commits:
Three atomic commits staged on main. Now the SSH wrapper push — re-reading the wrapper procedure first:
Fingerprint matches the previously verified key. Dry-run first, remote explicit:
Push verified — remote `refs/heads/main @ 84b8191` equals local HEAD, key shredded, tree clean. Closing out:
## Session 5 Complete — pushed to `main @ 84b8191`

**Validation** — Session-4 state confirmed (`ab7830c` + the continuation transcript); full doc suite re-validated against the code; baseline gate green.

**Live re-sweep** (the §10.5.2 mandate — the reference's resting visuals have now changed in *three* consecutive sweeps):
- Explained the carousel quirk: it auto-rotates and the active slide title becomes the page `h1` — sweeps must read slide 1 on load
- Re-confirmed every session-4 menu pin (white/80 panel, muted search pill, 14px rows, 12px active radius, no dim)
- **Caught real drift**: the reference dropped its green close disc — the trigger is now a bare dark icon in both states

**TDD follow-ups executed** (red → green):
- **R5-01**: passwords hashed at rest — salted WebCrypto digests (`src/lib/password.ts`), async auth, upgrade-on-login for legacy records, pre-hashed demo seed, `homenest.v3 → v4` (registry gate verified) — downgrades F-10 honestly (SHA-256 is not a KDF; server workstream stays open)
- **R5-02**: desktop search is a full APG combobox — arrows wrap, Home/End, Enter selects, Escape dismisses
- **R5-04/05/06**: axe gate extended to checkout + contact (8 surfaces); stale `homenest.v1` copy fixed; and a **real bug caught by the new specs** — the account header overflowed on phones, clipping the Log out control

**Final gate:** typecheck ✓ · 33/33 unit ✓ · build (499 KB) ✓ · **144/144 E2E** ✓ · 3 atomic commits · remote ref verified · key shredded.

**Suggested next steps:** review remediation plan §11 on GitHub; the remaining big-ticket item is still the server-backed auth workstream; keep re-sweeping the reference before any menu-touching change (it drifted three sweeps running).
