// Auth surfaces — logged-out login/register validation + rate-limit-aware
// happy path (single login; the limiter allows 10/IP/15 min and the setup
// project already spent one), and the signed-in logout.
import { expect, test } from "@playwright/test";

const loggedOut = { storageState: { cookies: [], origins: [] } };

test.describe("auth (logged out)", () => {
  test.use(loggedOut);

  test("login page renders the measured card with demo hint", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("wrong credentials show the server error (no session)", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("james@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Scoped: the Next route announcer also carries role=alert.
    await expect(page.locator("form").getByRole("alert")).toBeVisible({ timeout: 10_000 });
  });

  test("register validates password confirmation", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByLabel("Name")).toBeVisible();
    await page.getByLabel("Name").fill("E2E User");
    await page.getByLabel("Email").fill(`e2e-${Date.now()}@example.com`);
    await page.locator("#password").fill("Password123");
    await page.locator("#confirmPassword").fill("Different123");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText("Passwords do not match")).toBeVisible({ timeout: 10_000 });
  });

  // Session 5, H-8: the register happy path was never exercised end-to-end
  // (only the mismatch error above). Pins the session + account landing.
  test("register creates an account and lands on /account (H-8)", async ({ page }) => {
    await page.goto("/register");
    const email = `e2e-reg-${Date.now()}@example.com`;
    await page.getByLabel("Name").fill("Register Flow");
    await page.getByLabel("Email").fill(email);
    await page.locator("#password").fill("Password123");
    await page.locator("#confirmPassword").fill("Password123");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/account/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /My Account/i })).toBeVisible();
    // A fresh account has no orders — the empty history renders guidance.
    await expect(page.getByText(/no orders|haven't placed/i).first()).toBeVisible();
  });
});

test.describe("logout (signed in)", () => {
  // Inherits the setup project's storageState — no test.use override here.
  test("account page shows session data, then logout clears it", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: /My Account/i })).toBeVisible();

    // Profile form (Radix tab content mounts on activation).
    await page.getByRole("tab", { name: "Profile" }).click();
    await expect(page.locator("#profile-name")).toHaveValue(/Whitmore/i);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/);
    // Session destroyed: /account now bounces to the login page.
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
  });
});
