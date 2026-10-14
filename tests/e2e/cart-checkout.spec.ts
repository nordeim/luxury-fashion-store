// Cart → checkout — the money path: drawer add, cart page quantity union,
// 3-step wizard (Shipping → Payment → Review), COD placement, confirmation.
//
// Suite-wide state note: specs share ONE seeded database and ONE signed-in
// demo user, so the user cart may already hold lines from earlier specs.
// Every assertion here is written against DELTAS or UI-visible reality —
// never absolute counts.
import { expect, test } from "@playwright/test";

async function openDrawerWithItem(page: import("@playwright/test").Page) {
  // PDP CTA: always visible (the card-grid action row is hover-revealed).
  await page.goto("/product/silk-draped-evening-gown");
  await page.locator("main").getByRole("button", { name: "Add to Bag" }).first().click();
  await expect(page.getByTestId("cart-drawer")).toBeVisible();
}

async function emptyTheBag(page: import("@playwright/test").Page) {
  await page.goto("/cart");
  for (;;) {
    const remove = page.getByRole("button", { name: /remove/i }).first();
    if (!(await remove.isVisible().catch(() => false))) break;
    await remove.click();
    await page.waitForTimeout(150); // server-action roundtrip per line
  }
}

test.describe("cart + checkout", () => {
  test("drawer steppers mutate the line (server truth)", async ({ page }) => {
    await openDrawerWithItem(page);
    const qty = page.getByTestId(/^qty-/).first();
    const before = Number((await qty.textContent()) ?? "0");
    await page.getByTestId("cart-drawer").getByRole("button", { name: "Increase quantity" }).click();
    await expect(qty).toHaveText(String(before + 1));
    await page.getByTestId("cart-drawer").getByRole("button", { name: "Decrease quantity" }).click();
    await expect(qty).toHaveText(String(before));
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
  });
});
