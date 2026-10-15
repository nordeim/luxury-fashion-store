// Cart → checkout — the money path: drawer add, cart page quantity union,
// 3-step wizard (Shipping → Payment → Review), COD placement, confirmation.
//
// Suite-wide state note: specs share ONE seeded database and ONE signed-in
// demo user, so the user cart may already hold lines from earlier specs.
// Every assertion here is written against DELTAS or UI-visible reality —
// never absolute counts.
import { execSync } from "node:child_process";
import path from "node:path";
import { writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

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
    // Home row card (Cashmere Overcoat: XS S M L). Click the SECOND chip —
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
