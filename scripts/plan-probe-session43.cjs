#!/usr/bin/env node
// Session-43 plan-validation probe — wire-verifies the F-NN contract
// assumptions BEFORE the spec is written (the session-29…42 §6 discipline:
// no unverified assumption enters a pin). Boots the standalone on :3209
// against a THROWAWAY COPY of db/custom.db (zero writes touch the dev DB
// or db/e2e.db):
//   - the EXPIRED james session is minted OFFLINE (a random 256-bit token +
//     its HMAC'd cookie, backed by a Session row inserted via prisma db
//     execute with james's id resolved by the DB itself — the F-II/F-KK
//     pattern) with expiresAt = datetime('now', '-1 day') — PAST;
//   - the mint's WIRE DENIAL: the cookie + expired row bounce /account to
//     /login (the TTL revoke — the session denylist's expiry enforcement);
//   - the bounce URL shape (/login?redirect=/account);
//   - the CONTROL mint (a second, FUTURE-expiry row + cookie on a fresh
//     context) renders /account signed-in — proving the denial is the
//     EXPIRY, not a broken mint (the false-positive guard);
//   - LOAD-BEARING: the expired row is PRUNED after the read (server-truth
//     dbRead -> null — auth.ts:133's inline delete);
//   - the control row is NOT pruned (the prune targets only expired rows);
//   - zero unexpected console errors.
// Exits nonzero on any assumption failure.
const { spawn, spawnSync } = require("child_process");
const { chromium } = require("playwright");
const { randomBytes, createHmac } = require("node:crypto");
const fs = require("fs");
const path = require("node:path");

const PORT = 3209;
const BASE = `http://localhost:${PORT}`;
const SECRET = "session43-probe-secret-0123456789abcdef";
const USER_EMAIL = "james@example.com";

// A throwaway DB copy — absolute URL passes the db-path resolver untouched
// (AGENTS.md pass-through path), so the probe never touches db/custom.db.
const PROBE_DB = `/tmp/probe-session43-${process.pid}.db`;
const PROBE_DB_URL = `file:${PROBE_DB}`;
const REPO = process.cwd();

// The offline mints (the F-II / F-KK cookie shape).
const EXPIRED_TOKEN = randomBytes(32).toString("hex");
const CONTROL_TOKEN = randomBytes(32).toString("hex");
const expiredCookie = `${EXPIRED_TOKEN}.${createHmac("sha256", SECRET).update(EXPIRED_TOKEN).digest("base64url")}`;
const controlCookie = `${CONTROL_TOKEN}.${createHmac("sha256", SECRET).update(CONTROL_TOKEN).digest("base64url")}`;

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
  const scratch = path.join(REPO, "tests", "e2e", ".probe43.sql");
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
  const listenErrors = (page) => {
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
    page.on("pageerror", (e) => consoleErrors.push(String(e)));
  };

  // THE EXPIRED MINT — expiresAt = datetime('now', '-1 day') (PAST).
  sqlRun(
    `DELETE FROM "Session" WHERE token = '${EXPIRED_TOKEN}' OR token = '${CONTROL_TOKEN}';\n` +
      `INSERT INTO "Session" (id, token, "userId", "expiresAt", "createdAt") ` +
      `SELECT 'fnn-probe-exp-' || '${EXPIRED_TOKEN.slice(0, 16)}', '${EXPIRED_TOKEN}', id, datetime('now', '-1 day'), datetime('now', '-2 day') ` +
      `FROM "User" WHERE email = '${USER_EMAIL}';\n` +
      `INSERT INTO "Session" (id, token, "userId", "expiresAt", "createdAt") ` +
      `SELECT 'fnn-probe-ctl-' || '${CONTROL_TOKEN.slice(0, 16)}', '${CONTROL_TOKEN}', id, datetime('now', '+1 day'), datetime('now') ` +
      `FROM "User" WHERE email = '${USER_EMAIL}';`,
  );

  // check 1 — the minted EXPIRED row exists.
  const expiredRow = dbRead(`(p)=>p.session.findUnique({where:{token:"${EXPIRED_TOKEN}"},select:{id:true,expiresAt:true}})`);
  check("the offline-minted EXPIRED james Session row exists (INSERT…SELECT, PAST expiresAt)", expiredRow !== null, JSON.stringify(expiredRow));

  // check 2 — the mint's WIRE DENIAL: the expired cookie + row bounce
  // /account to /login (the TTL revoke).
  const expCtx = await browser.newContext();
  await expCtx.addCookies([
    { name: "aurelia_session", value: expiredCookie, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax", expires: Math.floor(Date.now() / 1000) + 86_400 },
  ]);
  const expPage = await expCtx.newPage();
  listenErrors(expPage);
  await expPage.goto(`${BASE}/account`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 800));
  const bounced = /\/login/.test(new URL(expPage.url()).pathname + new URL(expPage.url()).search);
  check("WIRE DENIAL: the expired cookie + row bounce /account to /login (the TTL revoke)", bounced, expPage.url());

  // check 3 — the bounce URL shape carries the redirect param.
  const bouncedShape = /\/login\?redirect=%2Faccount|\/login\?redirect=\/account/.test(new URL(expPage.url()).href);
  check("the bounce URL shape is /login?redirect=/account", bouncedShape, expPage.url());

  // check 4 — the CONTROL mint (FUTURE expiry, fresh context) renders
  // /account signed-in — the denial above is the EXPIRY, not a broken mint.
  const ctlCtx = await browser.newContext();
  await ctlCtx.addCookies([
    { name: "aurelia_session", value: controlCookie, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax", expires: Math.floor(Date.now() / 1000) + 86_400 },
  ]);
  const ctlPage = await ctlCtx.newPage();
  listenErrors(ctlPage);
  await ctlPage.goto(`${BASE}/account`, { waitUntil: "domcontentloaded" });
  const heading = ctlPage.getByRole("heading", { name: /account/i }).first();
  const signedIn = await heading.waitFor({ timeout: 10_000 }).then(() => true).catch(() => false);
  check("CONTROL: a FUTURE-expiry mint renders /account signed-in (the denial is the EXPIRY, not the mint)", signedIn, ctlPage.url());

  // check 5 — LOAD-BEARING: the expired row is PRUNED after the read.
  const pruned = dbRead(`(p)=>p.session.findUnique({where:{token:"${EXPIRED_TOKEN}"},select:{id:true}})`);
  check("LOAD-BEARING: the expired row is PRUNED after the read (auth.ts:133's inline delete)", pruned === null, JSON.stringify(pruned));

  // check 6 — the control row is NOT pruned (the prune targets only expired rows).
  const ctlRow = dbRead(`(p)=>p.session.findUnique({where:{token:"${CONTROL_TOKEN}"},select:{id:true}})`);
  check("the CONTROL row is NOT pruned (the prune targets only expired rows)", ctlRow !== null, JSON.stringify(ctlRow));

  // check 7 — zero unexpected console errors.
  check("zero unexpected console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

  await browser.close();
  server.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 500));
  server.kill("SIGKILL");

  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  console.log(`\nprobe-session43: ${results.length - failed.length}/${results.length} checks passed`);
  try { fs.unlinkSync(PROBE_DB); } catch { /* best effort */ }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error("PROBE ERROR:", e); process.exit(1); });
