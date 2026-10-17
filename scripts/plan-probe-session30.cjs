#!/usr/bin/env node
// Session-30 plan-validation probe — wire-verifies the F-AA contract
// assumptions BEFORE the spec is written (the session-29 §6 discipline: no
// unverified assumption enters a pin). Boots the standalone on :3204, probes
// the six static transport headers from next.config.ts on three route
// classes (document root, deep PDP route, API route), exits nonzero on any
// assumption failure.
const { spawn } = require("child_process");
const http = require("http");

const PORT = 3204;
const BASE = `http://localhost:${PORT}`;

function req(path) {
  return new Promise((resolve, reject) => {
    const r = http.request(`${BASE}${path}`, { method: "GET" }, (res) => {
      let out = "";
      res.on("data", (c) => (out += c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers }));
    });
    r.on("error", reject);
    r.setTimeout(8000, () => r.destroy(new Error("timeout")));
    r.end();
  });
}

function waitHealth(deadlineMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      req("/api/health")
        .then((r) => (r.status === 200 ? resolve() : retry()))
        .catch(retry);
    };
    const retry = () => {
      if (Date.now() - start > deadlineMs) return reject(new Error("health timeout"));
      setTimeout(tick, 400);
    };
    tick();
  });
}

// The EXACT declaration in next.config.ts async headers() — the values the
// F-AA spec will pin. Node lower-cases header names.
const EXPECTED = {
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "strict-transport-security": "max-age=31536000",
  "x-frame-options": "DENY",
  "permissions-policy":
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "cross-origin-opener-policy": "same-origin",
};

async function main() {
  const results = [];
  const check = (name, cond, detail) =>
    results.push({ name, ok: !!cond, detail: detail || "" });

  for (const route of ["/", "/product/silk-draped-evening-gown", "/api/health"]) {
    const res = await req(route);
    check(`${route} reachable`, res.status === 200 || res.status === 404 ? res.status === 200 : false, `status ${res.status}`);
    for (const [name, want] of Object.entries(EXPECTED)) {
      const got = res.headers[name];
      check(
        `${route} :: ${name}`,
        got === want,
        `want "${want}" got "${got}"`
      );
    }
  }

  const failed = results.filter((r) => !r.ok).length;
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : "  ||  " + r.detail}`);
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exitCode = failed ? 1 : 0;
}

const child = spawn("node", [".next/standalone/server.js"], {
  env: {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: "production",
    AUTH_SECRET: "session30-probe-secret-0123456789abcdef",
    DATABASE_URL: `file:${process.cwd()}/db/custom.db`,
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let stderrTail = "";
child.stderr.on("data", (c) => (stderrTail = (stderrTail + c).slice(-2000)));

waitHealth(20000)
  .then(main)
  .catch((e) => {
    console.error("probe error:", e.message, stderrTail);
    process.exitCode = 1;
  })
  .finally(() => child.kill("SIGTERM"));
