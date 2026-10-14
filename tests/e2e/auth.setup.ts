// Auth setup — sign the demo customer in ONCE and save the session cookie.
//
// The auth endpoints are rate-limited (10 attempts/IP/15 min), so per-test
// logins would trip the limiter mid-suite. Every spec in the chromium/mobile
// projects starts from this storageState; logged-out surfaces opt back out
// with an empty storageState (see auth.spec.ts).
import { expect, test as setup } from "@playwright/test";
import path from "node:path";

// cwd = repo root when Playwright runs (config dir); .auth is git-ignored.
// Each setup project (<name> = setup-chromium / setup-mobile) saves its own
// session file so the two device projects never share a server-side session.
setup("sign in the demo customer", async ({ page }) => {
  // Each setup project (<name> = setup-chromium / setup-mobile) saves its own
  // session file so the two device projects never share a server-side session.
  const projectName = setup.info().project.name;
  const authFile = path.join(
    process.cwd(),
    "tests",
    "e2e",
    ".auth",
    `${projectName.replace("setup-", "")}.json`,
  );

  await page.goto("/login");
  await page.getByLabel("Email").fill("james@example.com");
  await page.getByLabel("Password").fill("Demo1234!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/account/);
  await page.context().storageState({ path: authFile });
});
