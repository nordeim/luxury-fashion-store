// Admin console — role gate (customer redirected), admin dashboard renders,
// REAL admin mutations (order update, product stock/visibility).
// The admin login happens in-spec with a logged-out session (a few extra auth
// attempts are well under the 10/IP/15 min limiter budget).
import { execSync } from "node:child_process";
import path from "node:path";
import { writeFileSync } from "node:fs";
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
    // H-28 (session-6): KPI floors — deterministic because global-setup
    // restores the canonical 4 orders (H-25): Revenue ≥ $9,594.99 (285000 +
    // 340000 + 314000 + 20499 cents) and Orders ≥ 4. Real checkouts from the
    // other device project legitimately raise both, so these are floors, not
    // absolutes — the exact cancellation SEMANTICS are pinned in the H-2
    // injection test below (cancelled orders move Orders, never Revenue).
    const revenueCard = page.getByText("Revenue", { exact: true }).locator("..");
    const revenueValue = Number(((await revenueCard.textContent()) ?? "").replace(/[^0-9.]/g, ""));
    expect(revenueValue).toBeGreaterThanOrEqual(9594.99);
    const ordersCard = page.getByText("Orders", { exact: true }).locator("..");
    const ordersKpi = Number((await ordersCard.textContent())?.replace(/\D+/g, "") ?? "0");
    expect(ordersKpi).toBeGreaterThanOrEqual(4);

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

  // Session 5, H-2: the table header must show the server COUNT, not the
  // take-capped list length. The seed leaves the DB far below the take(100)
  // cap — where `.length` and COUNT agree — so this test INJECTS enough rows
  // to force divergence (104 total, 100 visible) and pins the header value.
  // Session 6, H-28: the injected rows are CANCELLED orders — the test also
  // pins the Revenue semantics (cancelled moves the Orders KPI by exactly
  // 104 while Revenue stays bit-identical).
  test("orders header reports the true total past the take cap (H-2)", async ({ page }) => {
    const e2eDb = path.resolve(process.cwd(), "db", "e2e.db");
    const schema = path.resolve(process.cwd(), "prisma", "schema.prisma");
    const inject = Array.from({ length: 104 }, (_, i) => {
      const n = String(i + 1).padStart(3, "0");
      return `INSERT INTO "Order" ("id","number","email","status","subtotal","shipping","total","shippingAddress","paymentMethod","placedAt","updatedAt") VALUES ('h2test${n}','ORD-9999-${n}','h2test@example.com','cancelled',100,0,100,'{}','cod',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);`;
    }).join("\n");
    const sqlFile = path.resolve(process.cwd(), "tests", "e2e", ".h2-inject.sql");
    writeFileSync(sqlFile, inject);
    const env = { ...process.env, DATABASE_URL: `file:${e2eDb}` };
    const cleanup = () => {
      writeFileSync(sqlFile, `DELETE FROM "Order" WHERE "number" LIKE 'ORD-9999-%';`);
      execSync(`npx prisma db execute --schema ${schema} --file ${sqlFile}`, { env, stdio: "pipe" });
    };

    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@aurelia.com");
    await page.getByLabel("Password").fill("Admin1234!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/account/);

    try {
      // H-28 semantic pin: read both KPIs before the injection…
      const kpis = async () => {
        await page.goto("/admin");
        const revenue = await page.getByText("Revenue", { exact: true }).locator("..").textContent();
        const orderCount = await page.getByText("Orders", { exact: true }).locator("..").textContent();
        return { revenue: revenue?.trim() ?? "", orderCount: Number(orderCount?.replace(/\D+/g, "") ?? "0") };
      };
      const before = await kpis();

      execSync(`npx prisma db execute --schema ${schema} --file ${sqlFile}`, { env, stdio: "pipe" });
      await page.goto("/admin/orders");
      // take(100) caps the visible rows at 100; the header must read the
      // server COUNT (seeded orders + 104 injected), NOT orders.length.
      const total = await page.getByTestId("orders-total").textContent();
      expect(total?.trim()).toMatch(/1[0-9]{2} orders/); // >= 100+: three digits
      const visible = await page.getByRole("link", { name: /ORD-\d{4}-\d{3}/ }).count();
      expect(visible).toBe(100);
      expect(Number.parseInt(total?.replace(/\D+/g, "") ?? "0", 10)).toBeGreaterThan(visible);

      // …and after: Orders grew by exactly the 104 cancelled rows while
      // Revenue did not move a cent (cancelled ≠ revenue, H-28).
      // H-47 (session-7): bit-identical Revenue is deterministic ONLY because
      // the config pins fullyParallel:false + workers:1 — a parallel
      // non-cancelled checkout would move Revenue mid-injection.
      const during = await kpis();
      expect(during.orderCount - before.orderCount).toBe(104);
      expect(during.revenue).toBe(before.revenue);
    } finally {
      cleanup();
    }
  });

  // Session 5, H-7 + H-15 + H-6: the LAST untested mutation seam. Sets a
  // product's stock to 0 through the real admin form, then proves the
  // storefront honors it: the fresh PDP renders sold out, and a STALE PDP
  // (rendered pre-sellout, never reloaded) surfaces the action failure inline
  // instead of silently doing nothing. Restores stock (try/finally — shared DB).
  test("admin stock edit drives the storefront sellout path (H-7/H-15)", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@aurelia.com");
    await page.getByLabel("Password").fill("Admin1234!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/account/);

    const stockInput = page.getByLabel("Stock for Wide-Brim Felt Hat");
    const setBtn = stockInput.locator("..").getByRole("button", { name: "Set" });

    // STALE PDP FIRST: rendered while stock is still 5 and kept open across
    // the admin mutation (never reloaded) — a live React island whose server
    // truth moves under it.
    const stale = await page.context().newPage();
    await stale.goto("/product/wide-brim-felt-hat");
    const staleAdd = stale.locator("main").getByRole("button", { name: "Add to Bag" }).first();
    await expect(staleAdd).toBeEnabled();

    const pdp = await page.context().newPage();
    try {
      // Zero the stock through the admin form (row-scoped Set button).
      await page.goto("/admin/products");
      await stockInput.fill("0");
      await setBtn.click();
      await expect(page.getByRole("status")).toHaveText("Product updated.");

      // A FRESH PDP renders sold out (server truth reaches RSC)…
      await pdp.goto("/product/wide-brim-felt-hat");
      await expect(pdp.getByRole("button", { name: "Out of Stock" })).toBeDisabled();

      // …while the STALE page still shows an enabled button. Clicking it
      // must fail visibly (H-15 server guard + H-6 inline surfacing).
      await staleAdd.click();
      await expect(stale.getByTestId("pdp-action-error")).toHaveText(/out of stock/i);
      // The bag must not have grown: no drawer opened.
      await expect(stale.getByTestId("cart-drawer")).toHaveCount(0);
    } finally {
      // Restore stock (shared DB — later specs shop this product).
      await page.goto("/admin/products");
      await stockInput.fill("12");
      await setBtn.click();
      await expect(page.getByRole("status")).toHaveText("Product updated.");
      await stale.close();
      await pdp.close();
    }
  });

  // Session 5, H-7: visibility toggle drives /shop for real.
  test("admin visibility toggle hides and restores a product on /shop (H-7)", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@aurelia.com");
    await page.getByLabel("Password").fill("Admin1234!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/account/);

    await page.goto("/admin/products");
    await page.getByRole("button", { name: "Hide Wide-Brim Felt Hat" }).click();
    await expect(page.getByRole("button", { name: "Show Wide-Brim Felt Hat" })).toBeVisible();

    await page.goto("/shop");
    await expect(page.getByRole("main")).not.toContainText("Wide-Brim Felt Hat");

    // Restore.
    await page.goto("/admin/products");
    await page.getByRole("button", { name: "Show Wide-Brim Felt Hat" }).click();
    await expect(page.getByRole("button", { name: "Hide Wide-Brim Felt Hat" })).toBeVisible();
    await page.goto("/shop");
    await expect(page.getByRole("main")).toContainText("Wide-Brim Felt Hat");
  });
});
