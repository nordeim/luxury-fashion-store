#!/usr/bin/env node
// Session-36 plan-validation probe — wire-verifies the F-GG contract
// assumptions BEFORE the spec is written (the session-29…35 §6 discipline:
// no unverified assumption enters a pin). Boots the standalone on :3208
// against a THROWAWAY COPY of db/custom.db (zero writes touch the dev DB),
// then drives the full dedupe flow through the REAL UI on the copy:
//   - the run-unique register auto-logs-in (the register door's
//     createSession + redirect — the pre-load heart needs ZERO logins);
//   - the SIGNED-IN coat toggle flips the button and mints NO wishlist
//     cookie (getOrCreateWishlist returns on the userId branch before the
//     cookie store is touched);
//   - the user's wishlist holds EXACTLY 1 item (the coat) — server truth
//     on the copy;
//   - the sign-out lands home (no limiter on logoutAction);
//   - the GUEST coat toggle mints the 48-hex cookie; the guest row is real
//     (userId null) with EXACTLY 1 item;
//   - the login lands /wishlist (?redirect honored) — the merge COMPLETES
//     over the overlapping item (the dedupe branch, update: {});
//   - the coat card renders EXACTLY once; the user's wishlist STILL holds
//     EXACTLY 1 item for the coat (no duplicate row, no crash);
//   - the cookie CLEARED post-login; the guest row GONE by token;
//   - zero unexpected console errors.
// Exits nonzero on any assumption failure.
const { spawn, spawnSync } = require("child_process");
const { chromium } = require("playwright");
const fs = require("fs");

const PORT = 3208;
const BASE = `http://localhost:${PORT}`;
const SECRET = "session36-probe-secret-0123456789abcdef";
const EMAIL = `e2e-probe36-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
const PASSWORD = "ProbeTest123";
const COAT_SLUG = "cashmere-overcoat";

// A throwaway DB copy — absolute URL passes the db-path resolver untouched
// (AGENTS.md pass-through path), so the probe never touches db/custom.db.
const PROBE_DB = `/tmp/probe-session36-${process.pid}.db`;
const PROBE_DB_URL = `file:${PROBE_DB}`;

// Server-truth reads on the COPY through Prisma (the spec helper's shape,
// pointed at the probe DB).
function dbRead(jsonExpression) {
  const script = `const {PrismaClient}=require("@prisma/client");const p=new PrismaClient({datasources:{db:{url:"${PROBE_DB_URL}"}}});(${jsonExpression})(p).then(r=>{console.log("<<JSON>>"+JSON.stringify(r));return p.$disconnect()}).catch(e=>{console.error(e.message);process.exit(1)})`;
  const res = spawnSync("node", ["-e", script], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: PROBE_DB_URL },
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  if (res.status !== 0) throw new Error(`dbRead failed: ${res.stderr?.slice(0, 300)}`);
  const marker = (res.stdout ?? "").indexOf("<<JSON>>");
  if (marker < 0) throw new Error(`dbRead produced no JSON: ${(res.stdout ?? "").slice(0, 200)}`);
  return JSON.parse(res.stdout.slice(marker + "<<JSON>>".length).trim());
}

// Poll a locator's text until it matches the pattern (the probe's
// hand-rolled toHaveText — the normalize-first defense without
// @playwright/test's expect).
function pollText(locator, pattern, timeoutMs = 10_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      Promise.resolve(locator.textContent()).then((t) => {
        if (pattern.test(t || "")) return resolve(t);
        if (Date.now() - start > timeoutMs) return reject(new Error(`pollText timeout waiting for ${pattern}`));
        setTimeout(tick, 250);
      }).catch(reject);
    };
    tick();
  });
}

async function main() {
  const results = [];
  const check = (name, cond, detail) =>
    results.push({ name, ok: !!cond, detail: detail || "" });

  const browser = await chromium.launch();
  const ctx = await browser.newContext(); // fresh context ⇒ the real register UI
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  // 1) Register run-unique through the REAL form — the register door
  //    auto-logs-in (createSession + redirect to /account).
  await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Name").fill("E2E Probe36");
  await page.getByLabel("Email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.locator("#confirmPassword").fill(PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL(/\/account/, { timeout: 15_000 });
  check("register auto-logs-in through the real UI on the copy", /\/account$/.test(new URL(page.url()).pathname), page.url());

  // 2) Heart the coat as the SIGNED-IN user — the pre-load for the dedupe
  //    branch (the user's list now holds the piece BEFORE the merge).
  await page.goto(`${BASE}/product/${COAT_SLUG}`, { waitUntil: "domcontentloaded" });
  const wishBtn = page.locator("main").getByRole("button", { name: /wishlist/i }).first();
  // Normalize first: the copy ships canonical seed state (no wishlist
  // rows), but the defense stays — the suite-shares-one-DB pattern.
  if ((await wishBtn.textContent())?.match(/In Wishlist/i)) {
    await wishBtn.click();
    await pollText(wishBtn, /Add to Wishlist/i);
  }
  await wishBtn.click();
  await pollText(wishBtn, /In Wishlist/i);
  check("the signed-in coat toggle flips to In Wishlist", true, "");

  // 3) The signed-in toggle mints NO wishlist cookie (the userId branch
  //    returns before the cookie store is touched).
  const cookieAfterUserHeart = (await ctx.cookies()).find((c) => c.name === "aurelia_wishlist");
  check("the signed-in toggle mints NO aurelia_wishlist cookie", !cookieAfterUserHeart, cookieAfterUserHeart?.value?.slice(0, 12));

  // 4) Server truth on the copy: the user's wishlist holds EXACTLY 1 item
  //    (the coat).
  const userId = dbRead(`(p)=>p.user.findUnique({where:{email:${JSON.stringify(EMAIL)}}}).then(u=>u.id)`);
  const userCount = dbRead(
    `(p)=>p.wishlist.findUnique({where:{userId:${JSON.stringify(userId)}},include:{items:true}}).then(w=>w?w.items.length:-1)`,
  );
  check("the user's wishlist holds EXACTLY 1 item (the coat)", userCount === 1, `items=${userCount}`);

  // 5) Sign out — lands home (logoutAction carries no limiter). The Sign
  //    out control lives in the account tabs (account-tabs.tsx) — rendered
  //    ONLY on /account, so the flow returns there first (the F-EE shape
  //    signs out while still on /account; this flow detours to the PDP).
  await page.goto(`${BASE}/account`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/$/, { timeout: 15_000 });
  check("the sign-out lands home", /\/$/.test(new URL(page.url()).pathname), page.url());

  // 6) Heart the coat as a GUEST — the merge's cookie arrives here.
  await page.goto(`${BASE}/product/${COAT_SLUG}`, { waitUntil: "domcontentloaded" });
  const guestBtn = page.locator("main").getByRole("button", { name: /wishlist/i }).first();
  await guestBtn.click();
  await pollText(guestBtn, /In Wishlist/i);
  check("the guest coat toggle flips to In Wishlist", true, "");

  // 7) The guest cookie mints (the declared 192-bit hex token).
  const guestToken = (await ctx.cookies()).find((c) => c.name === "aurelia_wishlist")?.value;
  check("the guest wishlist cookie mints (48-hex)", /^[0-9a-f]{48}$/.test(guestToken || ""), (guestToken || "").slice(0, 12));

  // 8) Server truth: the guest row is real (userId null) with EXACTLY 1 item.
  const guestRow = dbRead(
    `(p)=>p.wishlist.findUnique({where:{token:${JSON.stringify(guestToken)}},include:{items:true}}).then(w=>w?{userId:w.userId,items:w.items.length}:null)`,
  );
  check("the guest row is real (userId null, exactly 1 item)", !!guestRow && guestRow.userId === null && guestRow.items === 1, JSON.stringify(guestRow));

  // 9) Login as the fresh user through the REAL form — the LOGIN door runs
  //    the merge with the guest cookie present; the coat is ALREADY on the
  //    user's list, so the per-item upsert takes the update: {} branch.
  await page.goto(`${BASE}/login?redirect=/wishlist`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((u) => new URL(u).pathname === "/wishlist", { timeout: 15_000 });
  check("the login lands /wishlist (the merge COMPLETED over the overlap)", true, page.url());

  // 10) The coat card renders EXACTLY once in the grid (the visible half —
  //     note getWishlistDto reads through a Set, so this is supporting
  //     evidence; check 11 is the load-bearing row-level count).
  const coatAnchors = await page.getByTestId("wishlist-grid").locator(`a[href*="${COAT_SLUG}"]`).count();
  check("the coat card renders EXACTLY once in the grid", coatAnchors === 2, `coat anchors=${coatAnchors} (2 per card: image + name)`);

  // 11) THE LOAD-BEARING ASSERTION — server truth: the user's wishlist
  //     STILL holds EXACTLY 1 item for the coat (the dedupe union: no
  //     duplicate row, and above all NO crash).
  const coatId = dbRead(`(p)=>p.product.findUnique({where:{slug:${JSON.stringify(COAT_SLUG)}}}).then(pr=>pr.id)`);
  const userWishlistId = dbRead(`(p)=>p.wishlist.findUnique({where:{userId:${JSON.stringify(userId)}}}).then(w=>w.id)`);
  const overlapCount = dbRead(
    `(p)=>p.wishlistItem.count({where:{wishlistId:${JSON.stringify(userWishlistId)},productId:${JSON.stringify(coatId)}}})`,
  );
  check("the user's wishlist STILL holds EXACTLY 1 row for the coat (dedupe union)", overlapCount === 1, `rows=${overlapCount}`);

  // 12) The G-5 visible half + the cleanup half: the cookie CLEARED
  //     post-login; the guest row GONE by token.
  const cookieAfterLogin = (await ctx.cookies()).find((c) => c.name === "aurelia_wishlist");
  const guestGone = dbRead(
    `(p)=>p.wishlist.findUnique({where:{token:${JSON.stringify(guestToken)}}}).then(w=>w===null)`,
  );
  check("the cookie cleared post-login AND the guest row gone", !cookieAfterLogin && guestGone === true, `cookie=${!!cookieAfterLogin} guestGone=${guestGone}`);

  // 13) Zero unexpected console errors.
  check("zero console errors", consoleErrors.length === 0, consoleErrors.join(" || ").slice(0, 300));

  await ctx.close();
  await browser.close();

  const failed = results.filter((r) => !r.ok).length;
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : "  ||  " + r.detail}`);
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exitCode = failed ? 1 : 0;
}

fs.copyFileSync(`${process.cwd()}/db/custom.db`, PROBE_DB);

const child = spawn("node", [".next/standalone/server.js"], {
  env: {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: "production",
    AUTH_SECRET: SECRET,
    DATABASE_URL: PROBE_DB_URL,
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let stderrTail = "";
child.stderr.on("data", (c) => (stderrTail = (stderrTail + c).slice(-2000)));

function waitHealth(deadlineMs) {
  const http = require("http");
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const r = http.request(`${BASE}/api/health`, { method: "GET" }, (res) => {
        res.statusCode === 200 ? resolve() : retry();
      });
      r.on("error", retry);
      r.setTimeout(4000, () => r.destroy(new Error("timeout")));
      r.end();
    };
    const retry = () => {
      if (Date.now() - start > deadlineMs) return reject(new Error("health timeout: " + stderrTail.slice(-400)));
      setTimeout(tick, 400);
    };
    tick();
  });
}

waitHealth(20000)
  .then(main)
  .catch((e) => {
    console.error("probe error:", e.message, stderrTail);
    process.exitCode = 1;
  })
  .finally(() => {
    child.kill("SIGTERM");
    try { fs.unlinkSync(PROBE_DB); } catch {}
  });
