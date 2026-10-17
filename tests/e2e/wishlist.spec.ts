// Wishlist — heart toggle on cards, drawer/page reflection, remove.
//
// Session-34 extension (F-EE — the guest wishlist merge gate): the describe
// at the bottom of this file. The dbRead/sqlRun helpers mirror the
// account-orders spec's proven shapes: spawnSync ARGV arrays (trap #34 — no
// shell, no `$` expansion) against the E2E DB the webServer boots (the
// absolute file: URL pinned explicitly so the helpers never depend on the
// shell's env).
import { spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const REPO = process.cwd();
const SCHEMA = path.join(REPO, "prisma", "schema.prisma");
const E2E_DB_URL = `file:${path.join(REPO, "db", "e2e.db")}`;
const SQL_SCRATCH = path.join(REPO, "tests", "e2e", ".f-ee-wishlist.sql");

/** Read rows through Prisma on the E2E DB (the action-seam helper's shape). */
function dbRead(jsonExpression: string): string {
  const script = `const {PrismaClient}=require("@prisma/client");const p=new PrismaClient({datasources:{db:{url:"${E2E_DB_URL}"}}});(${jsonExpression})(p).then(r=>{console.log("<<JSON>>"+JSON.stringify(r));return p.$disconnect()}).catch(e=>{console.error(e.message);process.exit(1)})`;
  const res = spawnSync("node", ["-e", script], {
    cwd: REPO,
    env: { ...process.env, DATABASE_URL: E2E_DB_URL },
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  if (res.status !== 0) throw new Error(`dbRead failed: ${res.stderr?.slice(0, 300)}`);
  const marker = (res.stdout ?? "").indexOf("<<JSON>>");
  if (marker < 0) throw new Error(`dbRead produced no JSON: ${(res.stdout ?? "").slice(0, 200)}`);
  return res.stdout.slice(marker + "<<JSON>>".length).trim();
}

/** SQL fixture helper — the established `prisma db execute` pattern (H-2/M-1). */
function sqlRun(sql: string): void {
  writeFileSync(SQL_SCRATCH, sql);
  try {
    const res = spawnSync(
      "npx",
      ["prisma", "db", "execute", "--schema", SCHEMA, "--file", SQL_SCRATCH],
      {
        cwd: REPO,
        env: { ...process.env, DATABASE_URL: E2E_DB_URL },
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
      },
    );
    if (res.status !== 0) throw new Error(`sqlRun failed: ${res.stderr?.slice(0, 300)}`);
  } finally {
    try { unlinkSync(SQL_SCRATCH); } catch { /* already gone */ }
  }
}

function wishlistRowByToken(token: string): { exists: boolean } {
  const rows = JSON.parse(
    dbRead(`(p)=>p.wishlist.findMany({where:{token:${JSON.stringify(token)}},select:{id:true,userId:true},take:1})`),
  );
  return { exists: rows.length > 0 };
}

function deleteWishlistRow(token: string): void {
  sqlRun(`DELETE FROM "Wishlist" WHERE "token" = '${token}';`);
}

const loggedOut = { storageState: { cookies: [], origins: [] } };

test.describe("wishlist", () => {
  test("adding from the PDP reflects on the wishlist page", async ({ page }) => {
    // The PDP wishlist CTA is always visible (card hearts are hover-revealed).
    await page.goto("/product/silk-draped-evening-gown");
    // Scope to main: related ProductCards also carry wishlist-labeled hearts.
    const wishBtn = page.locator("main").getByRole("button", { name: /wishlist/i }).first();
    // Suite shares one DB: the seeded user may already hold this piece.
    // Normalize to "not in wishlist" first, then add.
    if ((await wishBtn.textContent())?.match(/In Wishlist/i)) {
      await wishBtn.click();
      await expect(wishBtn).toHaveText(/Add to Wishlist/i, { timeout: 10_000 });
    }
    await wishBtn.click();
    await expect(wishBtn).toHaveText(/In Wishlist/i, { timeout: 10_000 });

    await page.goto("/wishlist");
    await expect(page.getByTestId("wishlist-grid")).toBeVisible();
    await expect(page.getByTestId("wishlist-grid").getByRole("link").first()).toBeVisible();
  });
});

// H-38 (session-6): the empty-state test runs in its OWN describe on a
// logged-out context — a cookie-fresh guest wishlist is empty, so the
// guidance branch is asserted deterministically (the old variant ran on the
// project session right after the add test: grid visible + `if` without
// else = vacuous green).
test.describe("wishlist (empty state)", () => {
  test.use(loggedOut);

  test("empty wishlist shows guidance", async ({ page }) => {
    await page.goto("/wishlist");
    const grid = page.getByTestId("wishlist-grid");
    if (await grid.isVisible().catch(() => false)) {
      // Defense-in-depth: if a run ever leaks wishlist state into a fresh
      // guest context, fail loudly instead of passing vacuously.
      throw new Error("guest wishlist should be empty — transient-state leak");
    }
    await expect(page.getByText("Nothing saved yet")).toBeVisible();
    await expect(page.getByRole("link", { name: /Discover the Collection/i })).toBeVisible();
  });
});

// Guest wishlist merge gate (session-34, F-EE).
//
// mergeGuestWishlistIntoUser (src/lib/cart.ts) had ZERO coverage on both
// layers — no unit file references it, no spec ever exercised it — while its
// sibling cart merge IS wire-pinned (cart-checkout.spec.ts "guest bag
// survives sign-in"). The seam runs at BOTH auth doors (loginAction
// auth.ts:45, registerAction auth.ts:124) and carries source-declared
// contracts: the H-29 one-transaction merge, the G-5 cookie-cleared-only-
// after-work rule ("the cookie is the browser's only reference to the guest
// list"), the dedupe union (wishlistId_productId upsert), the guest-row
// deletion, and the no-guest-cookie guard. A broken merge silently drops a
// guest's saved pieces at the exact moment they become a member.
//
// Limiter arithmetic (measured this round — see SKILL §9 #23 and the
// session-34 plan §4): rateLimit() consumes on CALL, so the wrong-password
// case counts; without TRUST_PROXY every client is "local" (one shared IP
// bucket per key family). The james@example.com login key is EXACTLY
// consumed at 10/10 per run (2 setup + 2 cart-merge + 2 wrong-password +
// 2 logout-throwaway + 2 security-csp) — a new james login would 429
// mid-run. This case therefore NEVER logs james or admin in: it registers a
// run-unique account (register bucket: 4 existing + 1/project = 6 < 10),
// signs out, hearts a piece as a guest, then logs back in as the FRESH user
// — whose email is a FRESH per-email limiter key (1 of 10 used). james's
// and admin's buckets stay exactly consumed.
//
// H-24 posture: NOTHING to clean — the fresh user and its wishlist are
// run-scoped (a fresh email every run; global-setup wipes wishlists at
// every run start anyway); no canonical row is touched.
//
// The case enters through BOTH doors: the register (no guest cookie) pins
// the no-op guard `if (!token) return`; the login (guest cookie present)
// pins the real merge. The dedupe half (update: {}) stays covered-by-shape —
// the fresh user's list is empty at login, so the create half is what runs
// deterministically (the same posture the cart-merge pin takes).
test.describe("guest wishlist merge (F-EE, session-34)", () => {
  test.use(loggedOut);

  test("a guest's saved pieces survive becoming a member (mergeGuestWishlistIntoUser)", async ({ page }) => {
    test.setTimeout(60_000);
    const email = `e2e-merge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

    // 1) Register with NO guest cookie — the register-door merge no-ops and
    //    the fresh user's wishlist stays empty.
    await page.goto("/register");
    await page.getByLabel("Name").fill("E2E Merge");
    await page.getByLabel("Email").fill(email);
    await page.locator("#password").fill("MergeTest123");
    await page.locator("#confirmPassword").fill("MergeTest123");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/account/, { timeout: 15_000 });

    // 2) Sign out — back to the storefront as a guest.
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });

    // 3) Guest heart toggle on the distinctive product (hearted by NO other
    //    spec — the cart merge uses wide-brim-felt-hat for CART state only).
    //    Normalize first: the suite shares one DB.
    await page.goto("/product/wide-brim-felt-hat");
    const wishBtn = page.locator("main").getByRole("button", { name: /wishlist/i }).first();
    if ((await wishBtn.textContent())?.match(/In Wishlist/i)) {
      await wishBtn.click();
      await expect(wishBtn).toHaveText(/Add to Wishlist/i, { timeout: 10_000 });
    }
    await wishBtn.click();
    await expect(wishBtn).toHaveText(/In Wishlist/i, { timeout: 10_000 });

    // 4) The guest cookie carries the declared 192-bit hex token — capture
    //    it for the server-truth witness below.
    const guestToken = (await page.context().cookies()).find(
      (c) => c.name === "aurelia_wishlist",
    )?.value;
    expect(guestToken, "the guest wishlist cookie mints").toBeTruthy();
    expect(guestToken).toMatch(/^[0-9a-f]{48}$/);
    const guestRow = wishlistRowByToken(guestToken!);
    expect(guestRow.exists, "the guest Wishlist row is real (userId null)").toBe(true);

    try {
      // 5) Login as the fresh user through the real form — the LOGIN door
      //    runs mergeGuestWishlistIntoUser with the guest cookie present.
      await page.goto("/login?redirect=/wishlist");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill("MergeTest123");
      await page.getByRole("button", { name: /sign in/i }).click();
      // Pathname predicate: /wishlist/ alone matches the ?redirect= QUERY
      // on the pre-navigation /login URL (the plan-probe's first-draft bug).
      await page.waitForURL((u) => new URL(u).pathname === "/wishlist", { timeout: 15_000 });

      // 6) The merged item renders — and PERSISTS a reload (server truth:
      //    the merge wrote real rows, not a client-side echo).
      const grid = page.getByTestId("wishlist-grid");
      await expect(grid).toBeVisible();
      await expect(grid.locator("a").first()).toHaveAttribute("href", /wide-brim-felt-hat/);
      await page.reload();
      const gridAfter = page.getByTestId("wishlist-grid");
      await expect(gridAfter).toBeVisible();
      await expect(gridAfter.locator("a").first()).toHaveAttribute("href", /wide-brim-felt-hat/);

      // 7) The G-5 visible half: the wishlist cookie is CLEARED from the jar
      //    post-login (on the success path it is always gone).
      const cookieAfter = (await page.context().cookies()).find(
        (c) => c.name === "aurelia_wishlist",
      );
      expect(cookieAfter, "aurelia_wishlist cleared post-login").toBeUndefined();

      // 8) The cleanup half: the guest Wishlist row is GONE by the captured
      //    token (deleted by the merge).
      expect(wishlistRowByToken(guestToken!).exists, "the guest row is deleted").toBe(false);
    } finally {
      // H-24: the guest row may outlive a mid-case failure (the G-5 rule
      // keeps the cookie alive on failure BY DESIGN) — drop it by token so
      // a failed run never leaks rows past its own context.
      if (guestToken) deleteWishlistRow(guestToken);
    }
  });
});

// Guest wishlist merge DEDUPE half (session-36, F-GG).
//
// The F-EE gate pins the merge's CREATE half — its fresh user's list is
// empty at merge time, so only the create branch runs deterministically
// (the F-EE header says so verbatim). The DEDUPE half — the per-item
// upsert's `update: {}` branch (src/lib/cart.ts) — fires when the guest
// cookie holds a piece the user's list ALREADY has, and no gate exercised
// it (carried session-32 §8 → 34 §8 #2 → 35 §8 #3, the session-35 plan's
// "strongest remaining candidate"). The regression class the pin guards:
// the upsert rewritten as a blind create → the @@unique([wishlistId,
// productId]) constraint throws inside the H-29 transaction → the merge
// propagates → the LOGIN DOOR BREAKS for any returning member who hearted
// a piece before signing up — the exact P2002-across-the-seam bug class
// the sibling toggle action's F-3 comment documents as having shipped
// before (session-3).
//
// Assertion design: getWishlistDto reads through a `new Set(...)` — the
// wishlist PAGE can never render a duplicate even with duplicated rows,
// so the DOM count is SUPPORTING evidence only; the LOAD-BEARING
// assertion is the server-truth dbRead count (wishlistItem rows for the
// user's wishlist × the product == 1) plus the merge COMPLETING (the
// login lands — a crash here means the redirect never happens).
//
// Limiter arithmetic (the F-EE header's measured shapes, SKILL §9 #23):
// the register bucket was 4 existing + 1/project = 6 < 10 after F-EE;
// F-GG adds 1/project → 8 < 10 (ONE more register-per-project case fits
// before the shared "local" bucket saturates). The login door uses the
// fresh email's OWN per-email key (login:${ip}:${email}) — 1 of 10.
// logoutAction carries no limiter. james's and admin's buckets stay
// exactly consumed (10/10) — this case NEVER logs a canonical account in.
//
// H-24 posture: NOTHING canonical to clean. The fresh user is `e2e-*@
// example.com` (the wipe list's exact predicate) — run-scoped; the user-
// side heart is UI-minted (ZERO SQL fixtures for the state itself — the
// register door auto-logs-in, the toggle runs on the real session); the
// guest row is deleted by the merge on success and dropped by token in
// the finally on mid-case failure; global-setup wipes wishlists at every
// run start anyway. `cashmere-overcoat` is the round's piece: order
// fixtures reference it, but NO wishlist spec hearts it (the gown is the
// first wishlist case's piece on james's session; the hat is F-EE's guest
// piece and the cart merge's CART-state piece).
test.describe("guest wishlist merge dedupe half (F-GG, session-36)", () => {
  test.use(loggedOut);

  test("a login whose guest piece is ALREADY on the user's list completes the merge without duplicating (F-GG)", async ({ page }) => {
    test.setTimeout(90_000);
    const email = `e2e-dedupe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const SLUG = "cashmere-overcoat";

    // 1) Register with NO guest cookie — the register door auto-logs-in
    //    (createSession + redirect), so the pre-load heart needs ZERO
    //    logins. The register-door merge no-ops (no cookie).
    await page.goto("/register");
    await page.getByLabel("Name").fill("E2E Dedupe");
    await page.getByLabel("Email").fill(email);
    await page.locator("#password").fill("DedupeTest123");
    await page.locator("#confirmPassword").fill("DedupeTest123");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/account/, { timeout: 15_000 });

    // 2) PRE-LOAD through the REAL UI: heart the coat as the SIGNED-IN
    //    user — the user's list now holds the piece BEFORE the merge.
    await page.goto(`/product/${SLUG}`);
    const wishBtn = page.locator("main").getByRole("button", { name: /wishlist/i }).first();
    if ((await wishBtn.textContent())?.match(/In Wishlist/i)) {
      await wishBtn.click();
      await expect(wishBtn).toHaveText(/Add to Wishlist/i, { timeout: 10_000 });
    }
    await wishBtn.click();
    await expect(wishBtn).toHaveText(/In Wishlist/i, { timeout: 10_000 });

    // 3) The signed-in toggle mints NO wishlist cookie (getOrCreateWishlist
    //    returns on the userId branch before the cookie store is touched)
    //    — the cookie that reaches the login door below is minted ONLY by
    //    the guest toggle.
    const cookieAfterUserHeart = (await page.context().cookies()).find(
      (c) => c.name === "aurelia_wishlist",
    );
    expect(cookieAfterUserHeart, "the signed-in toggle mints no wishlist cookie").toBeUndefined();

    // 4) Server truth: the user's wishlist holds EXACTLY 1 item (the coat).
    const userId = JSON.parse(
      dbRead(`(p)=>p.user.findUnique({where:{email:${JSON.stringify(email)}}}).then(u=>u.id)`),
    );
    const userItems = JSON.parse(
      dbRead(`(p)=>p.wishlist.findUnique({where:{userId:${JSON.stringify(userId)}}}).then(w=>w.id).then(id=>p.wishlistItem.count({where:{wishlistId:id}}))`),
    );
    expect(userItems, "the user's list holds exactly 1 item pre-merge").toBe(1);

    // 5) Sign out — the Sign out control lives in the account tabs (ONLY
    //    on /account), so the flow returns there first. logoutAction has
    //    no limiter.
    await page.goto("/account");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });

    // 6) Guest heart the SAME coat — the merge's cookie arrives here.
    await page.goto(`/product/${SLUG}`);
    const guestBtn = page.locator("main").getByRole("button", { name: /wishlist/i }).first();
    await guestBtn.click();
    await expect(guestBtn).toHaveText(/In Wishlist/i, { timeout: 10_000 });

    // 7) Capture the guest token; server truth: the guest row is real
    //    (userId null) with EXACTLY 1 item.
    const guestToken = (await page.context().cookies()).find(
      (c) => c.name === "aurelia_wishlist",
    )?.value;
    expect(guestToken, "the guest wishlist cookie mints").toBeTruthy();
    expect(guestToken).toMatch(/^[0-9a-f]{48}$/);
    const guestRow = JSON.parse(
      dbRead(`(p)=>p.wishlist.findUnique({where:{token:${JSON.stringify(guestToken)}},include:{items:true}}).then(w=>w?{userId:w.userId,items:w.items.length}:null)`),
    );
    expect(guestRow, "the guest Wishlist row is real").toBeTruthy();
    expect(guestRow.userId, "the guest row is anonymous (userId null)").toBeNull();
    expect(guestRow.items, "the guest row holds exactly 1 item").toBe(1);

    try {
      // 8) Login as the fresh user through the real form — the LOGIN door
      //    runs mergeGuestWishlistIntoUser with the guest cookie present;
      //    the coat is ALREADY on the user's list, so the per-item upsert
      //    takes the update: {} branch (THE DEDUPE HALF). Pathname
      //    predicate per the F-EE lesson (?redirect=/wishlist matches the
      //    pre-navigation URL's QUERY).
      await page.goto("/login?redirect=/wishlist");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill("DedupeTest123");
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL((u) => new URL(u).pathname === "/wishlist", { timeout: 15_000 });

      // 9) The visible half (SUPPORTING — getWishlistDto reads through a
      //    Set): the grid shows the coat's card EXACTLY once (ProductCard
      //    renders TWO anchors per card — image + name), and it persists a
      //    reload.
      const grid = page.getByTestId("wishlist-grid");
      await expect(grid).toBeVisible();
      await expect(grid.locator(`a[href*="${SLUG}"]`)).toHaveCount(2);
      await page.reload();
      await expect(page.getByTestId("wishlist-grid").locator(`a[href*="${SLUG}"]`)).toHaveCount(2);

      // 10) THE LOAD-BEARING ASSERTION — server truth: the user's wishlist
      //     STILL holds EXACTLY 1 row for the coat (the dedupe union: no
      //     duplicate row, and above all NO crash — the merge completed).
      const coatId = JSON.parse(
        dbRead(`(p)=>p.product.findUnique({where:{slug:${JSON.stringify(SLUG)}}}).then(pr=>pr.id)`),
      );
      const overlapCount = JSON.parse(
        dbRead(`(p)=>p.wishlist.findUnique({where:{userId:${JSON.stringify(userId)}}}).then(w=>w.id).then(id=>p.wishlistItem.count({where:{wishlistId:id,productId:${JSON.stringify(coatId)}}}))`),
      );
      expect(overlapCount, "the dedupe union holds exactly ONE row for the overlap").toBe(1);

      // 11) The G-5 visible half + the cleanup half hold on the DEDUPE
      //     path too: the cookie cleared post-login; the guest row gone.
      const cookieAfter = (await page.context().cookies()).find(
        (c) => c.name === "aurelia_wishlist",
      );
      expect(cookieAfter, "aurelia_wishlist cleared post-login (dedupe path)").toBeUndefined();
      const guestGone = JSON.parse(
        dbRead(`(p)=>p.wishlist.findUnique({where:{token:${JSON.stringify(guestToken)}}}).then(w=>w===null)`),
      );
      expect(guestGone, "the guest row is deleted (dedupe path)").toBe(true);
    } finally {
      // H-24: the guest row may outlive a mid-case failure (the G-5 rule
      // keeps the cookie alive on failure BY DESIGN) — drop it by token so
      // a failed run never leaks rows past its own context.
      if (guestToken) deleteWishlistRow(guestToken);
    }
  });
});
