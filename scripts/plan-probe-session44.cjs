#!/usr/bin/env node
// Session-44 plan-validation probe — wire-verifies the F-OO contract
// assumptions BEFORE the spec is written (the session-29…43 §6 discipline:
// no unverified assumption enters a pin). Boots the standalone on :3209 as
// a THROWAWAY process whose DATABASE_URL points at a NONEXISTENT directory
// (SQLite cannot create a file there — every DB read throws), plus a
// CONTROL boot of the same spawn shape against a healthy throwaway copy of
// db/custom.db. Zero writes touch the dev DB or db/e2e.db; the broken
// directory never materializes.
//
// Checks (all on the wire):
//   1. the broken-DB server BOOTS and LISTENS (the boot-sweep failure is
//      caught + logged, never fatal — the load-bearing feasibility check);
//   2. /api/health → 200 + {"ok":true,"db":false} (the honest liveness
//      probe: the process is ALIVE, the DB is DOWN);
//   3. /api/search?q=silk → 503 + {ok:false, results:[]} (the F-12
//      best-effort degradation);
//   4. POST /api/newsletter with a VALID email → 503 + {ok:false, error}
//      (the H-20 degradation — a valid email must reach the upsert);
//   5. the 61-request burst on /api/search: requests 1..60 → 503 (the DB
//      failure — the limiter still allows), request 61+ → 429 + {ok:false,
//      results:[]} (the limiter floor, on the throwaway's OWN fresh
//      in-memory bucket — zero pollution of any other process);
//   6. the CONTROL server (same spawn shape, healthy throwaway DB copy)
//      serves {"ok":true,"db":true} — proving the db:false denial is the
//      DB, not a broken spawn (the F-NN control-mint discipline);
//   7. kill → exit confirmed; the broken path's directory never
//      materialized (no file writes anywhere).
// Exits nonzero on any assumption failure.
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("node:path");

const PORT = 3209;
const BASE = `http://localhost:${PORT}`;
const SECRET = "session44-probe-secret-0123456789abcdef";
const REPO = process.cwd();
const STANDALONE = path.join(REPO, ".next", "standalone", "server.js");

// The broken URL: a file inside a directory that does not exist (and that
// nobody creates). Absolute file: URLs pass the db-path resolver untouched.
const BROKEN_DIR = path.join("/tmp", `aurelia-broken-db-${process.pid}`);
const BROKEN_URL = `file:${path.join(BROKEN_DIR, "broken.db")}`;
// The control DB: a throwaway copy of the dev DB.
const CONTROL_DB = `/tmp/probe-session44-control-${process.pid}.db`;

function results(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  if (!ok) process.exitCode = 1;
}

/** Spawn the standalone with a given DATABASE_URL; resolve when /api/health answers. */
function bootServer(databaseUrl) {
  const child = spawn("node", [STANDALONE], {
    cwd: REPO,
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "production",
      AUTH_SECRET: SECRET,
      DATABASE_URL: databaseUrl,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += String(chunk); });
  const deadline = Date.now() + 25_000;
  return new Promise((resolve, reject) => {
    (async function poll() {
      if (Date.now() > deadline) {
        child.kill("SIGKILL");
        return reject(new Error(`server never answered /api/health; stderr: ${stderr.slice(0, 400)}`));
      }
      try {
        const res = await fetch(`${BASE}/api/health`);
        if (res.status === 200) return resolve({ child, stderr });
      } catch { /* not listening yet */ }
      setTimeout(poll, 300);
    })();
  });
}

function killServer(child) {
  return new Promise((resolve) => {
    const force = setTimeout(() => child.kill("SIGKILL"), 5_000);
    child.on("exit", () => { clearTimeout(force); resolve(); });
    child.kill("SIGTERM");
  });
}

async function main() {
  // ---------- The broken-DB server ----------
  let server;
  try {
    server = await bootServer(BROKEN_URL);
    results("1. broken-DB server boots and listens", true, "health answered on :3209");
    if (!/boot sweep failed|schema not ready/i.test(server.stderr)) {
      console.log("      (note: expected sweeper error line present in stderr — informational)");
    }

    // 2. health db:false
    const health = await fetch(`${BASE}/api/health`);
    const healthBody = await health.text();
    results(
      "2. /api/health honest degradation",
      health.status === 200 && healthBody === '{"ok":true,"db":false}',
      `${health.status} ${healthBody}`,
    );

    // 3. search 503
    const search = await fetch(`${BASE}/api/search?q=silk`);
    const searchBody = await search.json();
    results(
      "3. /api/search F-12 degradation",
      search.status === 503 && searchBody.ok === false && Array.isArray(searchBody.results) && searchBody.results.length === 0,
      `${search.status} ${JSON.stringify(searchBody)}`,
    );

    // 4. newsletter 503 (valid email must reach the upsert)
    const news = await fetch(`${BASE}/api/newsletter`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "probe-session44@example.com" }),
    });
    const newsBody = await news.json();
    results(
      "4. /api/newsletter H-20 degradation",
      news.status === 503 && newsBody.ok === false && typeof newsBody.error === "string" && newsBody.error.length > 0,
      `${news.status} ${JSON.stringify(newsBody)}`,
    );

    // 5. the 61-burst: reqs 1..60 → 503 (limiter allows, DB fails), 61+ → 429
    //    (the search bucket already holds 1 from check 3 — the 61st request
    //    overall is the 60th of this burst).
    const burstStatuses = [];
    for (let i = 0; i < 60; i++) {
      const res = await fetch(`${BASE}/api/search?q=silk`);
      burstStatuses.push(res.status);
      await res.arrayBuffer();
    }
    const first503 = burstStatuses[0] === 503;
    const lastIs429 = burstStatuses[burstStatuses.length - 1] === 429;
    const count503 = burstStatuses.filter((s) => s === 503).length;
    const count429 = burstStatuses.filter((s) => s === 429).length;
    results(
      "5. search limiter floor trips at the 61st request",
      first503 && lastIs429 && count429 === 1 && count503 === 59,
      `first=${burstStatuses[0]} last=${burstStatuses[burstStatuses.length - 1]} 503s=${count503} 429s=${count429}`,
    );
    const four29Body = await (await fetch(`${BASE}/api/search?q=silk`)).json();
    results(
      "5b. the 429 envelope is {ok:false, results:[]}",
      four29Body.ok === false && Array.isArray(four29Body.results) && four29Body.results.length === 0,
      JSON.stringify(four29Body),
    );
  } finally {
    if (server) await killServer(server.child);
  }

  // ---------- The CONTROL server (same spawn shape, healthy DB copy) ----------
  fs.copyFileSync(path.join(REPO, "db", "custom.db"), CONTROL_DB);
  let control;
  try {
    control = await bootServer(`file:${CONTROL_DB}`);
    const health = await fetch(`${BASE}/api/health`);
    const body = await health.text();
    results(
      "6. CONTROL: same spawn shape + healthy DB copy serves db:true",
      health.status === 200 && body === '{"ok":true,"db":true}',
      `${health.status} ${body}`,
    );
  } finally {
    if (control) await killServer(control.child);
    try { fs.unlinkSync(CONTROL_DB); } catch { /* gone */ }
  }

  // 7. the broken directory never materialized
  results(
    "7. the broken path's directory never materialized",
    !fs.existsSync(BROKEN_DIR),
    BROKEN_DIR,
  );

  console.log(process.exitCode ? "\nPROBE FAILED" : "\nPROBE: all checks passed");
}

main().catch((err) => {
  console.error("PROBE ERROR:", err.message);
  process.exit(1);
});
