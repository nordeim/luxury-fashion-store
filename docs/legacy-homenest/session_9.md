Workspace exists with a clean tree. Let me pull the latest and check the log.
The remote has advanced considerably — my earlier R3 work was committed (`934c1f9`, `b573788`, `2f42666`), and sessions 4–7 have since landed. The pull brought in `docs/session_7.md`. Now let me review the key documents.
Sessions 5–7 are complete and pushed. Now let me read the remediation plan and worklog to identify remaining open items.
Session 5's work is fully pushed (`35f676f`). The remediation plan is at 100% with §11.5 listing next candidates. The user's brief adds a **new explicit workstream: Sitemap implementation & SEO optimization** (referencing the ecommerce-store template). Let me review the worklog and root docs, then validate the codebase.
Worklog reviewed (Tasks 1–10 = sessions 1–5). Now let me review the root docs quickly and validate the codebase state — especially the new SEO/sitemap workstream from this session's brief.
Current SEO state is minimal (title + description only, no robots.txt/sitemap/OG). Let me check the ecommerce-store template's reference SEO implementation and the current public/ folder.
The template (Next.js) implements SEO via `sitemap.ts`, `robots.ts`, rich root metadata, and per-page metadata. Our clone is a **Vite SPA** (vite-plugin-singlefile), so this needs adaptation: static `public/robots.txt` + `sitemap.xml`, head enrichment in index.html, and a per-route head manager. Let me check the template's remaining SEO pieces and our repo's public/ structure.
The template's SEO pattern is fully decoded. Now let me examine our SPA's structure to plan the adapted implementation.
Key finding: **the SPA never updates `document.title` per route** — no robots.txt, no sitemap, no OG tags, no JSON-LD. This is the session's new workstream. Let me check the routes, vitest config, and remaining docs.
Full route table captured. Let me now skim the root docs to complete the mandated review phase.
The full picture is validated. Now let me set up the session plan and check the skills catalog for relevant skills.
Now the baseline gate. Let me run typecheck + unit first, and consult the skills catalog for audit/SEO-relevant skills in parallel.
Baseline: typecheck ✓ · 33/33 unit ✓. Relevant skills identified (`tdd-workflow`, `webapp-testing`, `agent-browser`, `code-review-and-audit`). Now build + full E2E baseline.
**Baseline fully green: typecheck ✓ · 33/33 unit ✓ · build 499 KB ✓ · 144/144 E2E ✓** — matches the session-5 ledger exactly. Now the mandated live reference re-sweep, including a probe of the reference's SEO head shape (directly informs the R8 work). Loading the agent-browser skill:
Now probing the reference site's SEO head shape (title, meta, OG, canonical, robots, sitemap, favicon):
The reference's SEO shape is decoded — it ships a **per-route title map** inline. Let me get the full map and check robots/sitemap/manifest:
Title map fully decoded — including quirks (`/track-order` → "Order Tracking", "Terms **Of** Service"). Now checking the reference's robots/sitemap/manifest:
Reference SEO fully decoded. Key findings: robots.txt exists (but fails to disallow private surfaces — a reference-side mistake), sitemap has 22 static URLs (no PDP URLs, wrongly includes /admin/*), manifest is broken (302), per-route title map confirmed with quirks. Our clone can be a genuine SEO superset. Let me check our logo assets, then do the mobile-menu spot re-check:
No local logo — I'll follow the ecommerce-store template's FAVICON-1 precedent (remote-CDN logo pin). Now the mandated mobile-menu spot re-check on the reference:
Panel pins re-confirmed live (`rgba(255,255,255,0.8)`, no shadow, `1px` bottom border). Now the trigger + row metrics:
Only one row matched — likely a polluted selector (the documented hidden-desktop-nav trap). Re-measuring precisely within the open panel:
I clicked the cart (navigated to /cart) — the hamburger sits after it (trailing-edge pin). Back home, clicking the correct trigger:
All row pins re-confirmed (14px/500, muted `rgb(126,111,103)`, 44px, 12px radius). Two final probes — active row bg + search pill:
**Sweep-8 verdict: no visual drift** — all menu pins held (panel `white/80` shadowless, bare dark trigger, 14px/500 rows, 12px active radius on the primary orange, white active text). The search-pill pin stands per session-5's fresh measurement (my div-only probe can't see it). The reference's SEO shape is fully decoded, and our clone can be a genuine SEO superset (reference robots fails to disallow private routes; its sitemap wrongly lists `/admin/*` and lacks all PDP URLs; its manifest 302s).

Updating todos, then starting TDD. First, the integration points:
Now writing the RED unit tests. Let me check existing test conventions first:
Conventions clear. Writing the RED unit tests — `tests/seo.test.ts` (route-meta seam) and `tests/sitemap.test.ts` (robots/sitemap artifacts):
**RED confirmed** (module doesn't exist). Now GREEN — first `src/lib/seo.ts`, the pure route-meta seam:
Now the sitemap/robots generator script:
**Unit GREEN: 62/62** (33 existing + 29 new pins). Artifacts generated: 12 static + 24 product URLs. Wiring the prebuild hook:
Now the E2E spec for the dynamic head layer (RED against the current build). Let me check App.tsx's structure first:
Fixing a quote error I introduced in the OG loop:
Confirming the E2E spec is RED against the current build (build + only the new spec):
RED confirmed exactly as designed (artifacts GREEN, head tests RED). Before writing the HeadManager, I need to check the auth/cart gates — `/account`, `/admin`, `/checkout` may redirect when unauthenticated/empty, which affects which titles E2E can observe:
`/admin` redirects to /login when unauthenticated — that E2E title case must go (stays pinned in the unit seam). Checking component-layer import conventions before writing HeadManager:
Components import `@/data/catalog` directly (chrome.tsx precedent) — HeadManager can too. Writing the GREEN implementation:
Now wire HeadManager into App.tsx and enrich index.html:
Now enrich index.html with the full static head set (measured reference shape):
Type error in HeadManager — `getElementById` returns `HTMLElement`, need an `HTMLScriptElement` cast:
All unit layers green (95/95) and the build grew to 506 KB with the head layer. Now the E2E spec against the fresh build:
Only test 17 fails now (45.7s — smells like a locator/networkidle timeout). Inspecting:
The file got mangled again — `'aref^=...'` lost its `a[h`. Fixing:
The disk content is actually correct now (`a[href^="/products/"]`) — earlier displays were stale. Re-running the failed test:
Something is mangling `a[h` on read paths. Let me check and fix definitively via python:
Python confirms the corruption is real on disk. Definitive fix with clean quoting:
Playwright still sees the old content despite verified disk state — transform cache. Clearing it and verifying bytes immediately before the run:
The file keeps getting re-corrupted — the literal sequence `a[href` is being eaten in this file. Workaround: use the attribute-only selector (valid CSS, no `a[h` sequence):
The mangler eats the adjacent pair `[h` on write. Bypassing it with string concatenation so that sequence never appears in source:
Replace didn't match. Let me do a surgical line-index rewrite instead of pattern matching:
Line 66 fixed and stable. Checking the client-nav click selector:
The call-log display itself mangles `[h` — the locator is actually fine. The real issue: no element matches, meaning product cards likely link via `/product/{id}` (reference shape), not `/products/{slug}`. Checking:
Product cards use `/product/{id}` (reference shape) — my selector assumption was wrong, and the mangler also explains the display. Rewriting the spec fully via python heredoc with concat-built selectors:
**19/19 GREEN.** Full E2E suite now (both projects, all 111 specs):
Mobile nav hides the desktop `/products` link — the repo's established fix is the fixed-viewport pattern (as in `search-keyboard.spec.ts`). Applying:
All 38 SEO specs pass. Final full-suite confirmation:
**Full gate: 182/182 E2E** (91 specs × 2 projects, up from 144). Updating todos and running the complete verify chain:
Complete ledger green. Now session screenshots — checking the existing capture script:
4 captures saved, but the menu-open PNG is suspiciously small (12 KB). Verifying visually:
The script clicked the cart (same trap as my sweep). Checking the real trigger's accessible name:
Menu capture is perfect — all parity pins visible (white/80 panel, muted pill, orange active row, bare dark X). Checking the PDP capture:
All captures verified. Killing the preview and moving to the documentation phase:
Now the documentation phase. Starting with `.env.example`:
Now the remediation plan §12 addendum:
Now `docs/session_8.md` — the session record:
Now the PAD updates. Locating the sections:
Applying all PAD edits:
PAD aligned. Now AGENTS.md:
Now CLAUDE.md and README.md:
Now CLAUDE.md:
Now SKILL.md — bump to v1.3.0:
Adding the SEO pattern to SKILL.md's body (§15 patterns + §11 checklist):
SKILL.md complete. Now the worklog entry:
Now the final pre-push gate per the repo contract, then staging:
**Pre-push gate fully GREEN.** Staging atomic commits:
Three atomic commits staged on main. Now the SSH wrapper push — re-reading the wrapper procedure first:
Fingerprint matches the previously verified key. Dry-run, then the real push:
No real ssh binary — deploying the paramiko shim from Appendix A outside the repo:
Assembling the shim outside the repo:
Dry-run clean (fast-forward `35f676f..ab202dc`). Real push:
Push verified — remote `refs/heads/main @ ab202dc` equals local HEAD. Shredding the operator key and final verification:
## Session 8 complete — pushed to `main @ ab202dc`

**Validation:** pulled `35f676f` (sessions 5–7 records), re-validated the full doc suite against the code, and reproduced the baseline gate exactly (144/144 E2E).

**Live re-sweep:** no visual drift for the first time in four sweeps — every mobile-menu pin held.

**New workstream (SEO/Sitemap):** decoded the reference's head shape live, then built the superset via TDD — generated `robots.txt` + `sitemap.xml` (24 product URLs; private surfaces excluded, unlike the reference), per-route titles/canonicals/OG-Twitter, and Organization/WebSite/Product JSON-LD.

**Final gate:** typecheck ✓ · 95/95 unit ✓ · build 506 KB ✓ · **182/182 E2E** ✓ · 3 atomic commits · remote ref verified · key shredded.

**Next steps:** review `docs/remediation-plan.md` §12 on GitHub; remaining open items are the server-backed auth workstream, `aria-live` combobox announcements, and the ESLint flat config — and keep re-sweeping the reference before any menu-touching change.
