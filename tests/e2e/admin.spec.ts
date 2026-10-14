// Admin console — role gate (customer redirected), admin dashboard renders.
// The admin login happens in-spec with a logged-out session (one extra auth
// attempt is well under the 10/IP/15 min limiter budget).
import { expect, test } from "@playwright/test";

test.describe("admin role gate (customer session)", () => {
  test("customers are redirected away from /admin", async ({ page }) => {
    // storageState = demo customer (role "user") from the setup project.
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/account/);
  });
});

test.describe("admin console (admin session)", () => {
  // The customer storageState would bounce /login → /account before the
  // admin credentials could ever be typed; start logged out.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("admin sign-in reaches the dashboard, orders, and products", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@aurelia.com");
    await page.getByLabel("Password").fill("Admin1234!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/account/);

    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).not.toHaveURL(/\/account/);
    // Dashboard surfaces the role-gated metrics.
    await expect(page.getByText(/revenue|orders/i).first()).toBeVisible();
    // Regression pin (session 3, F-19 follow-up): the Products KPI must show the
    // full seeded catalog (12), not the low-stock-filtered count.
    const productsCard = page.getByText("Products", { exact: true }).locator("..");
    await expect(productsCard).toHaveText(/12/);

    await page.goto("/admin/orders");
    await expect(page.getByText(/ORD-\d{4}-\d{3}/).first()).toBeVisible();

    await page.goto("/admin/products");
    await expect(page.getByText(/silk/i).first()).toBeVisible();
  });

  // Session 4, G-1: the dashboard visit alone never caught the admin.ts
  // `status` ReferenceError — every mutation 500'd while all gates stayed
  // green. This spec performs a REAL mutation (status change, carrier set,
  // carrier clear) through the actual form seam.
  test("admin can update an order: status, carrier set, carrier clear", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@aurelia.com");
    await page.getByLabel("Password").fill("Admin1234!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/account/);

    await page.goto("/admin/orders");
    await page.getByRole("link", { name: /ORD-\d{4}-\d{3}/ }).first().click();
    await expect(page.getByText("Manage Order")).toBeVisible();

    // 1) Status transition (PLACED/DELIVERED → in_transit).
    await page.getByLabel("Status").selectOption("in_transit");
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("status")).toHaveText("Order updated.");

    // 2) Carrier + tracking set — must survive a reload (server truth).
    await page.getByLabel("Carrier").fill("DHL");
    await page.getByLabel("Tracking Number").fill("1Z999AA10123456784");
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("status")).toHaveText("Order updated.");
    await page.reload();
    await expect(page.getByLabel("Carrier")).toHaveValue("DHL");
    await expect(page.getByLabel("Tracking Number")).toHaveValue("1Z999AA10123456784");

    // 3) Carrier clear (F-9 semantics: empty string erases the field).
    await page.getByLabel("Carrier").fill("");
    await page.getByLabel("Tracking Number").fill("");
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("status")).toHaveText("Order updated.");
    await page.reload();
    await expect(page.getByLabel("Carrier")).toHaveValue("");
    await expect(page.getByLabel("Tracking Number")).toHaveValue("");
  });
});
