#!/usr/bin/env node
// Session-41 plan-validation probe — wire-verifies the F-LL contract
// assumptions BEFORE the spec is written (the session-29…40 §6 discipline:
// no unverified assumption enters a pin). Boots the standalone on :3209
// against a THROWAWAY COPY of db/custom.db (zero writes touch the dev DB
// or db/e2e.db), then drives the admin dashboard's low-stock read surface
// through the REAL UI on the copy:
//   - the admin session is minted OFFLINE (a random 256-bit token + its
//     HMAC'd cookie, backed by a Session row inserted via prisma db execute
//     with the admin's id resolved by the DB itself — the F-HH/M-1 pattern);
//   - the minted cookie + row render /admin (the role gate passes — the
//     mint's WIRE VALIDITY);
//   - the canonical copy's low-stock baseline is ZERO (the empty-state
//     lock that makes the surface gate-blind today);
//   - the fixture injection lands: 21 active pins (stock=3) + 1 inactive
//     sentinel (stock=3) + 1 threshold sentinel (stock=4, active);
//   - LOAD-BEARING: the Low Stock KPI card (the exact getByText locator
//     the spec will use) reads EXACTLY "21" — the true COUNT (active &&
//     stock <= 3), NOT the take-capped list length (20), NOT the
//     unfiltered count (22);
//   - the alert panel renders: "Low stock alert" + "3 or fewer remaining"
//     + the first pin's name;
//   - the Products KPI reads 35 mid-fixture (12 + 23 — the footprint is
//     measured; the spec's describe sorts AFTER the dashboard test in
//     file order, workers:1, so the isolation holds);
//   - the afterAll DELETE removes exactly the fixture rows (the count
//     returns to 12 — the ONLY cleanup path: global-setup does NOT wipe
//     Product);
//   - zero unexpected console errors.
// Exits nonzero on any assumption failure.
const { spawn, spawnSync } = require("child_process");
const { chromium } = require("playwright");
const { randomBytes, createHmac } = require("node:crypto");
const fs = require("fs");
const path = require("node:path");

const PORT = 3209;
const BASE = `http://localhost:${PORT}`;
const SECRET = "session41-probe-secret-0123456789abcdef";
const ADMIN_EMAIL = "admin@aurelia.com";
const PREFIX = "f-ll-";
const PIN_COUNT = 21; // forces the count-vs-length divergence (the panel list takes 20)

// A throwaway DB copy — absolute URL passes the db-path resolver untouched
// (AGENTS.md pass-through path), so the probe never touches db/custom.db.
const PROBE_DB = `/tmp/probe-session41-${process.pid}.db`;
const PROBE_DB_URL = `file:${PROBE_DB}`;
const REPO = process.cwd();

// The offline mint (the a11y M-1 / F-HH pattern's cookie shape).
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
  const scratch = path.join(REPO, "tests", "e2e", ".probe41.sql");
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

// The fixture: N active pins at stock=3 + the inactive sentinel + the
// threshold sentinel. categoryId resolves by scalar subquery (never
// hardcoded); updatedAt is passed explicitly (@updatedAt has no DB default
// — the H-2 insert's discipline).
function fixtureSql() {
  const row = (slug, name, stock, isActive, sortOrder) =>
    `INSERT INTO "Product" ("id","slug","name","brand","description","price","categoryId","subcategory","sortOrder","stock","isActive","createdAt","updatedAt") ` +
    `VALUES ('${slug}','${slug}','${name}','Probe','session-41 probe fixture row',100,` +
    `(SELECT "id" FROM "Category" WHERE "slug"='accessories' LIMIT 1),'hats',${sortOrder},${stock},${isActive ? 1 : 0},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);`;
  const lines = [
    `DELETE FROM "Product" WHERE "slug" LIKE '${PREFIX}%';`,
    ...Array.from({ length: PIN_COUNT }, (_, i) =>
      row(`${PREFIX}pin-${String(i + 1).padStart(2, "0")}`, `F-LL Pin ${String(i + 1).padStart(2, "0")}`, 3, true, 1001 + i)),
    row(`${PREFIX}inactive-sentinel`, "F-LL Inactive Sentinel", 3, false, 1101),
    row(`${PREFIX}threshold-sentinel`, "F-LL Threshold Sentinel", 4, true, 1102),
  ];
  return lines.join("\n");
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

  // check 1 — the minted ADMIN row (INSERT…SELECT resolves the admin's id in the DB).
  sqlRun(
    `DELETE FROM "Session" WHERE token = '${TOKEN}';\n` +
      `INSERT INTO "Session" (id, token, "userId", "expiresAt", "createdAt") ` +
      `SELECT 'fll-probe-' || '${TOKEN.slice(0, 16)}', '${TOKEN}', id, datetime('now', '+1 day'), datetime('now') ` +
      `FROM "User" WHERE email = '${ADMIN_EMAIL}';`,
  );
  const minted = dbRead(`(p)=>p.session.findUnique({where:{token:"${TOKEN}"},select:{id:true}})`);
  check("the offline-minted ADMIN Session row exists (INSERT…SELECT, admin resolved by the DB)", minted !== null, JSON.stringify(minted));

  // check 2 — the mint's WIRE VALIDITY: the cookie + row render /admin (role gate passes).
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await pollText(page.getByRole("heading", { name: /Admin/i }), /Admin/i);
  const onAdmin = /\/admin$/.test(new URL(page.url()).pathname);
  check("the minted cookie + row render /admin (the role gate passes — wire validity)", onAdmin, page.url());

  // check 3 — the canonical low-stock baseline is ZERO (the empty-state lock).
  const baseline = dbRead(`(p)=>p.product.count({where:{isActive:true,stock:{lte:3}}})`);
  check("the canonical copy's low-stock baseline is ZERO (the empty-state lock)", baseline === 0, `count=${baseline}`);

  // check 4 — the fixture injection lands (23 rows by prefix).
  sqlRun(fixtureSql());
  const fixtureCount = dbRead(`(p)=>p.product.count({where:{slug:{startsWith:"${PREFIX}"}}})`);
  check("the fixture lands: 21 pins + 2 sentinels (23 rows by prefix)", fixtureCount === 23, `count=${fixtureCount}`);

  // check 5 — LOAD-BEARING: the KPI card reads EXACTLY 21 (the true COUNT).
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await pollText(page.getByText("Low Stock", { exact: true }).locator(".."), /\d/);
  const kpiText = (await page.getByText("Low Stock", { exact: true }).locator("..").textContent()) ?? "";
  const kpi = Number(kpiText.replace(/\D+/g, ""));
  check("LOAD-BEARING: the Low Stock KPI reads EXACTLY 21 (the true COUNT: active && stock<=3)", kpi === 21, `kpi=${kpi} raw="${kpiText.trim()}"`);

  // check 6 — the alert panel renders (the read-through half).
  const panel = page.getByText("Low stock alert");
  const panelVisible = await panel.isVisible().catch(() => false);
  const panelText = panelVisible ? ((await panel.locator("..").textContent()) ?? "") : "";
  check(
    "the alert panel renders: heading + '3 or fewer remaining' + the first pin's name",
    panelVisible && panelText.includes("3 or fewer remaining") && panelText.includes("F-LL Pin 01"),
    panelText.slice(0, 120),
  );

  // check 7 — the Products KPI mid-fixture (the measured footprint).
  const productsText = (await page.getByText("Products", { exact: true }).locator("..").textContent()) ?? "";
  const productsKpi = Number(productsText.replace(/\D+/g, ""));
  check("the Products KPI reads 35 mid-fixture (12 + 23 — the measured footprint)", productsKpi === 35, `kpi=${productsKpi}`);

  // check 8 — the afterAll DELETE removes exactly the fixture rows (12 restored).
  sqlRun(
    `DELETE FROM "Product" WHERE "slug" LIKE '${PREFIX}%';\n` +
      `DELETE FROM "Session" WHERE token = '${TOKEN}';`,
  );
  const afterProducts = dbRead(`(p)=>p.product.count()`);
  const afterLow = dbRead(`(p)=>p.product.count({where:{isActive:true,stock:{lte:3}}})`);
  const afterSession = dbRead(`(p)=>p.session.findUnique({where:{token:"${TOKEN}"},select:{id:true}})`);
  check(
    "the afterAll DELETE removes exactly the fixture rows (12 products, 0 low-stock, session gone)",
    afterProducts === 12 && afterLow === 0 && afterSession === null,
    `products=${afterProducts} low=${afterLow} session=${JSON.stringify(afterSession)}`,
  );

  check("zero unexpected console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

  await browser.close();
  server.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 500));
  server.kill("SIGKILL");

  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  console.log(`\nprobe-session41: ${results.length - failed.length}/${results.length} checks passed`);
  try { fs.unlinkSync(PROBE_DB); } catch { /* best effort */ }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error("PROBE ERROR:", e); process.exit(1); });
