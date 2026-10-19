// Cart → checkout — the money path: drawer add, cart page quantity union,
// 3-step wizard (Shipping → Payment → Review), COD placement, confirmation.
//
// Suite-wide state note: specs share ONE seeded database and ONE signed-in
// demo user, so the user cart may already hold lines from earlier specs.
// Every assertion here is written against DELTAS or UI-visible reality —
// never absolute counts.
//
// Session-32 extension (F-CC — the guest order-view capability gate):
// the confirmation URL's ?order=&t= pair is the declared capability contract
// (CLAUDE.md: "Guest order confirmations ride an HMAC view token —
// sequential order numbers are not capability tokens") — unit-pinned at the
// pure layer (order-token.test.ts) yet never exercised on the wire: the
// checkout cases below REACH /checkout/success by following the placement
// redirect and never assert the GATE. The F-CC describe drives the real
// guest COD flow in a fresh logged-out context, captures the minted
// order+token pair, then direct-fetches the full capability matrix: the
// captured pair serves (with the PII it protects), and every rejected
// variant — absent token, wrong token, a VALID token minted for a DIFFERENT
// order (computed offline with the shared E2E_AUTH_SECRET, the
// e2e-secrets.ts single-source-of-truth constant), and an unknown order with
// its own valid token — 404s into the platform not-found card, leaking no
// guest email. Rate-limit budget: checkout is 10/10min per IP (one shared
// bucket); this suite spends 2/project (COD + card) + 1/project (F-CC)
// = 6 < 10 per run.
import { execSync, spawn, spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import { E2E_AUTH_SECRET } from "./e2e-secrets";

async function openDrawerWithItem(page: import("@playwright/test").Page) {
  // PDP CTA: always visible (the card-grid action row is hover-revealed).
  await page.goto("/product/silk-draped-evening-gown");
  await page.locator("main").getByRole("button", { name: "Add to Bag" }).first().click();
  await expect(page.getByTestId("cart-drawer")).toBeVisible();
}

async function emptyTheBag(page: import("@playwright/test").Page) {
  // H-27 (session-6): the old loop re-queried after a fixed 150ms sleep — a
  // slow action roundtrip let it double-click the same line. Deterministic:
  // wait for THAT row to detach before re-querying.
  await page.goto("/cart");
  for (;;) {
    const remove = page.getByRole("button", { name: /remove/i }).first();
    if (!(await remove.isVisible().catch(() => false))) break;
    const lineCount = await page.getByTestId("cart-line").count();
    await remove.click();
    if (lineCount > 0) {
      await expect(page.getByTestId("cart-line")).toHaveCount(lineCount - 1, { timeout: 10_000 });
    }
  }
}

test.describe("cart + checkout", () => {
  test("card size-chip selection drives the posted size (H-57b — the P-11 behavioral half)", async ({ page }) => {
    // Home row FIRST card — whichever catalog product that is (H-69: the
    // card is located by its own rendered chips, never by name; the first
    // card is deterministic via the New Arrivals sort but its NAME may
    // legitimately change with the catalog). Click the SECOND chip —
    // the card's Add to Bag must post THAT size, proving the selectable
    // superset end-to-end (the old pins proved only the visual flip).
    await page.goto("/");
    const card = page.getByTestId("product-row").first().locator("[data-product-card]").first();
    await expect(card).toBeVisible();
    const chips = card.locator(".flex-wrap button");
    const chipCount = await chips.count();
    expect(chipCount).toBeGreaterThanOrEqual(2);
    const wanted = ((await chips.nth(1).textContent()) ?? "").trim();
    // Session-10: wait for HYDRATION before the chip click — a click landing
    // on a not-yet-hydrated SSR node is silently lost (no fiber props → no
    // React handler; the race fired live in the P-11 RED demo). Hydrated
    // nodes carry the __reactFiber$ expando.
    await expect
      .poll(() =>
        chips
          .nth(1)
          .evaluate((el) => Object.keys(el).filter((k) => k.startsWith("__reactFiber$")).length)
      )
      .toBeGreaterThan(0);
    await chips.nth(1).click();
    await expect
      .poll(() => chips.nth(1).evaluate((el) => getComputedStyle(el).borderTopColor), { timeout: 5_000 })
      .not.toBe(await chips.nth(0).evaluate((el) => getComputedStyle(el).borderTopColor));
    // Hover-revealed action row: Playwright's click auto-hovers.
    await card.getByRole("button", { name: "Add to Bag" }).click();
    await expect(page.getByTestId("cart-drawer")).toBeVisible();
    // The drawer line must carry the CLICKED size (server truth), not sizes[0].
    await expect(page.getByTestId("cart-drawer").getByText(`Size: ${wanted}`)).toBeVisible();
    // Within-run residue rule: this spec cleans up after itself.
    await emptyTheBag(page);
  });

  test("drawer steppers mutate the line (server truth)", async ({ page }) => {
    await openDrawerWithItem(page);
    const qty = page.getByTestId(/^qty-/).first();
    const before = Number((await qty.textContent()) ?? "0");
    await page.getByTestId("cart-drawer").getByRole("button", { name: "Increase quantity" }).click();
    await expect(qty).toHaveText(String(before + 1));
    await page.getByTestId("cart-drawer").getByRole("button", { name: "Decrease quantity" }).click();
    await expect(qty).toHaveText(String(before));
  });

  test("rapid double-remove emits no 5xx and empties the bag (H-23)", async ({ page }) => {
    await openDrawerWithItem(page);
    const serverErrors: string[] = [];
    page.on("response", (res) => {
      if (res.status() >= 500) serverErrors.push(`${res.status()} ${res.url()}`);
    });
    await page.goto("/cart");
    const remove = page.getByRole("button", { name: /remove/i }).first();
    await expect(remove).toBeVisible();
    // Two clicks inside one event burst: both actions' pre-checks see the line
    // before either delete lands — the loser must re-sync (ok envelope), not
    // throw P2025 as a raw 500.
    await remove.dblclick();
    await expect(page.getByText("Your bag is empty")).toBeVisible({ timeout: 10_000 });
    expect(serverErrors).toEqual([]);
  });

  test("rapid double-remove on the cart page emits no 5xx (H-23)", async ({ page }) => {
    await openDrawerWithItem(page);
    const serverErrors: string[] = [];
    page.on("response", (res) => {
      if (res.status() >= 500) serverErrors.push(`${res.status()} ${res.url()}`);
    });
    await page.goto("/cart");
    const remove = page.getByRole("button", { name: /remove/i }).first();
    await expect(remove).toBeVisible();
    // Second surface, same race: the Remove control is the one cart control
    // NOT gated by isPending, so a double-fire reaches the action seam.
    await remove.dblclick();
    await expect(page.getByText("Your bag is empty")).toBeVisible({ timeout: 10_000 });
    expect(serverErrors).toEqual([]);
  });

  test("opening the drawer moves focus inside and traps Tab (H-26)", async ({ page }) => {
    await openDrawerWithItem(page);
    const panel = page.getByRole("dialog", { name: "Shopping bag" });
    await expect(panel).toBeVisible();
    // Initial focus lives INSIDE the panel (was: left on the opener).
    const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
    expect(inside).toBe(true);
    // Tab from the LAST focusable wraps to the first — the page behind stays
    // unreachable while the modal is open.
    await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"][aria-label="Shopping bag"]')!;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
      items[items.length - 1].focus();
    });
    await page.keyboard.press("Tab");
    const wrapped = await page.evaluate(
      () => !!document.activeElement?.closest('[role="dialog"][aria-label="Shopping bag"]'),
    );
    expect(wrapped).toBe(true);
  });

  test("empty bag shows the empty state with a way back", async ({ page }) => {
    await emptyTheBag(page);
    await expect(page.getByText("Your bag is empty")).toBeVisible();
    await expect(page.getByRole("link", { name: "Continue Shopping" })).toBeVisible();
  });

  test("cart page totals re-derive from server rows", async ({ page }) => {
    await openDrawerWithItem(page);
    await page.goto("/cart");
    await expect(page.getByText("Proceed to Checkout")).toBeVisible();
    await expect(page.getByText(/Subtotal/i)).toBeVisible();
  });

  test("COD checkout places an order end-to-end (signed in or guest)", async ({ page }) => {
    await openDrawerWithItem(page);
    await page.goto("/checkout");

    // Step 0 — shipping. Guest sessions render an email field (specs earlier
    // in the suite may have signed out); signed-in sessions prefill the name.
    // exact:true — the newsletter input's aria-label ("Your email address")
    // substring-matches "Email", which would turn getByLabel ambiguous.
    const email = page.getByLabel("Email", { exact: true });
    if (await email.count()) {
      await email.fill("james@example.com");
    }
    await page.getByLabel("Full Name").fill("James Whitmore");
    await page.getByLabel("Street Address").fill("212 Mercer Street, Apt 4B");
    await page.getByLabel("City").fill("New York");
    await page.getByLabel("State").fill("NY");
    await page.getByLabel("ZIP").fill("10012");
    await page.getByRole("button", { name: "Continue to Payment" }).click();

    // Step 1 — COD, then to review.
    await page.getByText("Cash on Delivery").click();
    await page.getByRole("button", { name: "Review Order" }).click();

    // Step 2 — review + place.
    await expect(page.getByText(/review/i).first()).toBeVisible();
    await page.getByRole("button", { name: /place order/i }).click();

    await expect(page).toHaveURL(/\/checkout\/success/, { timeout: 20_000 });
    await expect(page.getByText(/thank you|order confirmed/i).first()).toBeVisible();
    await expect(page.getByText(/ORD-\d{4}-\d{3}/).first()).toBeVisible();
  });

  // Session 5, H-5 + H-8: the card path was never exercised end-to-end, and
  // the server-computed fieldErrors used to be invisible on the review step.
  // Pins: Luhn-invalid card → per-field error list + "Edit payment details"
  // affordance; valid card → order placed.
  test("card checkout surfaces field errors, then places the order (H-5/H-8)", async ({ page }) => {
    await openDrawerWithItem(page);
    await page.goto("/checkout");

    const email = page.getByLabel("Email", { exact: true });
    if (await email.count()) {
      await email.fill("james@example.com");
    }
    await page.getByLabel("Full Name").fill("James Whitmore");
    await page.getByLabel("Street Address").fill("212 Mercer Street, Apt 4B");
    await page.getByLabel("City").fill("New York");
    await page.getByLabel("State").fill("NY");
    await page.getByLabel("ZIP").fill("10012");
    await page.getByRole("button", { name: "Continue to Payment" }).click();

    // Step 1 — CARD with a Luhn-invalid number.
    await page.getByText("Credit Card").click();
    await page.getByLabel("Card Number").fill("4242 4242 4242 4241");
    await page.getByLabel("Expiry (MM/YY)").fill("12/28");
    await page.getByLabel("CVC").fill("123");
    await page.getByRole("button", { name: "Review Order" }).click();

    // Step 2 — the field error is VISIBLE (was a dead-end before H-5).
    // Scoped by text: the Next route announcer also carries role=alert.
    await page.getByRole("button", { name: /place order/i }).click();
    const alert = page.getByRole("alert").filter({ hasText: /valid card number/i });
    await expect(alert).toContainText("Enter a valid card number", { timeout: 15_000 });
    // The fieldErrors list renders one <li> per offending field.
    await expect(alert.locator("li")).toHaveCount(1);
    await expect(alert.getByRole("button", { name: /edit payment details/i })).toBeVisible();

    // Fix the number on step 1 and place.
    await alert.getByRole("button", { name: /edit payment details/i }).click();
    await page.getByLabel("Card Number").fill("4242 4242 4242 4242");
    await page.getByRole("button", { name: "Review Order" }).click();
    await page.getByRole("button", { name: /place order/i }).click();

    await expect(page).toHaveURL(/\/checkout\/success/, { timeout: 20_000 });
    await expect(page.getByText(/ORD-\d{4}-\d{3}/).first()).toBeVisible();
    // Card orders persist the last-4 on the confirmation.
    await expect(page.getByText(/···· 4242/)).toBeVisible();
  });
});

// Session 5, H-8: the guest→user cart merge had no coverage. A guest builds a
// bag, signs in, and the bag must survive the merge (server truth).
test.describe("guest cart merge at login", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("guest bag survives sign-in (mergeGuestCartIntoUser)", async ({ page }) => {
    const guestProduct = "wide-brim-felt-hat";
    await page.goto(`/product/${guestProduct}`);
    await page.locator("main").getByRole("button", { name: "Add to Bag" }).first().click();
    await expect(page.getByTestId("cart-drawer")).toBeVisible();
    await expect(page.getByTestId("cart-count")).toContainText("1 item");

    // Sign in through the login form (redirect back to /cart).
    await page.goto("/login?redirect=/cart");
    await page.getByLabel("Email").fill("james@example.com");
    await page.getByLabel("Password").fill("Demo1234!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/cart/);

    // The guest line is merged into the user cart (server truth).
    await expect(page.getByText(/wide-brim|felt hat/i).first()).toBeVisible();
    // …and the merged bag is a real server row: a reload keeps it.
    await page.reload();
    await expect(page.getByText(/wide-brim|felt hat/i).first()).toBeVisible();

    // H-24 companion (session-6): this test used to leave the merged line in
    // james's user cart — once the logout spec stopped destroying the shared
    // session (same fix), the next project's drawer specs saw two lines.
    // Every run returns to the canonical empty-bag state, whatever the
    // project order.
    await emptyTheBag(page);
    await expect(page.getByText("Your bag is empty")).toBeVisible();
  });
});

// Session 7, H-39: the drawer's "+" stays ENABLED on a STALE DTO (rendered
// while the product had stock, stock zeroed behind it) — the old action fired
// its atomic increment BEFORE the sold-out guard, inflating the persisted
// line on every click. The plan-driven executor must refuse growth on a
// sold-out line (H-15: leave the line untouched; the checkout guard owns the
// conversation).
// F-CC (session-32): the confirmation route's capability gate, exercised on
// the wire against a REAL placed guest order — the shape the placement
// redirect alone can never prove.
test.describe("guest order-view capability gate (F-CC, session-32)", () => {
  // A fresh logged-out context (the F-BB storageState opt-out): the flow must
  // mint a GUEST order (userId: null) deterministically, whatever run order
  // the suite gave earlier specs.
  test.use({ storageState: { cookies: [], origins: [] } });

  // The declared shape (src/lib/order-token.ts): HMAC-SHA256 over
  // `order-view:${orderNumber}`, hex, first 40 chars — with the standalone's
  // AUTH_SECRET (= E2E_AUTH_SECRET, injected by playwright.config webServer
  // env). Computing a token OFFLINE for a different order number lets the
  // matrix reject a VALID token for the WRONG order without placing a second
  // order (one checkout-bucket slot saved, one wizard round-trip saved).
  function orderViewTokenOffline(orderNumber: string): string {
    return createHmac("sha256", E2E_AUTH_SECRET).update(`order-view:${orderNumber}`).digest("hex").slice(0, 40);
  }

  test("the guest confirmation serves only with the minted view token (F-CC)", async ({ page }) => {
    test.setTimeout(90_000);

    // The proven COD flow (the "cart + checkout" describe above): PDP
    // preselects sizes[0], one click fills the drawer; wizard Shipping →
    // Payment(COD) → Review → Place.
    await page.goto("/product/silk-draped-evening-gown");
    await page.locator("main").getByRole("button", { name: "Add to Bag" }).first().click();
    await expect(page.getByTestId("cart-drawer")).toBeVisible();
    await page.goto("/checkout");

    const GUEST_EMAIL = "james@example.com";
    await page.getByLabel("Email", { exact: true }).fill(GUEST_EMAIL);
    await page.getByLabel("Full Name").fill("James Whitmore");
    await page.getByLabel("Street Address").fill("212 Mercer Street, Apt 4B");
    await page.getByLabel("City").fill("New York");
    await page.getByLabel("State").fill("NY");
    await page.getByLabel("ZIP").fill("10012");
    await page.getByRole("button", { name: "Continue to Payment" }).click();
    await page.getByText("Cash on Delivery").click();
    await page.getByRole("button", { name: "Review Order" }).click();
    await page.getByRole("button", { name: /place order/i }).click();

    await expect(page).toHaveURL(/\/checkout\/success/, { timeout: 20_000 });
    const successUrl = new URL(page.url());
    const order = successUrl.searchParams.get("order") || "";
    const token = successUrl.searchParams.get("t") || "";

    // The minted capability pair rides the redirect — the declared shapes.
    expect(order).toMatch(/^ORD-\d{4}-\d{3}$/);
    expect(token).toMatch(/^[0-9a-f]{40}$/);

    // Positive path — the captured pair serves the confirmation (direct
    // fetch, not the redirect-followed landing the existing cases prove).
    const ok = await page.goto(`/checkout/success?order=${order}&t=${token}`);
    expect(ok?.status()).toBe(200);
    await expect(page.getByText(new RegExp(order.replace("-", "\\-")))).toBeVisible();
    // The PII the gate exists to protect — on the served body for the
    // rightful token holder.
    await expect(page.getByText(GUEST_EMAIL)).toBeVisible();

    // The negative matrix — every rejected variant 404s into the platform
    // not-found card, leaking no guest email ("no existence leak", the
    // source's own contract comment).
    const matrix: Array<[string, string]> = [
      ["absent token", `/checkout/success?order=${order}`],
      ["wrong token", `/checkout/success?order=${order}&t=${(token[0] === "0" ? "1" : "0") + token.slice(1)}`],
      ["cross-order token", `/checkout/success?order=${order}&t=${orderViewTokenOffline("ORD-2099-002")}`],
      ["unknown order + its own valid token", `/checkout/success?order=ORD-2099-001&t=${orderViewTokenOffline("ORD-2099-001")}`],
    ];
    for (const [label, url] of matrix) {
      const res = await page.goto(url);
      expect(res?.status(), `${label}: status`).toBe(404);
      await expect(page.getByText("Page Not Found"), `${label}: not-found card`).toBeVisible();
      const body = await page.content();
      expect(body, `${label}: no PII leak`).not.toContain(GUEST_EMAIL);
    }
  });
});

test.describe("sold-out adjust guard (customer session)", () => {
  // Runs on the canonical JAMES session — no login of its own. The admin
  // seam's in-spec logins already consume exactly the rate limiter's 10 per
  // IP+email across the two projects (5 + 5), so this test drives the stock
  // edit through SQL like the H-2 injection (fixture tooling — the behavior
  // under test is the ADJUST action, not the admin form).
  test("adjust refuses to grow a sold-out line (H-39)", async ({ page }) => {
    test.setTimeout(60_000);
    // SQL stock edit (H-2's fixture pattern — file-based db execute).
    const e2eDb = path.resolve(process.cwd(), "db", "e2e.db");
    const schema = path.resolve(process.cwd(), "prisma", "schema.prisma");
    const sqlFile = path.resolve(process.cwd(), "tests", "e2e", ".h39-stock.sql");
    const env = { ...process.env, DATABASE_URL: `file:${e2eDb}` };
    const setStock = (n: number) => {
      writeFileSync(sqlFile, `UPDATE "Product" SET stock = ${n} WHERE slug = 'wide-brim-felt-hat';`);
      execSync(`npx prisma db execute --schema ${schema} --file ${sqlFile}`, { env, stdio: "pipe" });
    };

    // Bag the victim product and KEEP the drawer open on a stale DTO.
    await page.goto("/product/wide-brim-felt-hat");
    await page.locator("main").getByRole("button", { name: "Add to Bag" }).first().click();
    await expect(page.getByTestId("cart-drawer")).toBeVisible();
    const drawerQty = page.getByTestId("cart-drawer").getByTestId(/^qty-/).first();
    await expect(drawerQty).toHaveText("1");

    try {
      // Zero the stock BEHIND the open drawer — the drawer never re-renders,
      // so its "+" is still enabled (line.stock is the stale seed value 12):
      // exactly the stale-UI window the fix guards.
      setStock(0);

      // THE PIN: "+" on the sold-out line must not grow it. (Old build: the
      // increment landed first and the DTO came back with 2.)
      await page.getByTestId("cart-drawer").getByRole("button", { name: "Increase quantity" }).click();
      await expect(drawerQty).toHaveText("1", { timeout: 10_000 });
    } finally {
      // Restore world (shared DB — later specs shop this product).
      setStock(12);
    }
    // Cleanup discipline (H-24 class): james's bag returns to empty.
    await emptyTheBag(page);
    await expect(page.getByText("Your bag is empty")).toBeVisible();
  });
});

// Owner capability rows of the success gate (session-35, F-FF).
//
// The F-CC matrix above pins the GUEST half of the /checkout/success
// capability gate (logged-out contexts only). The OWNER half — the gate's
// first term — was never DIRECTLY exercised: the placement cases reach the
// success page only as the redirect target, so a dropped `isOwner` term
// would lock every signed-in customer out of their own confirmations (and
// an over-broad one would serve guest orders to any session) with every
// gate green. The gate (src/app/(storefront)/checkout/success/page.tsx):
//   isOwner          = user && order.userId === user.id
//   isGuestWithToken = !order.userId && token && verifyOrderViewToken(...)
//   if (!isOwner && !isGuestWithToken) notFound();
//
// Row census (session-35): guest+valid token → 200 and the absent/wrong/
// cross/unknown token 404s are F-CC's (logged-out). THIS describe pins the
// three session-bearing rows: owner+own order+NO token → 200 (the DIRECT
// owner capability, with the PII it protects); signed-in+guest order+NO
// token → 404 with no existence leak (the mismatch half via
// `order.userId === null !== user.id`); signed-in+guest order+its own VALID
// offline token → 200 (the token path is session-ORTHOGONAL — a gate
// "tightened" to require logged-out would silently break shared
// confirmation links). The foreign-owner row (a different non-null userId)
// stays covered-by-shape: `===` has no null special-case, and the
// null-mismatch row already exercises its false branch.
//
// Budget + H-24: the case rides james's per-project storageState — ZERO
// logins, zero limiter consumption (james's and admin's buckets stay
// exactly consumed, SKILL §9 #23); every fetch is a read-only GET on
// canonical seed rows (ORD-2026-001 james / ORD-2026-004 the canonical
// guest order) — nothing to clean (global-setup re-seeds orders every run).
test.describe("owner capability rows of the success gate (F-FF, session-35)", () => {
  // The default storageState IS james's (the setup projects' canonical
  // session) — no test.use here is deliberate: the rows under test are the
  // SESSION-bearing half of the gate.

  function orderViewTokenOffline(orderNumber: string): string {
    return createHmac("sha256", E2E_AUTH_SECRET).update(`order-view:${orderNumber}`).digest("hex").slice(0, 40);
  }

  test("a signed-in owner reaches their confirmation without a token, and only it (F-FF)", async ({ page }) => {
    // ROW 1 — the direct owner capability: james + his canonical order +
    // NO token → 200 with the PII the gate protects for the rightful owner.
    const own = await page.goto("/checkout/success?order=ORD-2026-001");
    expect(own?.status(), "row 1: status").toBe(200);
    await expect(page.getByText("ORD-2026-001"), "row 1: the order number").toBeVisible();
    await expect(page.getByText("james@example.com"), "row 1: the owner's email").toBeVisible();

    // ROW 2 — signed-in is not a capability on a GUEST order: the mismatch
    // half (order.userId === null !== user.id) must 404 with no leak.
    const guestNoToken = await page.goto("/checkout/success?order=ORD-2026-004");
    expect(guestNoToken?.status(), "row 2: status").toBe(404);
    await expect(page.getByText("Page Not Found"), "row 2: not-found card").toBeVisible();
    const body = await page.content();
    expect(body, "row 2: no guest-email leak").not.toContain("guest.visitor@example.com");

    // ROW 3 — the token path is session-orthogonal: the SAME signed-in
    // session holding the guest order's own VALID token serves it (the
    // shared-confirmation-link affordance the source declares).
    const guestWithToken = await page.goto(
      `/checkout/success?order=ORD-2026-004&t=${orderViewTokenOffline("ORD-2026-004")}`,
    );
    expect(guestWithToken?.status(), "row 3: status").toBe(200);
    await expect(page.getByText("guest.visitor@example.com"), "row 3: the token holder's PII").toBeVisible();

    // ROW 3b — the cross-order negative holds under a session too.
    const cross = await page.goto(
      `/checkout/success?order=ORD-2026-004&t=${orderViewTokenOffline("ORD-2099-002")}`,
    );
    expect(cross?.status(), "row 3b: status").toBe(404);
    await expect(page.getByText("Page Not Found"), "row 3b: not-found card").toBeVisible();
  });
});

// Checkout transaction write set (session-42, F-MM).
//
// The money path's own transaction — placeOnce (src/lib/actions/checkout.ts:125-204)
// — writes FIVE things in ONE tx; the existing gates pinned only ONE of them
// (the Order + OrderItem rows, via the COD/card confirmations + F-CC's matrix).
// The other three halves were wire-blind on every existing assertion:
//
//   1. the per-item STOCK DECREMENT (:142-154) — no spec ever reads a
//      product's stock after a checkout (H-7/H-15 pin the ADMIN edit seam;
//      H-39 pins the ADJUST seam) — a dropped decrement leaves the storefront
//      selling stock that is already sold (the README's own "stock decrement
//      + oversell guard in one transaction" contract, half-pinned);
//   2. the initial 'placed' OrderEvent mint (:198) — F-DD pins the SEED's
//      events on the account timeline, F-HH pins the ADMIN mutation's mints;
//      neither reads a NEWLY placed order's timeline — a dropped mint leaves
//      the customer's AND the admin's timelines for every new order empty;
//   3. the post-placement CART PURGE (:202) — every "bag is empty" assertion
//      flows through removeCartItemAction or the client-side EMPTY_CART
//      store; the COD/card cases never re-render the cart after placement,
//      and the mid-file guest-merge's emptyTheBag absorbs exactly the
//      lingering rows a dropped purge would leave — a dropped deleteMany
//      re-fills the bag on the next server render (the double-purchase
//      exposure).
//
// The confirmation page is the "toast": all three dropped-write shapes keep
// it green. This case drives the REAL COD flow once and reads the three
// halves SERVER-TRUTH (the toast cannot see them) plus the purge's
// wire-real half (a FRESH /cart render — the RSC read, not the client
// store's EMPTY_CART).
//
// Budget: checkout is 10/10min per IP (one shared bucket); this suite spends
// 2/project (COD + card) + 1/project (F-CC) + 1/project (F-MM) = 8 < 10 per
// run — the ledger the F-CC header documents, extended.
//
// Cleanup (H-24) — the cleanest fixture in the suite: the placed order +
// items + events die in global-setup's wholesale Order/OrderItem/OrderEvent
// wipe at every run start (H-22/H-25); the stock decrement resets via the
// seed's product.upsert (stock: 12) re-pinned at every global-setup; james's
// cart ends empty (the purge under test IS the cleanup). No afterAll, no
// SQL fixture, no minted rows. Within-run isolation: this describe sorts
// LAST in the file; the only order-count specs (admin.spec's H-2 total +
// dashboard KPIs + F-LL) run BEFORE cart-checkout.spec.ts alphabetically
// (workers:1, fullyParallel:false — the serial topology).
test.describe("checkout transaction write set (F-MM, session-42)", () => {
  // The default storageState IS james's (the setup projects' canonical
  // session) — no test.use here is deliberate: the flow under test is the
  // SESSION-BEARING checkout (the F-FF context). ZERO logins, ZERO registers.

  const REPO = process.cwd();
  const E2E_DB_URL = `file:${path.join(REPO, "db", "e2e.db")}`;

  /** Read rows through Prisma on the E2E DB (the F-HH helper's shape). */
  function dbRead(jsonExpression: string): unknown {
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
    return JSON.parse(res.stdout.slice(marker + "<<JSON>>".length).trim());
  }

  test("the placement writes the stock decrement, the placed event, and the purge (F-MM)", async ({ page }) => {
    test.setTimeout(90_000);
    const VICTIM = "silk-draped-evening-gown"; // openDrawerWithItem's product; H-39 manipulates wide-brim-felt-hat only

    // Deterministic start + capture-before (never hardcode — the stock is
    // whatever this run's earlier placements left: the seed re-pins 12 at
    // every global-setup, COD/card/F-CC each decrement before this case).
    await emptyTheBag(page);
    const before = dbRead(
      `(p)=>p.product.findUnique({where:{slug:"${VICTIM}"},select:{stock:true}})` +
        `.then(async(pr)=>({stock:pr.stock,jamesLines:await p.cartItem.count({where:{cart:{user:{email:"james@example.com"}}}})}))`,
    ) as { stock: number; jamesLines: number };
    expect(before.jamesLines, "the deterministic start: james's bag is empty server-side").toBe(0);
    expect(before.stock, "the victim's stock resolves (capture-before)").toBeGreaterThan(0);

    // The REAL COD flow (the proven shape): PDP add → wizard → place.
    await page.goto(`/product/${VICTIM}`);
    await page.locator("main").getByRole("button", { name: "Add to Bag" }).first().click();
    await expect(page.getByTestId("cart-drawer")).toBeVisible();
    await page.goto("/checkout");
    await page.getByLabel("Full Name").fill("James Whitmore");
    await page.getByLabel("Street Address").fill("212 Mercer Street, Apt 4B");
    await page.getByLabel("City").fill("New York");
    await page.getByLabel("State").fill("NY");
    await page.getByLabel("ZIP").fill("10012");
    await page.getByRole("button", { name: "Continue to Payment" }).click();
    await page.getByText("Cash on Delivery").click();
    await page.getByRole("button", { name: "Review Order" }).click();
    await page.getByRole("button", { name: /place order/i }).click();
    await expect(page).toHaveURL(/\/checkout\/success/, { timeout: 20_000 });
    const orderNumber = new URL(page.url()).searchParams.get("order") || "";
    expect(orderNumber, "the order number parses from the success URL (the F-CC shape)").toMatch(/^ORD-\d{4}-\d{3}$/);
    await expect(page.getByText(new RegExp(orderNumber.replace("-", "\\-")))).toBeVisible();

    // LOAD-BEARING #1 — the decrement half (the oversell guard's own write).
    const stockAfter = dbRead(
      `(p)=>p.product.findUnique({where:{slug:"${VICTIM}"},select:{stock:true}})`,
    ) as { stock: number } | null;
    expect(stockAfter?.stock, "the victim's stock decremented exactly the line quantity (1)").toBe(before.stock - 1);

    // LOAD-BEARING #2 — the 'placed' OrderEvent mint (the timeline seed BOTH
    // sides render; actor 'system' — the F-16 customer-visible class).
    const events = dbRead(
      `(p)=>p.orderEvent.findMany({where:{order:{number:"${orderNumber}"}},select:{type:true,actor:true,note:true},orderBy:{createdAt:"asc"}})`,
    ) as Array<{ type: string; actor: string; note: string | null }>;
    expect(events, "exactly ONE event on the new order").toHaveLength(1);
    expect(events[0]?.type, "the event is the 'placed' seed").toBe("placed");
    expect(events[0]?.actor, "the actor is 'system' (customer-visible, F-16)").toBe("system");
    expect(events[0]?.note).toBeNull();

    // LOAD-BEARING #3 — the purge half (james's bag is empty SERVER-SIDE).
    const linesAfter = dbRead(
      `(p)=>p.cartItem.count({where:{cart:{user:{email:"james@example.com"}}}})`,
    ) as number;
    expect(linesAfter, "the cart rows are purged after placement (server truth)").toBe(0);

    // SUPPORTING (wire-real) — the purge's RSC half: a FRESH /cart render
    // shows the empty state (NOT the client store's EMPTY_CART — a server
    // re-read; a dropped deleteMany re-fills the bag right here).
    await page.goto("/cart");
    await expect(page.getByText("Your bag is empty")).toBeVisible();
  });
});

// F-QQ (session-46) — the checkout seam's limiter floor over the wire. The
// last un-gated abuse floor in the action seams: placeOrderAction's
// `rateLimit("checkout:"+ip, 10, 10min)` (checkout.ts:66-70) — the 11th
// same-IP attempt must answer `fail("Too many attempts. Try again in N
// seconds.")`. Ungated since the limiter's introduction; every existing
// placeOrderAction consume in the suite is lawful and far under 10 (the
// documented budget: 8 < 10 per run), so a dropped `if (!limiter.allowed)`
// block rides an order-spam burst through with all gates green — the
// silent-abuse class F-OO closed for /api/search and F-PP closed for the
// auth actions.
//
// The F-OO/F-PP harness insight, applied to the checkout seam with two
// twists:
//   1. NO valid cart is needed — the limiter fires BEFORE findCart
//      (checkout.ts:67 before :73), and a cart-less guest's findCart reads
//      null (a pure read — cart.ts:65-73 never creates), so every burst
//      iteration answers "Your bag is empty." with ZERO writes; the 11th
//      answers the floor.
//   2. the wire shape is the JS-path FETCH-ACTION dispatch, not the F-PP
//      no-JS $ACTION_REF form: CheckoutFlow renders NO <form action> (the
//      dispatch is programmatic — startTransition(() => formAction(fd))),
//      and the cart-less /checkout page redirects at render time, which
//      would swallow the MPA re-render. The measured shape (probe,
//      session-46): POST /checkout + `Next-Action: <placeOrderId>` header +
//      multipart body where the `_1_<formField>` entries PRECEDE the flight
//      row `"0"` = `[null,"$K1"]` (the server's `case "K"` reassembly
//      walks referencedEntries in order and breaks at the first
//      non-matching key — the order rule the probe's first run caught when
//      the wrong order answered the Zod-null envelope). The response is
//      the flight stream carrying the ActionResult — the envelope
//      assertable in the body bytes.
//
// The throwaway spawns against a COPY of db/e2e.db (the serial topology
// keeps the suite DB quiescent at copy time) WITH TRUST_PROXY=1 so
// per-request X-Forwarded-For headers give the case exact per-IP bucket
// control (the rate-limit.ts clientIpFrom H-35 contract) — the per-IP
// control pins the KEY SHAPE (checkout:<ip>, not a global lockout): a
// mutation collapsing clientIpFrom to a constant passes every existing
// gate (the suite runs without TRUST_PROXY — every existing consume is
// checkout:local either way).
//
// ZERO logins, ZERO registers, ZERO main-server limiter consumption, ZERO
// DB writes anywhere (the burst carries no cookies — findCart reads null
// every time; the copy is deleted with its tmpdir in the finally).
test.describe("checkout limiter floor (F-QQ, session-46)", () => {
  const FQQ_PORT = 3213;
  const FQQ_BASE = `http://localhost:${FQQ_PORT}`;
  const REPO = process.cwd();
  const STANDALONE = path.join(REPO, ".next", "standalone", "server.js");
  const CHECKOUT_MANIFEST = path.join(
    REPO,
    ".next/standalone/.next/server/app/(storefront)/checkout/page/server-reference-manifest.json",
  );
  const E2E_DB_FILE = path.join(REPO, "db", "e2e.db");

  // RFC 5737 documentation ranges — never routable, only ever bucket keys.
  const IP_A = "198.51.100.10";
  const IP_B = "198.51.100.99";

  const EMPTY_BAG_MSG = "Your bag is empty.";
  const LINE_GONE_MSG = "That bag line no longer exists.";
  const FLOOR_RE = /Too many attempts\. Try again in (\d+) seconds/;

  const COD_PAYLOAD = {
    email: `fqq-burst-${process.pid}@example.com`,
    fullName: "FQQ Burst Probe",
    street: "1 Probe Lane",
    city: "Probe City",
    state: "Probe State",
    zip: "12345",
    country: "United States",
    paymentMethod: "cod",
  };

  /** The measured fetch-action dispatch (the probe's wire shape). The
   * `_1_*` fields MUST precede the flight row "0" — the server's ordered
   * referencedEntries walk breaks at the first non-matching key (the
   * session-46 probe caught the order rule first-hand: the reversed order
   * answered the Zod-null envelope because "$K1" reassembled empty). */
  async function postCheckoutAction(
    actionId: string,
    fields: Record<string, string>,
    xff: string,
  ): Promise<{ status: number; body: string; setCookie: string }> {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(`_1_${k}`, v);
    fd.set("0", '[null,"$K1"]');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const res = await fetch(`${FQQ_BASE}/checkout`, {
        method: "POST",
        headers: { "Next-Action": actionId, "X-Forwarded-For": xff },
        body: fd,
        signal: ctrl.signal,
      });
      const cookie = (res.headers.getSetCookie?.() ?? []).join("\n");
      return { status: res.status, body: await res.text(), setCookie: cookie };
    } finally {
      clearTimeout(timer);
    }
  }

  /** The action-seam gate's JSON-arg probe shape (the sibling sweep). */
  async function postJsonAction(actionId: string, payload: unknown[]): Promise<{ status: number; body: string }> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const res = await fetch(`${FQQ_BASE}/checkout`, {
        method: "POST",
        headers: { "Next-Action": actionId, "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      return { status: res.status, body: await res.text() };
    } finally {
      clearTimeout(timer);
    }
  }

  /** Read a count through Prisma on the THROWAWAY copy (dbRead's shape). */
  function copyCount(copyUrl: string, model: "order" | "cartItem" | "user"): number {
    const script =
      `const {PrismaClient}=require("@prisma/client");` +
      `const p=new PrismaClient({datasources:{db:{url:"${copyUrl}"}}});` +
      `p.${model}.count().then(c=>{console.log("<<JSON>>"+c);return p.$disconnect()})` +
      `.catch(e=>{console.error(e.message);process.exit(1)})`;
    const res = spawnSync("node", ["-e", script], {
      cwd: REPO,
      env: { ...process.env, DATABASE_URL: copyUrl },
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
    if (res.status !== 0) throw new Error(`copyCount(${model}) failed: ${res.stderr?.slice(0, 300)}`);
    const marker = (res.stdout ?? "").indexOf("<<JSON>>");
    if (marker < 0) throw new Error(`copyCount(${model}) produced no JSON: ${(res.stdout ?? "").slice(0, 200)}`);
    return Number(res.stdout.slice(marker + "<<JSON>>".length).trim());
  }

  test("the 11th same-IP checkout attempt answers the limiter floor; a different IP is not floored (F-QQ)", async () => {
    test.setTimeout(60_000);

    // The throwaway: a tmpdir holding a COPY of the suite DB + the
    // standalone on :3213 with its own fresh limiter buckets and
    // TRUST_PROXY=1 (the per-IP control mechanism).
    const tmp = mkdtempSync(path.join(os.tmpdir(), "aurelia-fqq-"));
    const copyPath = path.join(tmp, "copy.db");
    copyFileSync(E2E_DB_FILE, copyPath);
    const copyUrl = `file:${copyPath}`;
    const before = {
      order: copyCount(copyUrl, "order"),
      cartItem: copyCount(copyUrl, "cartItem"),
      user: copyCount(copyUrl, "user"),
    };

    let child: ReturnType<typeof spawn> | null = null;
    try {
      child = spawn("node", [STANDALONE], {
        cwd: REPO,
        env: {
          ...process.env,
          PORT: String(FQQ_PORT),
          NODE_ENV: "production",
          AUTH_SECRET: E2E_AUTH_SECRET,
          TRUST_PROXY: "1",
          DATABASE_URL: copyUrl,
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stderrTail = "";
      child.stderr?.on("data", (chunk: Buffer) => {
        stderrTail = (stderrTail + chunk.toString("utf8")).slice(-800);
      });

      // Boot + listen (the load-bearing feasibility check).
      const deadline = Date.now() + 25_000;
      let booted = false;
      while (Date.now() < deadline) {
        try {
          const probe = await fetch(`${FQQ_BASE}/api/health`);
          const text = await probe.text();
          if (probe.status === 200 && text.includes('"db":true')) {
            booted = true;
            break;
          }
        } catch { /* not listening yet */ }
        await new Promise((r) => setTimeout(r, 300));
      }
      expect(booted, `throwaway must boot against the copy; stderr: ${stderrTail.slice(0, 300)}`).toBe(true);

      // The authoritative id set (the build-shape canary: a Next.js upgrade
      // that reshapes the manifest fails HERE, loudly).
      const manifest = JSON.parse(readFileSync(CHECKOUT_MANIFEST, "utf8")) as {
        node?: Record<string, { exportedName?: string; filename?: string }>;
      };
      const entries = Object.entries(manifest.node ?? {});
      expect(entries, `manifest at ${CHECKOUT_MANIFEST}`).toHaveLength(3);
      for (const [id] of entries) expect(id).toMatch(/^[0-9a-f]{40,}$/);
      const placeEntries = entries.filter(
        ([, v]) => v?.exportedName === "placeOrderAction" && v?.filename === "src/lib/actions/checkout.ts",
      );
      expect(placeEntries, "exactly one placeOrderAction on the checkout route").toHaveLength(1);
      const placeId = placeEntries[0][0];

      // The wire-shape probe (burst iteration 1 for IP-A — the probe IS the
      // first consume): the crafted fetch-action POST answers the cart-less
      // envelope — wire-real discrimination of placeOrderAction. No cookie
      // is minted (findCart read null; nothing wrote).
      const iter1 = await postCheckoutAction(placeId, COD_PAYLOAD, IP_A);
      expect(iter1.status, "action errors are envelopes, never 5xx").toBe(200);
      expect(iter1.body, "the cart-less envelope identifies placeOrderAction").toContain(EMPTY_BAG_MSG);
      expect(iter1.body).toContain('"ok":false');
      expect(iter1.setCookie, "a cart-less burst mints nothing").toBe("");

      // The fail-closed sweep over the sibling ids: garbage line ids answer
      // the cart-line envelope, never 5xx (their payloads never reach the
      // checkout bucket — different actions, no limiters of their own).
      for (const [sibId, sib] of entries) {
        if (sibId === placeId) continue;
        const probe = await postJsonAction(sibId, ["nonexistent-fqq-probe-id", 1]);
        expect(probe.status, `${sib?.exportedName} stays fail-closed`).toBe(200);
        expect(probe.body).not.toContain("Internal Server Error");
        expect(probe.body, `${sib?.exportedName} answers the cart-line envelope`).toContain(LINE_GONE_MSG);
      }

      // LOAD-BEARING 1 (the floor): iterations 2..10 stay in the lawful
      // window (the cart-less envelope — the floor must not fire early),
      // then the 11th same-IP attempt hits the floor with a bounded
      // retry-seconds value (the window is 10 minutes → N ∈ 1..600). A
      // dropped placeOrderAction limiter block makes the 11th answer the
      // cart-less envelope instead — exactly where this assertion goes red
      // while every existing gate stays green (all their consumes are
      // lawful « 10).
      for (let i = 2; i <= 10; i++) {
        const r = await postCheckoutAction(placeId, COD_PAYLOAD, IP_A);
        expect(r.status, `iteration ${i}`).toBe(200);
        expect(r.body, `iteration ${i} stays in the lawful window`).toContain(EMPTY_BAG_MSG);
        expect(r.body, `iteration ${i} must not hit the floor early`).not.toMatch(FLOOR_RE);
      }
      const floored = await postCheckoutAction(placeId, COD_PAYLOAD, IP_A);
      const floorMatch = FLOOR_RE.exec(floored.body);
      const floorSeconds = floorMatch ? Number(floorMatch[1]) : 0;
      expect(floorMatch, "the 11th same-IP checkout answers the floor envelope").not.toBeNull();
      expect(floorSeconds, "the retry hint is bounded (1..600)").toBeGreaterThanOrEqual(1);
      expect(floorSeconds, "the retry hint is bounded (1..600)").toBeLessThanOrEqual(600);

      // LOAD-BEARING 2 (the per-IP key shape): IP-B's post answers the
      // lawful envelope — clientIpFrom honors the first XFF hop under
      // TRUST_PROXY=1, so IP-A's exhausted bucket must not leak across
      // keys. A mutation collapsing the IP to a constant makes IP-B answer
      // the FLOOR here — the key-shape half no existing gate reads.
      const control = await postCheckoutAction(placeId, COD_PAYLOAD, IP_B);
      expect(control.status).toBe(200);
      expect(control.body, "a different IP is not floored (the per-IP key shape)").toContain(EMPTY_BAG_MSG);
      expect(control.body, "the floor must not leak across bucket keys").not.toMatch(FLOOR_RE);

      // The zero-writes proof (server truth the wire cannot see): the whole
      // ladder persisted nothing on the throwaway copy. The main e2e.db was
      // never written (only read once, at copyFileSync).
      expect(copyCount(copyUrl, "order"), "no orders minted").toBe(before.order);
      expect(copyCount(copyUrl, "cartItem"), "no bag lines minted").toBe(before.cartItem);
      expect(copyCount(copyUrl, "user"), "no users minted").toBe(before.user);
    } finally {
      if (child) {
        const force = setTimeout(() => child?.kill("SIGKILL"), 5_000);
        const exited = new Promise<void>((resolve) => {
          const c = child;
          if (c) c.on("exit", () => resolve());
        });
        child.kill("SIGTERM");
        await exited;
        clearTimeout(force);
      }
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
