#!/usr/bin/env node
// Session-38 plan-validation probe — wire-verifies the F-II contract
// assumptions BEFORE the spec is written (the session-29…37 §6 discipline:
// no unverified assumption enters a pin). Boots the standalone on :3209
// against a THROWAWAY COPY of db/custom.db (zero writes touch the dev DB
// or db/e2e.db), then drives the password-rotation flow through the REAL
// UI on the copy:
//   - login as james through the real form (session A — the "current"
//     session F-4 must KEEP);
//   - an OFFLINE-minted second session for james (random 256-bit token,
//     HMAC'd with the probe secret, Session row via SQL insert — the
//     a11y/F-HH pattern, first time for a CUSTOMER user) is VALID on the
//     wire (a context carrying its cookie renders /account signed-in) —
//     the "hijacked" session F-4 must REVOKE;
//   - the Settings tab's real form changes the password (current/new/
//     confirm → Update Password → "Password changed.");
//   - server truth: the hijacked session row GONE, session A STILL
//     present, james's total session count == pre-rotation count − 1;
//   - the wire: session A's context still renders /account signed-in
//     after the rotation (the keep half, wire-real);
//   - offline scrypt verification (the verifyPassword replication):
//     the stored hash now verifies the NEW password and NOT the old one;
//   - the restore: the captured hash UPDATE returns the account to the
//     seed password (offline verify passes again);
//   - zero unexpected console errors.
// Exits nonzero on any assumption failure.
const { spawn, spawnSync } = require("child_process");
const { chromium } = require("playwright");
const { createHmac, randomBytes, scryptSync, timingSafeEqual } = require("node:crypto");
const fs = require("fs");
const path = require("node:path");

const PORT = 3209;
const BASE = `http://localhost:${PORT}`;
const SECRET = "session38-probe-secret-0123456789abcdef";
const EMAIL = "james@example.com";
const OLD_PASSWORD = "Demo1234!";
const NEW_PASSWORD = "ProbeRoto38!Abcd";

// A throwaway DB copy — absolute URL passes the db-path resolver untouched
// (AGENTS.md pass-through path), so the probe never touches db/custom.db.
const PROBE_DB = `/tmp/probe-session38-${process.pid}.db`;
const PROBE_DB_URL = `file:${PROBE_DB}`;
const REPO = process.cwd();

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
  const scratch = path.join(REPO, "tests", "e2e", ".probe38.sql");
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

// The verifyPassword replication (src/lib/auth.ts:47-54 — s1$salt$hex, scrypt
// keylen 64): proves a hash verifies a password WITHOUT a login attempt.
function verifyOffline(stored, password) {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "s1") return false;
  const [, salt, expectedHex] = parts;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
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

  // Capture the pre-rotation truth on the copy.
  const pre = dbRead(
    `(p)=>p.user.findUnique({where:{email:"${EMAIL}"},select:{passwordHash:true,sessions:{select:{token:true}}}})`,
  );
  if (!pre) throw new Error("probe fixture missing: james");
  const preSessionCount = pre.sessions.length;
  const capturedHash = pre.passwordHash;

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

  // Context A — the CURRENT session (the one F-4 keeps): real login.
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  pageA.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  pageA.on("pageerror", (e) => consoleErrors.push(String(e)));
  await pageA.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await pageA.getByLabel("Email").fill(EMAIL);
  await pageA.getByLabel("Password").fill(OLD_PASSWORD);
  await pageA.getByRole("button", { name: /sign in/i }).click();
  await pageA.waitForURL(/\/account/, { timeout: 15_000 });
  check("login lands /account (session A = the current session)", /\/account$/.test(new URL(pageA.url()).pathname), pageA.url());

  // Session A's token (for the server-truth keep assertion).
  const cookieA = (await ctxA.cookies()).find((c) => c.name === "aurelia_session");
  const tokenA = cookieA ? cookieA.value.split(".")[0] : null;
  check("session A's cookie carries the token.hmac shape", !!tokenA && /^[0-9a-f]{64}$/.test(tokenA), String(tokenA));

  // The OFFLINE-minted "hijacked" session (the a11y/F-HH pattern, customer-side).
  const HIJACK_TOKEN = randomBytes(32).toString("hex");
  const HIJACK_COOKIE = `${HIJACK_TOKEN}.${createHmac("sha256", SECRET).update(HIJACK_TOKEN).digest("base64url")}`;
  sqlRun(
    `DELETE FROM "Session" WHERE token = '${HIJACK_TOKEN}';\n` +
      `INSERT INTO "Session" (id, token, "userId", "expiresAt", "createdAt") ` +
      `SELECT 'probe38-' || '${HIJACK_TOKEN.slice(0, 16)}', '${HIJACK_TOKEN}', id, datetime('now', '+1 day'), datetime('now') ` +
      `FROM "User" WHERE email = '${EMAIL}';`,
  );
  const hijackRow = dbRead(`(p)=>p.session.findUnique({where:{token:"${HIJACK_TOKEN}"},select:{id:true}})`);
  check("the offline-minted hijacked session row exists", !!hijackRow, JSON.stringify(hijackRow));

  // The minted session is VALID on the wire (a context carrying its cookie
  // renders /account signed-in) — proves the mint shape for a customer user.
  const ctxH = await browser.newContext();
  await ctxH.addCookies([{
    name: "aurelia_session", value: HIJACK_COOKIE, domain: "localhost", path: "/",
    httpOnly: true, secure: false, sameSite: "Lax", expires: Math.floor(Date.now() / 1000) + 86_400,
  }]);
  const pageH = await ctxH.newPage();
  pageH.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  pageH.on("pageerror", (e) => consoleErrors.push(String(e)));
  await pageH.goto(`${BASE}/account`, { waitUntil: "domcontentloaded" });
  const hijackSignedIn = /\/account$/.test(new URL(pageH.url()).pathname) && await pageH.getByRole("heading", { name: /My Account/i }).count() > 0;
  check("the hijacked session is VALID on the wire (renders /account signed-in)", hijackSignedIn, pageH.url());

  // The pre-rotation count on the copy (login A + mint + seed sessions).
  const preRotationCount = dbRead(`(p)=>p.session.count({where:{user:{email:"${EMAIL}"}}})`);
  check("pre-rotation session count = seed + login + mint", preRotationCount === preSessionCount + 2, `${preSessionCount} + 2 vs ${preRotationCount}`);

  // THE ROTATION — the real Settings-tab form on session A.
  await pageA.getByRole("tab", { name: "Settings" }).click();
  await pageA.locator("#current-password").fill(OLD_PASSWORD);
  await pageA.locator("#new-password").fill(NEW_PASSWORD);
  await pageA.locator("#confirm-password").fill(NEW_PASSWORD);
  await pageA.getByRole("button", { name: /update password/i }).click();
  await pollText(pageA.getByRole("status"), /^Password changed\./);
  check("the real form reports 'Password changed.'", true);

  // Server truth — the F-4 contract's two halves.
  const hijackGone = dbRead(`(p)=>p.session.findUnique({where:{token:"${HIJACK_TOKEN}"},select:{id:true}})`);
  check("F-4 REVOKE half: the hijacked session row is GONE", hijackGone === null, JSON.stringify(hijackGone));

  const sessionKept = dbRead(`(p)=>p.session.findUnique({where:{token:"${tokenA}"},select:{id:true}})`);
  check("F-4 KEEP half: session A's row is STILL present", !!sessionKept, JSON.stringify(sessionKept));

  const postCount = dbRead(`(p)=>p.session.count({where:{user:{email:"${EMAIL}"}}})`);
  check("post-rotation count = pre-rotation − 1 (exactly the hijacked row)", postCount === preRotationCount - 1, `${preRotationCount} - 1 vs ${postCount}`);

  // The wire: session A still renders signed-in after the rotation.
  await pageA.goto(`${BASE}/account`, { waitUntil: "domcontentloaded" });
  const keptSignedIn = /\/account$/.test(new URL(pageA.url()).pathname) && await pageA.getByRole("heading", { name: /My Account/i }).count() > 0;
  check("session A still renders /account signed-in after the rotation (wire)", keptSignedIn, pageA.url());

  // The write half — offline scrypt verification of the stored hash.
  const postHash = dbRead(`(p)=>p.user.findUnique({where:{email:"${EMAIL}"},select:{passwordHash:true}})`).passwordHash;
  check("the stored hash verifies the NEW password", verifyOffline(postHash, NEW_PASSWORD));
  check("the stored hash NO LONGER verifies the old password", !verifyOffline(postHash, OLD_PASSWORD));
  check("the hash actually rotated (different bytes)", postHash !== capturedHash);

  // The hijacked context is now dead on the wire (its row is gone).
  await pageH.goto(`${BASE}/account`, { waitUntil: "domcontentloaded" });
  const hijackNowDead = /\/login/.test(new URL(pageH.url()).pathname);
  check("the hijacked cookie now bounces to /login (revoked wire-real)", hijackNowDead, pageH.url());

  // The restore — the captured-hash UPDATE returns the seed password.
  sqlRun(`UPDATE "User" SET "passwordHash"='${capturedHash}' WHERE "email"='${EMAIL}';`);
  const restoredHash = dbRead(`(p)=>p.user.findUnique({where:{email:"${EMAIL}"},select:{passwordHash:true}})`).passwordHash;
  check("the captured-hash restore verifies the seed password again", verifyOffline(restoredHash, OLD_PASSWORD));
  check("the restore is byte-identical to the captured hash", restoredHash === capturedHash);

  // H-24 hygiene: the minted row is gone (F-4 already revoked it); nothing
  // probe-scoped survives on the copy anyway (the copy is deleted below).
  const mintLeftover = dbRead(`(p)=>p.session.findUnique({where:{token:"${HIJACK_TOKEN}"},select:{id:true}})`);
  check("no minted-row leftover after the rotation", mintLeftover === null, JSON.stringify(mintLeftover));

  check("zero unexpected console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

  await browser.close();
  server.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 500));
  server.kill("SIGKILL");

  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  console.log(`\nprobe-session38: ${results.length - failed.length}/${results.length} checks passed`);
  try { fs.unlinkSync(PROBE_DB); } catch { /* best effort */ }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error("PROBE ERROR:", e); process.exit(1); });
