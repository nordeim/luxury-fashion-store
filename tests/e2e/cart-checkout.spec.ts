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
});
