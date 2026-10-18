#!/usr/bin/env node
// Session-39 screenshot set — the dev-server login-dependent shots:
// clone-login, clone-cart, clone-account, clone-admin-dashboard.
// Drives the REAL dev server on :3000 with real logins (james → admin),
// capturing into docs/screenshots/.
const { chromium } = require("playwright");

const BASE = "http://localhost:3000";
const DIR = process.cwd() + "/docs/screenshots/";

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  // 1. clone-login — the login card.
  await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: DIR + "clone-login.png" });
  console.log("captured clone-login.png");

  // 2. james login → clone-account.
  await page.getByLabel("Email").fill("james@example.com");
  await page.getByLabel("Password").fill("Demo1234!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/account/, { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: DIR + "clone-account.png" });
  console.log("captured clone-account.png");

  // 3. clone-cart — add a piece; the PDP's Add to Bag AUTO-OPENS the drawer
  //    (src/components/store/product-detail.tsx:48 — setCartOpen(true)).
  await page.goto(`${BASE}/product/cashmere-overcoat`, { waitUntil: "load", timeout: 30000 });
  await page.getByRole("button", { name: /^Add to Bag$/i }).first().click();
  await page.locator("[data-testid='cart-drawer']").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: DIR + "clone-cart.png" });
  console.log("captured clone-cart.png");

  // 4. sign out → admin login → clone-admin-dashboard (logout lands on /).
  await page.goto(`${BASE}/account`, { waitUntil: "load", timeout: 30000 });
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL((u) => !/\/account/.test(u.pathname), { timeout: 15000 });
  await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 30000 });
  await page.getByLabel("Email").fill("admin@aurelia.com");
  await page.getByLabel("Password").fill("Admin1234!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/account/, { timeout: 15000 }); // the door's default landing
  await page.goto(`${BASE}/admin`, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: DIR + "clone-admin-dashboard.png" });
  console.log("captured clone-admin-dashboard.png");

  console.log("console/page errors:", errors.length ? errors.slice(0, 3) : "none");
  await browser.close();
})().catch((e) => { console.error("SHOT ERROR:", e); process.exit(1); });
