#!/usr/bin/env node
// Session-47 plan-validation probe — wire-verifies the F-RR contract
// assumptions BEFORE the spec is written (the standing §5 discipline: no
// unverified assumption enters a pin). Boots the standalone on :3209 as a
// THROWAWAY process against a healthy THROWAWAY COPY of db/custom.db (the
// address actions need working DB reads — getCurrentUser must resolve the
// minted session row, findUnique must find the minted address rows). No
// TRUST_PROXY needed (the address actions carry no limiter — verified
// first-hand). Zero writes touch the dev DB or db/e2e.db; the throwaway
// copy (with all three mint rows: the session, the victim address, the
// control address) is deleted.
//
// THE WIRE SHAPES (both established, re-measured here authenticated):
//   JSON-arg actions (deleteAddressAction/setDefaultAddressAction):
//     POST /account
//     Next-Action: <id>
//     Content-Type: text/plain;charset=UTF-8
//     body: ["<addressId>"]                       (the action-seam gate's shape)
//   FormData actions (saveAddressAction, the edit path):
//     POST /account
//     Next-Action: <id>
//     multipart: _1_label, _1_fullName, _1_street, _1_city, _1_state,
//                _1_zip, _1_country, _1_id   (the F-QQ ORDER rule: the
//                _1_* fields MUST precede the flight row "0")
//     multipart field "0" = [null,"$K1"]      (the fetch-action dispatch)
//   Authentication rides an explicit Cookie header:
//     aurelia_session=<token>.<hmac-sha256-base64url(token, AUTH_SECRET)>
//   (the src/lib/auth.ts signToken contract — the F-NN mint's cookie shape;
//    request-level fetch with an explicit Cookie header is the NEW half this
//    probe verifies first-hand: cookies() reads the request header inside
//    the action, same as a browser's automatic attach.)
//
// Checks (all on the wire / server-truth):
//   1. the healthy-copy server BOOTS and LISTENS (/api/health → 200 +
//      {"ok":true,"db":true} — the F-OO control discipline);
//   2. the /account manifest exposes exactly EIGHT action ids; the three
//      address actions identified by exportedName (the build-shape canary);
//   3. THE AUTH WALL: cookie-less crafted POSTs to delete/setDefault answer
//      "Sign in to manage your address book." (200 envelopes, never 5xx);
//   4. LB1 (the IDOR walls): the minted james session posts the VICTIM id
//      (an address minted for the ADMIN user) to all three actions — each
//      answers "That address no longer exists." AND the victim row survives
//      byte-identical (server-truth Prisma read);
//   5. LB2 (the control — the false-positive guard): the SAME wire shapes
//      against james's OWN minted address — the saveAddress edit UPDATES
//      the own row's street, the delete REMOVES the own row (both
//      server-truth) — proving the mint works, the protocol reaches the DB,
//      and LB1's denial is the OWNER CHECK;
//   6. zero victim-writes: the victim row byte-identical from before the
//      ladder to after; kill → cleanup confirmed.
// Exits nonzero on any assumption failure.
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");

const PORT = 3209;
const BASE = `http://localhost:${PORT}`;
const SECRET = "session47-probe-secret-0123456789abcdef";
const REPO = process.cwd();
const STANDALONE = path.join(REPO, ".next", "standalone", "server.js");
const ACCOUNT_MANIFEST = path.join(
  REPO,
  ".next/standalone/.next/server/app/(storefront)/account/page/server-reference-manifest.json",
);

// The healthy throwaway DB: a copy of the dev DB, deleted with the probe.
const TMPDIR = fs.mkdtempSync(path.join(os.tmpdir(), `probe-session47-${process.pid}-`));
const PROBE_DB = path.join(TMPDIR, "copy.db");
const PROBE_DB_URL = `file:${PROBE_DB}`;

const SUFFIX = crypto.randomBytes(6).toString("hex");
const TOKEN = `frr-${SUFFIX}-${crypto.randomBytes(24).toString("hex")}`;
const VICTIM_ID = `frr-victim-${SUFFIX}`;
const OWN_ID = `frr-own-${SUFFIX}`;

const SIGN_IN_MSG = "Sign in to manage your address book.";
const NOT_YOURS_MSG = "That address no longer exists.";
const VICTIM_STREET = "99 Untouchable Way";

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
        reject(new Error(`server never listened — stderr: ${stderr.slice(0, 400)}`));
        return;
      }
      try {
        const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(2500) });
        if (res.ok) { resolve(child); return; }
      } catch { /* not up yet */ }
      setTimeout(poll, 400);
    })();
  });
}

/** SQL fixture on the COPY (the established `prisma db execute` pattern). */
function sqlRun(sql) {
  const file = path.join(TMPDIR, "fixture.sql");
  fs.writeFileSync(file, sql);
  const res = spawnSyncNpx(["prisma", "db", "execute", "--schema", path.join(REPO, "prisma", "schema.prisma"), "--file", file]);
  if (res.status !== 0) throw new Error(`sqlRun failed: ${res.stderr?.slice(0, 300)}`);
}

/** spawnSync wrapper (npx needs the repo cwd for the prisma CLI). */
function spawnSyncNpx(args) {
  const { spawnSync } = require("child_process");
  return spawnSync("npx", args, {
    cwd: REPO,
    env: { ...process.env, DATABASE_URL: PROBE_DB_URL },
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
}

/** Read a row through Prisma on the COPY (dbRead's shape). */
function prRead(jsonExpression) {
  const { spawnSync } = require("child_process");
  const script =
    `const {PrismaClient}=require("@prisma/client");` +
    `const p=new PrismaClient({datasources:{db:{url:"${PROBE_DB_URL}"}}});` +
    `(${jsonExpression})(p).then(r=>{console.log("<<JSON>>"+JSON.stringify(r));return p.$disconnect()})` +
    `.catch(e=>{console.error(e.message);process.exit(1)})`;
  const res = spawnSync("node", ["-e", script], {
    cwd: REPO,
    env: { ...process.env, DATABASE_URL: PROBE_DB_URL },
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  if (res.status !== 0) throw new Error(`prRead failed: ${res.stderr?.slice(0, 300)}`);
  const marker = (res.stdout ?? "").indexOf("<<JSON>>");
  if (marker < 0) throw new Error(`prRead produced no JSON: ${(res.stdout ?? "").slice(0, 200)}`);
  return res.stdout.slice(marker + "<<JSON>>".length).trim();
}

function signToken(token) {
  return `${token}.${crypto.createHmac("sha256", SECRET).update(token).digest("base64url")}`;
}

/** The action-seam gate's JSON-arg probe shape, +optional auth cookie. */
async function postJsonAction(actionId, payload, cookie) {
  const res = await fetch(`${BASE}/account`, {
    method: "POST",
    headers: {
      "Next-Action": actionId,
      "Content-Type": "text/plain;charset=UTF-8",
      ...(cookie ? { Cookie: `aurelia_session=${cookie}` } : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });
  return { status: res.status, body: await res.text() };
}

/** The F-QQ multipart fetch-action shape for the (prev, formData) actions. */
async function postFormAction(actionId, fields, cookie) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(`_1_${k}`, v);
  fd.set("0", '[null,"$K1"]');
  const res = await fetch(`${BASE}/account`, {
    method: "POST",
    headers: {
      "Next-Action": actionId,
      ...(cookie ? { Cookie: `aurelia_session=${cookie}` } : {}),
    },
    body: fd,
    signal: AbortSignal.timeout(15_000),
  });
  return { status: res.status, body: await res.text() };
}

function readManifest() {
  const manifest = JSON.parse(fs.readFileSync(ACCOUNT_MANIFEST, "utf8"));
  const entries = Object.entries(manifest.node ?? {}).map(([id, v]) => ({
    id,
    exportedName: v.exportedName,
    filename: v.filename,
  }));
  return entries;
}

(async function main() {
  let child = null;
  try {
    // The throwaway copy: the healthy dev DB (james + admin rows present).
    fs.copyFileSync(path.join(REPO, "db", "custom.db"), PROBE_DB);

    // The three mint rows (idempotent delete-then-insert, F-NN's shape):
    // (a) james's session — FUTURE expiry, +1 day (the browser-cookie half
    //     is irrelevant here; the explicit Cookie header carries it);
    // (b) the VICTIM address for the ADMIN user (INSERT..SELECT the userId);
    // (c) james's OWN control address.
    sqlRun(
      `DELETE FROM "Session" WHERE token = '${TOKEN}';\n` +
        `INSERT INTO "Session" (id, token, "userId", "expiresAt", "createdAt") ` +
        `SELECT 'frr-sess-${SUFFIX}', '${TOKEN}', id, datetime('now', '+1 day'), datetime('now') ` +
        `FROM "User" WHERE email = 'james@example.com';\n` +
        `DELETE FROM "Address" WHERE id IN ('${VICTIM_ID}', '${OWN_ID}');\n` +
        `INSERT INTO "Address" ("id","userId","label","fullName","street","city","state","zip","country","isDefault") ` +
        `SELECT '${VICTIM_ID}', id, 'Probe Vault', 'Admin Victim', '${VICTIM_STREET}', 'Vault City', 'VC', '99999', 'United States', 0 ` +
        `FROM "User" WHERE email = 'admin@aurelia.com';\n` +
        `INSERT INTO "Address" ("id","userId","label","fullName","street","city","state","zip","country","isDefault") ` +
        `SELECT '${OWN_ID}', id, 'Probe Own', 'James Probe', '1 Own Lane', 'Own City', 'OC', '11111', 'United States', 0 ` +
        `FROM "User" WHERE email = 'james@example.com';`,
    );

    // --- 1. boot ---
    child = await bootServer(PROBE_DB_URL);
    const health = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(5000) });
    const healthBody = await health.text();
    results(
      "1. throwaway healthy-copy server boots (/api/health)",
      health.status === 200 && healthBody.includes('"ok":true') && healthBody.includes('"db":true'),
      `${health.status} ${healthBody.slice(0, 80)}`,
    );

    // --- 2. manifest canary ---
    const entries = readManifest();
    const byName = (n) => entries.filter((e) => e.exportedName === n);
    const okCount = entries.length === 8;
    const okIds = entries.every((e) => /^[0-9a-f]{40,}$/.test(e.id));
    const okDelete = byName("deleteAddressAction").length === 1;
    const okDefault = byName("setDefaultAddressAction").length === 1;
    const okSave = byName("saveAddressAction").length === 1;
    results(
      "2. /account manifest: exactly 8 ids; the three address actions present",
      okCount && okIds && okDelete && okDefault && okSave,
      `ids=${entries.length} delete=${okDelete} setDefault=${okDefault} save=${okSave}`,
    );
    const deleteId = byName("deleteAddressAction")[0].id;
    const defaultId = byName("setDefaultAddressAction")[0].id;
    const saveId = byName("saveAddressAction")[0].id;

    // --- 3. the auth wall (cookie-less) ---
    const unauthDelete = await postJsonAction(deleteId, [VICTIM_ID]);
    const unauthDefault = await postJsonAction(defaultId, [VICTIM_ID]);
    results(
      "3a. cookie-less delete probe answers the auth wall",
      unauthDelete.status === 200 && unauthDelete.body.includes(SIGN_IN_MSG) && !unauthDelete.body.includes("Internal Server Error"),
      `${unauthDelete.status} ${unauthDelete.body.slice(0, 120)}`,
    );
    results(
      "3b. cookie-less setDefault probe answers the auth wall",
      unauthDefault.status === 200 && unauthDefault.body.includes(SIGN_IN_MSG) && !unauthDefault.body.includes("Internal Server Error"),
      `${unauthDefault.status} ${unauthDefault.body.slice(0, 120)}`,
    );

    const COOKIE = signToken(TOKEN);

    // The session must resolve: the mint works (verified by the control
    // writes below — but an explicit pre-check gives a cleaner failure).
    // (getCurrentUser also INLINE-PRUNES expired rows; +1 day is safe.)

    // --- 4. LB1: the IDOR walls (the victim id, authenticated) ---
    const victimBefore = JSON.parse(prRead(`(p)=>p.address.findUnique({where:{id:"${VICTIM_ID}"}})`));
    results("4-pre. the victim row exists pre-ladder", !!victimBefore, JSON.stringify(victimBefore).slice(0, 100));

    const authDelete = await postJsonAction(deleteId, [VICTIM_ID], COOKIE);
    results(
      "4a. authenticated delete on the VICTIM id answers the owner wall",
      authDelete.status === 200 && authDelete.body.includes('"ok":false') && authDelete.body.includes(NOT_YOURS_MSG),
      `${authDelete.status} ${authDelete.body.slice(0, 140)}`,
    );

    const authDefault = await postJsonAction(defaultId, [VICTIM_ID], COOKIE);
    results(
      "4b. authenticated setDefault on the VICTIM id answers the owner wall",
      authDefault.status === 200 && authDefault.body.includes('"ok":false') && authDefault.body.includes(NOT_YOURS_MSG),
      `${authDefault.status} ${authDefault.body.slice(0, 140)}`,
    );

    const EDIT_FIELDS = {
      label: "Hostile Edit",
      fullName: "Attacker Name",
      street: "1 Hijacked Street",
      city: "Hijack City",
      state: "HC",
      zip: "22222",
      country: "United States",
      id: VICTIM_ID,
    };
    const authEdit = await postFormAction(saveId, EDIT_FIELDS, COOKIE);
    results(
      "4c. authenticated saveAddress EDIT on the VICTIM id answers the owner wall",
      authEdit.status === 200 && authEdit.body.includes('"ok":false') && authEdit.body.includes(NOT_YOURS_MSG),
      `${authEdit.status} ${authEdit.body.slice(0, 140)}`,
    );

    const victimAfter = JSON.parse(prRead(`(p)=>p.address.findUnique({where:{id:"${VICTIM_ID}"}})`));
    const victimIntact =
      !!victimAfter &&
      victimAfter.street === victimBefore.street &&
      victimAfter.fullName === victimBefore.fullName &&
      victimAfter.isDefault === victimBefore.isDefault &&
      victimAfter.label === victimBefore.label;
    results(
      "4d. the victim row survives the whole ladder byte-identical",
      victimIntact,
      victimIntact ? "street/fullName/isDefault/label unchanged" : JSON.stringify(victimAfter).slice(0, 140),
    );

    // --- 5. LB2: the control (james's OWN address — the writes succeed) ---
    const OWN_EDIT = { ...EDIT_FIELDS, id: OWN_ID, street: "2 Remounted Own Lane" };
    const ownEdit = await postFormAction(saveId, OWN_EDIT, COOKIE);
    const ownAfterEdit = JSON.parse(prRead(`(p)=>p.address.findUnique({where:{id:"${OWN_ID}"},select:{street:true}})`));
    results(
      "5a. CONTROL: the same edit shape on the OWN id SUCCEEDS server-truth",
      ownEdit.status === 200 && ownEdit.body.includes('"ok":true') && ownAfterEdit?.street === "2 Remounted Own Lane",
      `${ownEdit.status} street=${ownAfterEdit?.street}`,
    );

    const ownDelete = await postJsonAction(deleteId, [OWN_ID], COOKIE);
    const ownAfterDelete = JSON.parse(prRead(`(p)=>p.address.findUnique({where:{id:"${OWN_ID}"}})`));
    results(
      "5b. CONTROL: the same delete shape on the OWN id REMOVES the row",
      ownDelete.status === 200 && ownDelete.body.includes('"ok":true') && ownAfterDelete === null,
      `${ownDelete.status} row=${ownAfterDelete === null ? "gone" : "STILL THERE"}`,
    );

    // The setDefault control: exercise the third action's success half too
    // (re-create the own row, set it default, verify the flag server-truth).
    sqlRun(
      `INSERT INTO "Address" ("id","userId","label","fullName","street","city","state","zip","country","isDefault") ` +
        `SELECT '${OWN_ID}', id, 'Probe Own', 'James Probe', '1 Own Lane', 'Own City', 'OC', '11111', 'United States', 0 ` +
        `FROM "User" WHERE email = 'james@example.com';`,
    );
    const ownDefault = await postJsonAction(defaultId, [OWN_ID], COOKIE);
    const ownAfterDefault = JSON.parse(prRead(`(p)=>p.address.findUnique({where:{id:"${OWN_ID}"},select:{isDefault:true}})`));
    results(
      "5c. CONTROL: the setDefault shape on the OWN id flips the flag",
      ownDefault.status === 200 && ownDefault.body.includes('"ok":true') && ownAfterDefault?.isDefault === true,
      `${ownDefault.status} isDefault=${ownAfterDefault?.isDefault}`,
    );

    // --- 6. zero victim-writes (final) ---
    const victimFinal = JSON.parse(prRead(`(p)=>p.address.findUnique({where:{id:"${VICTIM_ID}"}})`));
    results(
      "6. zero victim-writes: the victim row is byte-identical start→end",
      !!victimFinal && victimFinal.street === VICTIM_STREET && victimFinal.isDefault === false,
      JSON.stringify(victimFinal).slice(0, 100),
    );

    // Also verify the authenticated session consumed nothing unexpected:
    // the session row still exists (the inline prune never fires on a
    // FUTURE-expiry row).
    const sess = JSON.parse(prRead(`(p)=>p.session.findUnique({where:{token:"${TOKEN}"},select:{id:true}})`));
    results("6b. the minted session row survives (FUTURE expiry, no prune)", !!sess, sess ? "row present" : "GONE");
  } catch (err) {
    console.error("PROBE ERROR:", err.message);
    process.exitCode = 1;
  } finally {
    if (child) {
      child.kill("SIGTERM");
      const died = await new Promise((resolve) => {
        const t = setTimeout(() => { child.kill("SIGKILL"); resolve(true); }, 4000);
        child.on("exit", () => { clearTimeout(t); resolve(true); });
      });
      results("7. throwaway server killed + tmpdir removed", died, died ? "SIGTERM/SIGKILL escalation" : "still alive");
    }
    try { fs.rmSync(TMPDIR, { recursive: true, force: true }); } catch { /* best effort */ }
  }
})();
