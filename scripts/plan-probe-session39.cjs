#!/usr/bin/env node
// Session-39 plan-validation probe — wire-verifies the F-JJ contract
// assumptions BEFORE the spec is written (the session-29…38 §6 discipline:
// no unverified assumption enters a pin). Boots the standalone on :3209
// against a THROWAWAY COPY of db/custom.db (zero writes touch the dev DB
// or db/e2e.db), then drives the profile-save flow through the REAL UI
// on the copy:
//   - login as james through the real form (the form's session);
//   - the Profile tab's real form saves a run-unique name
//     (#profile-name → Save Changes → "Profile updated.");
//   - server truth: the User row's name IS the new name (the WRITE half —
//     the toast CANNOT see this), the email UNTOUCHED;
//   - the wire: a fresh /account render prefills #profile-name with the
//     NEW name (the write landed; the form's defaultValue flows from the
//     server prop through the RSC render);
//   - the restore: the captured-name UPDATE returns the account to the
//     seed name byte-identically;
//   - zero unexpected console errors.
// Exits nonzero on any assumption failure.
const { spawn, spawnSync } = require("child_process");
const { chromium } = require("playwright");
const { randomBytes } = require("node:crypto");
const fs = require("fs");
const path = require("node:path");

const PORT = 3209;
const BASE = `http://localhost:${PORT}`;
const SECRET = "session39-probe-secret-0123456789abcdef";
const EMAIL = "james@example.com";
const PASSWORD = "Demo1234!";
const NEW_NAME = "James E2E Profile probe39a7f";

// A throwaway DB copy — absolute URL passes the db-path resolver untouched
// (AGENTS.md pass-through path), so the probe never touches db/custom.db.
const PROBE_DB = `/tmp/probe-session39-${process.pid}.db`;
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
  const scratch = path.join(REPO, "tests", "e2e", ".probe39.sql");
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

  // Capture the pre-save truth on the copy.
  const pre = dbRead(
    `(p)=>p.user.findUnique({where:{email:"${EMAIL}"},select:{name:true,email:true}})`,
  );
  if (!pre) throw new Error("probe fixture missing: james");
  const capturedName = pre.name;
  check("the canonical name fixture exists (runtime capture)", typeof capturedName === "string" && capturedName.length > 0, JSON.stringify(capturedName));

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

  // The form's session — a real login.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/account/, { timeout: 15_000 });
  check("login lands /account (the form's session)", /\/account$/.test(new URL(page.url()).pathname), page.url());

  // The Profile tab's real form.
  await page.getByRole("tab", { name: "Profile" }).click();
  const inputVisible = await page.locator("#profile-name").isVisible();
  check("the Profile tab mounts the #profile-name form", inputVisible);
  const prefilled = await page.locator("#profile-name").inputValue();
  check("the form prefills the CURRENT name from the server prop", prefilled === capturedName, `${prefilled} vs ${capturedName}`);

  // THE SAVE — the real form with a run-unique name.
  await page.locator("#profile-name").fill(NEW_NAME);
  await page.getByRole("button", { name: /save changes/i }).click();
  await pollText(page.getByRole("status"), /^Profile updated\./);
  check("the real form reports 'Profile updated.'", true);

  // Server truth — the WRITE half (the toast CANNOT see this).
  const post = dbRead(
    `(p)=>p.user.findUnique({where:{email:"${EMAIL}"},select:{name:true,email:true}})`,
  );
  check("WRITE half (LOAD-BEARING): the User row's name IS the new name", post.name === NEW_NAME, JSON.stringify(post));
  check("the email is UNTOUCHED by the save", post.email === EMAIL, JSON.stringify(post.email));

  // The wire — a fresh /account render prefills the NEW name (the write
  // landed; the form's defaultValue flows from the server prop).
  await page.goto(`${BASE}/account`, { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Profile" }).click();
  const refilled = await page.locator("#profile-name").inputValue();
  check("wire-real: a fresh render prefills the NEW name", refilled === NEW_NAME, refilled);

  // The restore — the captured-name UPDATE returns the account to the seed name.
  sqlRun(`UPDATE "User" SET name='${capturedName.replace(/'/g, "''")}' WHERE "email"='${EMAIL}';`);
  const restored = dbRead(`(p)=>p.user.findUnique({where:{email:"${EMAIL}"},select:{name:true}})`);
  check("the captured-name restore returns the seed name byte-identically", restored.name === capturedName, JSON.stringify(restored));
  await page.goto(`${BASE}/account`, { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Profile" }).click();
  const restoredRender = await page.locator("#profile-name").inputValue();
  check("a fresh render after the restore prefills the ORIGINAL name (restore wire-real)", restoredRender === capturedName, restoredRender);

  check("zero unexpected console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

  await browser.close();
  server.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 500));
  server.kill("SIGKILL");

  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  console.log(`\nprobe-session39: ${results.length - failed.length}/${results.length} checks passed`);
  try { fs.unlinkSync(PROBE_DB); } catch { /* best effort */ }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error("PROBE ERROR:", e); process.exit(1); });
