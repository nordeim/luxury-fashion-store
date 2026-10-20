#!/usr/bin/env node
// Session-49 follow-up probe — documents the raw-fetch vs browser-DOM
// metadata discrepancy the E2E spec caught: the plan probe's check-7
// measured the pre-stream SHELL title ('AURELIA') while the browser
// resolves the streamed segment metadata (the product's name). This
// throwaway measures BOTH layers first-hand on the copy DB.
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");

const PORT = 3209;
const BASE = `http://localhost:${PORT}`;
const REPO = process.cwd();
const STANDALONE = path.join(REPO, ".next", "standalone", "server.js");
const TMPDIR = fs.mkdtempSync(path.join(os.tmpdir(), `probe49b-${process.pid}-`));
const PROBE_DB = path.join(TMPDIR, "copy.db");
const PROBE_DB_URL = `file:${PROBE_DB}`;
const SUFFIX = crypto.randomBytes(4).toString("hex");
const SLUG = `ftt-leak-${SUFFIX}`;
const NAME = `F-TT Leak Probe ${SUFFIX}`;

function sqlRun(sql) {
  const file = path.join(TMPDIR, "fixture.sql");
  fs.writeFileSync(file, sql);
  const res = spawnSync("npx", ["prisma", "db", "execute", "--schema", path.join(REPO, "prisma", "schema.prisma"), "--file", file], {
    cwd: REPO, env: { ...process.env, DATABASE_URL: PROBE_DB_URL }, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8",
  });
  if (res.status !== 0) throw new Error(`sqlRun failed: ${res.stderr?.slice(0, 300)}`);
  fs.unlinkSync(file);
}

(async function main() {
  let child = null;
  try {
    fs.copyFileSync(path.join(REPO, "db", "custom.db"), PROBE_DB);
    sqlRun(
      `INSERT INTO "Product" ("id","slug","name","brand","description","price","categoryId","subcategory","sortOrder","stock","isActive","createdAt","updatedAt") ` +
        `SELECT 'ftt-leak-${SUFFIX}','${SLUG}','${NAME}','Probe Atelier','x',19900, ` +
        `(SELECT "id" FROM "Category" WHERE "slug"='accessories' LIMIT 1),'hats',999,0,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP;`,
    );
    child = spawn("node", [STANDALONE], {
      cwd: REPO,
      env: { ...process.env, PORT: String(PORT), NODE_ENV: "production", AUTH_SECRET: "probe49b-secret-0123456789abcdef", DATABASE_URL: PROBE_DB_URL },
      stdio: ["ignore", "pipe", "pipe"],
    });
    // boot wait
    for (let i = 0; i < 60; i++) {
      try { const r = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(1500) }); if (r.ok) break; } catch {}
      await new Promise((r) => setTimeout(r, 400));
    }
    const html = await (await fetch(`${BASE}/product/${SLUG}`, { signal: AbortSignal.timeout(15_000) })).text();
    const titles = [...html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => m[1]);
    const ogTags = [...html.matchAll(/<meta[^>]+property="og:image"[^>]*>/gi)].map((m) => m[0]);
    const priceTags = [...html.matchAll(/<meta[^>]+name="product:price:amount"[^>]*>/gi)].map((m) => m[0]);
    console.log("HTTP-level (raw fetch):");
    console.log("  title matches:", JSON.stringify(titles));
    console.log("  product name present anywhere in raw HTML:", html.includes(NAME));
    console.log("  og:image tags:", JSON.stringify(ogTags));
    console.log("  price tags:", JSON.stringify(priceTags));
    // Where does the name appear? Print 80 chars of context around each hit.
    let idx = 0, hits = 0;
    while (hits < 3) {
      const at = html.indexOf(NAME, idx);
      if (at < 0) break;
      console.log(`  context@${at}:`, JSON.stringify(html.slice(Math.max(0, at - 120), at + 60)));
      idx = at + 1; hits++;
    }
  } catch (err) {
    console.error("PROBE ERROR:", err.message);
    process.exitCode = 1;
  } finally {
    if (child) { child.kill("SIGTERM"); await new Promise((r) => setTimeout(r, 500)); child.kill("SIGKILL"); }
    fs.rmSync(TMPDIR, { recursive: true, force: true });
  }
})();
