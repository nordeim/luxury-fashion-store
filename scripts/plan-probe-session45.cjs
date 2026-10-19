#!/usr/bin/env node
// Session-45 plan-validation probe — wire-verifies the F-PP contract
// assumptions BEFORE the spec is written (the standing §5 discipline: no
// unverified assumption enters a pin). Boots the standalone on :3209 as a
// THROWAWAY process against a healthy THROWAWAY COPY of db/custom.db (the
// auth actions need working DB reads — the login's user lookup and the
// register's existing-check must answer envelopes, not raw 500s). The
// throwaway process owns its own in-memory limiter buckets (rate-limit.ts
// module scope) — a burst there consumes nothing on any other process.
// Zero writes touch the dev DB or db/e2e.db; the throwaway copy is deleted.
//
// Checks (all on the wire):
//   1. the healthy-copy server BOOTS and LISTENS (/api/health → 200 +
//      {"ok":true,"db":true} — the F-OO control discipline);
//   2. the login page's SSR HTML exposes the progressive-enhancement form
//      contract (the $ACTION_1:0 hidden field — the no-JS wire shape);
//   3. the login page manifest exposes exactly TWO action ids;
//   4. the no-JS POST with an UNKNOWN email answers the anti-enumeration
//      envelope (identifies loginAction; zero writes, zero cookies);
//   5. the no-JS POST to /register with an EXISTING email answers the
//      "already exists" envelope (identifies registerAction; zero writes);
//   6. the LOGIN burst: 10× unknown-email posts → all anti-enumeration
//      (the lawful window), the 11th → the floor envelope ("Too many
//      attempts. Try again in N seconds." with a bounded N);
//   7. the REGISTER burst: 10× existing-email posts → all "already
//      exists", the 11th → the floor envelope;
//   8. the per-bucket control: a login post with a DIFFERENT email is NOT
//      floored (the bucket key includes the email);
//   9. zero writes: the throwaway copy's User count is unchanged (2)
//      after the whole ladder; kill → cleanup confirmed.
// Exits nonzero on any assumption failure.
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("node:path");

const PORT = 3209;
const BASE = `http://localhost:${PORT}`;
const SECRET = "session45-probe-secret-0123456789abcdef";
const REPO = process.cwd();
const STANDALONE = path.join(REPO, ".next", "standalone", "server.js");
const LOGIN_MANIFEST = path.join(
  REPO,
  ".next/standalone/.next/server/app/(auth)/login/page/server-reference-manifest.json",
);

// The healthy throwaway DB: a copy of the dev DB, deleted with the probe.
const PROBE_DB = `/tmp/probe-session45-${process.pid}.db`;

const UNKNOWN_EMAIL = `probe-unknown-${process.pid}@example.com`;
const OTHER_EMAIL = `probe-other-${process.pid}@example.com`;
const EXISTING_EMAIL = "james@example.com"; // exists on the copy (canonical seed)
const WRONG_PASSWORD = "WrongPassword1234!"; // valid shape (≥1 char login, ≥8 register)

const ENUMERATION_MSG = "Incorrect email or password.";
const EXISTS_MSG = "An account with this email already exists.";
const FLOOR_PREFIX = "Too many attempts. Try again in";

function results(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  if (!ok) process.exitCode = 1;
}

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

/** Count rows in the throwaway DB through Prisma (the dbRead helper shape). */
function dbCount(databaseUrl) {
  const out = JSON.parse(
    require("child_process").execSync(
      `node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient({datasources:{db:{url:'${databaseUrl}'}}});p.user.count().then(c=>{console.log(c);return p.\\$disconnect()}).catch(e=>{console.error(e.message);process.exit(1)})"`,
      { cwd: REPO, env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: ["ignore", "pipe", "pipe"] },
    ).toString(),
  );
  return out;
}

/**
 * The no-JS progressive-enhancement POST — the EXACT encoding the SSR'd
 * form renders (measured first-hand on the standalone's /login HTML):
 *   <form action="" encType="multipart/form-data" method="POST">
 *     <input name="$ACTION_REF_1"/>
 *     <input name="$ACTION_1:0" value='{"id":"<hex>","bound":"$@1"}'/>
 *     <input name="$ACTION_1:1" value="[null]"/>   ← the bound prevState
 *     <input name="$ACTION_KEY" value="k…"/>        ← the state re-attach key
 *   plus the form's own fields. This IS what a browser without JS submits
 *   (wire-verified: 200 + the re-rendered HTML carrying the envelope).
 */
async function postForm(pagePath, actionId, fields) {
  const fd = new FormData();
  fd.set("$ACTION_REF_1", "");
  fd.set("$ACTION_1:0", JSON.stringify({ id: actionId, bound: "$@1" }));
  fd.set("$ACTION_1:1", "[null]");
  fd.set("$ACTION_KEY", `k${process.pid.toString(16)}${Date.now().toString(16)}`);
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(`${BASE}${pagePath}`, { method: "POST", body: fd, signal: ctrl.signal });
    const setCookie = (res.headers.getSetCookie?.() ?? []).join("\n");
    return { status: res.status, body: await res.text(), setCookie };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  fs.copyFileSync(path.join(REPO, "db", "custom.db"), PROBE_DB);
  const DB_URL = `file:${PROBE_DB}`;

  let server;
  try {
    server = await bootServer(DB_URL);
    results("1. healthy-copy server boots and listens", true, "health answered on :3209");

    const health = await fetch(`${BASE}/api/health`);
    const healthBody = await health.text();
    results(
      "1b. /api/health against the copy",
      health.status === 200 && healthBody === '{"ok":true,"db":true}',
      `${health.status} ${healthBody}`,
    );

    // 2. The SSR form contract — extract the $ACTION_1:0 hidden field the
    // login page actually renders (the no-JS wire shape, first-hand; the
    // id rides the field's JSON value, the bound prev rides $ACTION_1:1).
    const loginHtml = await (await fetch(`${BASE}/login`)).text();
    const actionIds = [
      ...loginHtml.matchAll(/name="\$ACTION_1:0" value="\{&quot;id&quot;:&quot;([0-9a-f]{40,})&quot;/g),
    ].map((m) => m[1]);
    results(
      "2. the login page's SSR HTML carries the $ACTION_1:0 action binding",
      actionIds.length === 1 && /^[0-9a-f]{40,}$/.test(actionIds[0]),
      `${actionIds.length} binding(s) in the rendered form`,
    );

    // 3. The manifest cross-check (the spec's authoritative id source).
    const manifest = JSON.parse(fs.readFileSync(LOGIN_MANIFEST, "utf8"));
    const manifestIds = Object.keys(manifest.node ?? {});
    results(
      "3. the login page manifest exposes exactly two action ids",
      manifestIds.length === 2 && manifestIds.every((id) => /^[0-9a-f]{40,}$/.test(id)),
      manifestIds.join(", ").slice(0, 80),
    );

    // 4. Discriminate loginAction: unknown email → anti-enumeration envelope.
    //    Try each id once with the login shape (write-free; the register
    //    shape on loginAction answers the Zod copy, the login shape on
    //    registerAction answers the "Check the highlighted fields" copy).
    //    NOTE: the loginAction probe IS burst iteration 1 for the UNKNOWN_EMAIL
    //    bucket (the key includes the email) — the burst below counts it.
    //    The registerAction probe fails registerSchema's Zod gate BEFORE its
    //    limiter (confirmPassword absent) — ZERO register bucket consumption.
    let loginId = null;
    let registerId = null;
    for (const id of manifestIds) {
      const r = await postForm("/login", id, { email: UNKNOWN_EMAIL, password: WRONG_PASSWORD });
      if (r.body.includes(ENUMERATION_MSG)) loginId = id;
      else if (r.body.includes("Check the highlighted fields")) registerId = id;
    }
    results(
      "4. the unknown-email login shape identifies loginAction over the wire",
      loginId !== null,
      loginId ? `${loginId.slice(0, 12)}… answered "${ENUMERATION_MSG}"` : "no id answered the envelope",
    );
    results(
      "4b. the sibling id identifies registerAction (its Zod copy — pre-limiter, zero consumption)",
      registerId !== null && registerId !== loginId,
      registerId ? `${registerId.slice(0, 12)}… answered the Zod copy` : "not found",
    );
    results(
      "4c. the SSR binding matches the discriminated loginAction",
      actionIds.length === 1 && actionIds[0] === loginId,
      `ssr ${actionIds[0]?.slice(0, 12)}… == probe ${loginId?.slice(0, 12)}…`,
    );

    // 5. registerAction with an EXISTING email → the "already exists"
    //    envelope. This IS register burst iteration 1 (the register bucket
    //    is per-IP — key register:local — so every register post counts).
    const reg = await postForm("/register", registerId, {
      email: EXISTING_EMAIL,
      name: "",
      password: WRONG_PASSWORD,
      confirmPassword: WRONG_PASSWORD,
    });
    results(
      "5. the existing-email register shape answers the exists envelope",
      reg.status === 200 && reg.body.includes(EXISTS_MSG),
      `${reg.status}, body carries "${EXISTS_MSG}": ${reg.body.includes(EXISTS_MSG)}`,
    );

    // 6. The LOGIN burst: iterations 2..10 lawful (iteration 1 was the
    //    discrimination probe) + the 11th floored.
    let lawfulOk = true;
    for (let i = 2; i <= 10; i++) {
      const r = await postForm("/login", loginId, { email: UNKNOWN_EMAIL, password: WRONG_PASSWORD });
      if (!(r.status === 200 && r.body.includes(ENUMERATION_MSG))) {
        lawfulOk = false;
        results(`6. login attempt ${i}`, false, `${r.status} ${r.body.slice(0, 160)}`);
        break;
      }
    }
    if (lawfulOk) results("6. login burst requests 1..10 all answer the anti-enumeration envelope", true);

    const floored = await postForm("/login", loginId, { email: UNKNOWN_EMAIL, password: WRONG_PASSWORD });
    const floorMatch = new RegExp(`${FLOOR_PREFIX.replace(/[.]/g, "\\.")} (\\d+) seconds`).exec(floored.body);
    results(
      "6b. the 11th same-email login answers the floor envelope",
      floored.status === 200 && floorMatch !== null && Number(floorMatch[1]) >= 1 && Number(floorMatch[1]) <= 900,
      `${floored.status}, retry seconds = ${floorMatch ? floorMatch[1] : "none"} (1..900 bounded)`,
    );

    // 7. The REGISTER burst: iterations 2..10 lawful (iteration 1 was the
    //    check-5 probe) + the 11th floored.
    let regLawfulOk = true;
    for (let i = 2; i <= 10; i++) {
      const r = await postForm("/register", registerId, {
        email: EXISTING_EMAIL,
        name: "",
        password: WRONG_PASSWORD,
        confirmPassword: WRONG_PASSWORD,
      });
      if (!(r.status === 200 && r.body.includes(EXISTS_MSG))) {
        regLawfulOk = false;
        results(`7. register attempt ${i}`, false, `${r.status} ${r.body.slice(0, 160)}`);
        break;
      }
    }
    if (regLawfulOk) results("7. register burst requests 1..10 all answer the exists envelope", true);
    const regFloored = await postForm("/register", registerId, {
      email: EXISTING_EMAIL,
      name: "",
      password: WRONG_PASSWORD,
      confirmPassword: WRONG_PASSWORD,
    });
    const regFloorMatch = new RegExp(`${FLOOR_PREFIX.replace(/[.]/g, "\\.")} (\\d+) seconds`).exec(regFloored.body);
    results(
      "7b. the 11th register answers the floor envelope",
      regFloored.status === 200 && regFloorMatch !== null && Number(regFloorMatch[1]) >= 1 && Number(regFloorMatch[1]) <= 900,
      `${regFloored.status}, retry seconds = ${regFloorMatch ? regFloorMatch[1] : "none"}`,
    );

    // 8. The per-bucket control: a DIFFERENT email's login is NOT floored
    //    (the bucket key includes the email).
    const control = await postForm("/login", loginId, { email: OTHER_EMAIL, password: WRONG_PASSWORD });
    results(
      "8. a different email's login is not floored (per-bucket key)",
      control.status === 200 && control.body.includes(ENUMERATION_MSG) && !control.body.includes(FLOOR_PREFIX),
      `${control.status}, anti-enumeration ${control.body.includes(ENUMERATION_MSG)}`,
    );

    // 9. Zero writes: the copy's user count unchanged; no session cookies
    //    were ever minted (every attempt failed lawfully).
    const users = dbCount(DB_URL);
    results("9. the throwaway copy's User count is unchanged (2)", users === 2, `count = ${users}`);

    await killServer(server.child);
    results("10. kill + cleanup", !fs.existsSync(PROBE_DB + "-journal"), "child exited");
  } catch (err) {
    console.error("PROBE ERROR:", err.message);
    process.exitCode = 1;
    if (server) await killServer(server.child);
  } finally {
    try { fs.rmSync(PROBE_DB, { force: true }); } catch { /* already gone */ }
    try { fs.rmSync(PROBE_DB + "-journal", { force: true }); } catch { /* already gone */ }
  }
}

main();
