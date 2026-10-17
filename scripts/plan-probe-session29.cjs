#!/usr/bin/env node
// Session-29 plan-validation probe — wire-verifies the F-Y contract
// assumptions BEFORE the spec is written (the §6 discipline: no unverified
// assumption enters a pin). Boots the standalone on :3203, probes the three
// route handlers, exits nonzero on any assumption failure.
const { spawn } = require("child_process");
const http = require("http");

const PORT = 3203;
const BASE = `http://localhost:${PORT}`;

function req(method, path, body, contentType) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(body) : null;
    const headers = {};
    if (data) {
      headers["content-length"] = data.length;
      headers["content-type"] = contentType || "application/json";
    }
    const r = http.request(`${BASE}${path}`, { method, headers }, (res) => {
      let out = "";
      res.on("data", (c) => (out += c));
      res.on("end", () =>
        resolve({ status: res.statusCode, headers: res.headers, body: out })
      );
    });
    r.on("error", reject);
    r.setTimeout(8000, () => r.destroy(new Error("timeout")));
    if (data) r.write(data);
    r.end();
  });
}

function waitHealth(deadlineMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      req("GET", "/api/health")
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

async function main() {
  const results = [];
  const check = (name, cond, detail) =>
    results.push({ name, ok: !!cond, detail: detail || "" });

  // --- health ---
  const h = await req("GET", "/api/health");
  check("health 200 + ok:true + db:true", h.status === 200 && h.body === '{"ok":true,"db":true}', `${h.status} ${h.body}`);
  check("health content-type json", (h.headers["content-type"] || "").includes("application/json"), h.headers["content-type"]);

  // --- search ---
  const sEmpty = await req("GET", "/api/search");
  check("search empty-q 200 {ok,results:[]}", sEmpty.status === 200 && sEmpty.body === '{"ok":true,"results":[]}', `${sEmpty.status} ${sEmpty.body}`);

  const sHit = await req("GET", "/api/search?q=silk");
  const hit = JSON.parse(sHit.body);
  check(
    "search hit 200 + first result is the canonical PDP with the five-field DTO",
    sHit.status === 200 &&
      hit.ok === true &&
      hit.results.length > 0 &&
      hit.results[0].slug === "silk-draped-evening-gown" &&
      typeof hit.results[0].name === "string" &&
      typeof hit.results[0].brand === "string" &&
      typeof hit.results[0].image === "string" &&
      hit.results[0].image.startsWith("http") &&
      Number.isInteger(hit.results[0].price),
    JSON.stringify(hit.results[0] || {}).slice(0, 160)
  );

  const sNo = await req("GET", "/api/search?q=zzzznothing9999");
  check("search no-hit degrades 200 + []", sNo.status === 200 && JSON.parse(sNo.body).results.length === 0, `${sNo.status} ${sNo.body}`);

  const sLim = await req("GET", "/api/search?q=e&limit=1");
  check("search limit=1 returns exactly 1", sLim.status === 200 && JSON.parse(sLim.body).results.length === 1, `len=${JSON.parse(sLim.body).results.length}`);

  // --- newsletter (spec-unique probe email) ---
  const nOk = await req("POST", "/api/newsletter", JSON.stringify({ email: "probe29@example.com" }));
  check("newsletter valid 200 {ok:true}", nOk.status === 200 && nOk.body === '{"ok":true}', `${nOk.status} ${nOk.body}`);

  const nAgain = await req("POST", "/api/newsletter", JSON.stringify({ email: "probe29@example.com" }));
  check("newsletter repeat idempotent 200", nAgain.status === 200 && nAgain.body === '{"ok":true}', `${nAgain.status} ${nAgain.body}`);

  const nBad = await req("POST", "/api/newsletter", JSON.stringify({ email: "notanemail" }));
  const badBody = JSON.parse(nBad.body);
  check("newsletter invalid 400 {ok:false,error}", nBad.status === 400 && badBody.ok === false && typeof badBody.error === "string" && badBody.error.length > 0, `${nBad.status} ${nBad.body}`);

  const nMal = await req("POST", "/api/newsletter", "garbage", "text/plain");
  check("newsletter malformed 400 {ok:false}", nMal.status === 400 && JSON.parse(nMal.body).ok === false, `${nMal.status} ${nMal.body}`);

  // --- method matrix ---
  const mSearch = await req("POST", "/api/search", "{}");
  check("POST /api/search 405", mSearch.status === 405, `${mSearch.status}`);
  const mNews = await req("GET", "/api/newsletter");
  check("GET /api/newsletter 405", mNews.status === 405, `${mNews.status}`);
  const mHealth = await req("POST", "/api/health", "{}");
  check("POST /api/health 405", mHealth.status === 405, `${mHealth.status}`);

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
    AUTH_SECRET: "session29-probe-secret-0123456789abcdef",
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
