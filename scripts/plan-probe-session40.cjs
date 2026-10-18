#!/usr/bin/env node
// Session-40 plan-validation probe — wire-verifies the F-KK contract
// assumptions BEFORE the spec is written (the session-29…39 §6 discipline:
// no unverified assumption enters a pin). Boots the standalone on :3209
// against a THROWAWAY COPY of db/custom.db (zero writes touch the dev DB
// or db/e2e.db), then drives the logout-revocation flow through the REAL
// UI on the copy:
//   - the session is minted OFFLINE (a random 256-bit token + its HMAC'd
//     cookie, backed by a Session row inserted via prisma db execute with
//     james's id resolved by the DB itself — the F-II/F-HH/M-1 pattern);
//   - the minted cookie + row render /account signed-in (the mint's WIRE
//     VALIDITY — a fresh context carrying the cookie is indistinguishable
//     from a logged-in james);
//   - the REAL Sign out control (account-tabs form → logoutAction) is
//     clicked and the redirect lands on /;
//   - server truth: the minted Session row is GONE after the logout (the
//     db.session.deleteMany half of destroySession — the wire CANNOT see
//     this; a dropped deleteMany leaves the row alive up to 30d while the
//     cookie clear alone keeps every existing logout assertion green);
//   - the wire: /account bounces to /login afterwards (the cookie-clear
//     half) and the cookie is gone from the context;
//   - james can log in again afterwards (no collateral damage);
//   - the belt-and-braces afterAll DELETE is a no-op on a healthy logout
//     (the row is already gone);
//   - zero unexpected console errors.
// Exits nonzero on any assumption failure.
const { spawn, spawnSync } = require("child_process");
const { chromium } = require("playwright");
const { randomBytes, createHmac } = require("node:crypto");
const fs = require("fs");
const path = require("node:path");

const PORT = 3209;
const BASE = `http://localhost:${PORT}`;
const SECRET = "session40-probe-secret-0123456789abcdef";
const EMAIL = "james@example.com";
const PASSWORD = "Demo1234!";

// A throwaway DB copy — absolute URL passes the db-path resolver untouched
// (AGENTS.md pass-through path), so the probe never touches db/custom.db.
const PROBE_DB = `/tmp/probe-session40-${process.pid}.db`;
const PROBE_DB_URL = `file:${PROBE_DB}`;
const REPO = process.cwd();

// The offline mint (the a11y M-1 / F-II / F-HH pattern's cookie shape).
const TOKEN = randomBytes(32).toString("hex");
const COOKIE_VALUE = `${TOKEN}.${createHmac("sha256", SECRET).update(TOKEN).digest("base64url")}`;

function dbRead(jsonExpression) {
  const script = `const {PrismaClient}=require("@prisma/client");const p=new PrismaClient({datasources:{db:{url:"${PROBE_DB_URL}"}}});(${jsonExpression})(p).then(r=>{console.log("<<JSON>>"+JSON.stringify(r));return p.$disconnect()}).catch(e=>{console.error(e.message);process.exit(1)})`;
  const res = spawnSync("node", ["-e", script], {
    cwd: REPO,
    env: { ...process.env, DATABASE_URL: PROBE_DB_URL },
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  if (res.status !== 0) throw new Error(`dbRead failed: ${res.stderr?.slice(0, 300)}`);
  const marker = (res.stdout ?? "").indexOf("<<JSON>>");
  if (marker < 0) throw new Error(`dbRead produced no JSON: ${(res.stdout ?? "").slice(0, 200)}`);
  return JSON.parse(res.stdout.slice(marker + "<<JSON>>".length).trim());
}

function sqlRun(sql) {
  const scratch = path.join(REPO, "tests", "e2e", ".probe40.sql");
  fs.writeFileSync(scratch, sql);
  try {
    const res = spawnSync(
      "npx",
      ["prisma", "db", "execute", "--schema", path.join(REPO, "prisma", "schema.prisma"), "--file", scratch],
      {
        cwd: REPO,
        env: { ...process.env, DATABASE_URL: PROBE_DB_URL },
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
      },
    );
    if (res.status !== 0) throw new Error(`sqlRun failed: ${res.stderr?.slice(0, 300)}`);
  } finally {
    try { fs.unlinkSync(scratch); } catch { /* already gone */ }
  }
}

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

  // Throwaway copy of the dev DB (never the live dev/e2e file).
  fs.copyFileSync(path.join(REPO, "db", "custom.db"), PROBE_DB);

  // Boot the standalone on the copy.
  const server = spawn("node", [path.join(REPO, ".next", "standalone", "server.js")], {
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "production", DATABASE_URL: PROBE_DB_URL, AUTH_SECRET: SECRET },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const serverErr = [];
  server.stderr.on("data", (d) => serverErr.push(String(d)));
  const waitHealth = async () => {
    for (let i = 0; i < 60; i++) {
      try {
        const res = await fetch(`${BASE}/api/health`);
        if (res.ok) return;
      } catch { /* not up yet */ }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`probe server never became healthy: ${serverErr.join("").slice(0, 400)}`);
  };
  await waitHealth();

  const browser = await chromium.launch();
  const consoleErrors = [];

  // THE OFFLINE MINT — a fresh context carrying ONLY the minted cookie.
  const ctx = await browser.newContext();
  await ctx.addCookies([
    {
      name: "aurelia_session",
      value: COOKIE_VALUE,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false, // http://localhost — matches the setup projects' minted cookies
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 86_400,
    },
  ]);
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  // check 1 — the minted row (INSERT…SELECT resolves james's id in the DB).
  sqlRun(
    `DELETE FROM "Session" WHERE token = '${TOKEN}';\n` +
      `INSERT INTO "Session" (id, token, "userId", "expiresAt", "createdAt") ` +
      `SELECT 'fkk-probe-' || '${TOKEN.slice(0, 16)}', '${TOKEN}', id, datetime('now', '+1 day'), datetime('now') ` +
      `FROM "User" WHERE email = '${EMAIL}';`,
  );
  const minted = dbRead(`(p)=>p.session.findUnique({where:{token:"${TOKEN}"},select:{id:true,expiresAt:true}})`);
  check("the offline-minted Session row exists (INSERT…SELECT, james resolved by the DB)", minted !== null, JSON.stringify(minted));

  // check 2 — the mint's WIRE VALIDITY: the cookie + row render /account signed-in.
  await page.goto(`${BASE}/account`, { waitUntil: "domcontentloaded" });
  const heading = await page.getByRole("heading", { name: /My Account/i }).isVisible().catch(() => false);
  check("the minted cookie + row render /account signed-in (wire validity)", heading);
  const nameVisible = await page
    .getByRole("tab", { name: "Profile" })
    .click()
    .then(() => page.locator("#profile-name").isVisible())
    .catch(() => false);
  check("the account page mounts its tabs on the minted session", nameVisible);

  // check 3 — the REAL Sign out control exists.
  const signOut = page.getByRole("button", { name: "Sign out" });
  const signOutVisible = await signOut.isVisible().catch(() => false);
  check("the real Sign out control is visible on /account", signOutVisible);

  // check 4 — THE LOGOUT: the real form seam drives logoutAction.
  await signOut.click();
  await page.waitForURL(/\/$/, { timeout: 15_000 });
  check("Sign out redirects to / (logoutAction's server redirect)", /\/$/.test(new URL(page.url()).pathname), page.url());

  // check 5 — LOAD-BEARING: the minted Session row is GONE (server truth).
  const postLogout = dbRead(`(p)=>p.session.findUnique({where:{token:"${TOKEN}"},select:{id:true}})`);
  check("REVOKE half (LOAD-BEARING): the minted Session row is GONE after logout", postLogout === null, JSON.stringify(postLogout));

  // check 6 — the wire: /account bounces to /login (the cookie-clear half).
  await page.goto(`${BASE}/account`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/login/, { timeout: 15_000 });
  check("the cookie-clear half: /account bounces to /login after logout", /\/login/.test(new URL(page.url()).pathname), page.url());

  // check 7 — the cookie is gone from the context.
  const cookies = await ctx.cookies();
  const sessionCookie = cookies.find((c) => c.name === "aurelia_session");
  check("the aurelia_session cookie is cleared from the browser", !sessionCookie, JSON.stringify(sessionCookie || null));

  // check 8 — james can log in again through the real form (no collateral damage).
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  page2.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page2.on("pageerror", (e) => consoleErrors.push(String(e)));
  await page2.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page2.getByLabel("Email").fill(EMAIL);
  await page2.getByLabel("Password").fill(PASSWORD);
  await page2.getByRole("button", { name: /sign in/i }).click();
  await page2.waitForURL(/\/account/, { timeout: 15_000 });
  check("james can log in again afterwards (no collateral damage)", /\/account$/.test(new URL(page2.url()).pathname), page2.url());
  // Clean the throwaway login session row (the copy dies anyway — belt and braces).
  const cookie2 = (await ctx2.cookies()).find((c) => c.name === "aurelia_session");
  if (cookie2) {
    const tok = cookie2.value.split(".")[0];
    sqlRun(`DELETE FROM "Session" WHERE token = '${tok}';`);
  }

  // check 9 — the belt-and-braces afterAll DELETE is a no-op on a healthy logout.
  sqlRun(`DELETE FROM "Session" WHERE token = '${TOKEN}';`);
  const stillGone = dbRead(`(p)=>p.session.findUnique({where:{token:"${TOKEN}"},select:{id:true}})`);
  check("the belt-and-braces DELETE is a no-op on the healthy logout", stillGone === null);

  check("zero unexpected console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

  await browser.close();
  server.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 500));
  server.kill("SIGKILL");

  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  console.log(`\nprobe-session40: ${results.length - failed.length}/${results.length} checks passed`);
  try { fs.unlinkSync(PROBE_DB); } catch { /* best effort */ }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error("PROBE ERROR:", e); process.exit(1); });
