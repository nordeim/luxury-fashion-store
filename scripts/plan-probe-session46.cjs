#!/usr/bin/env node
// Session-46 plan-validation probe — wire-verifies the F-QQ contract
// assumptions BEFORE the spec is written (the standing §5 discipline: no
// unverified assumption enters a pin). Boots the standalone on :3209 as a
// THROWAWAY process against a healthy THROWAWAY COPY of db/custom.db (the
// checkout action needs working DB reads — findCart must answer the
// cart-less envelope, not a raw 500), WITH TRUST_PROXY=1 so per-request
// x-forwarded-for headers give the probe exact per-IP bucket control (the
// rate-limit.ts clientIpFrom H-35 contract). The throwaway process owns its
// own in-memory limiter buckets (rate-limit.ts module scope) — a burst
// there consumes nothing on any other process. Zero writes touch the dev DB
// or db/e2e.db; the throwaway copy is deleted.
//
// THE WIRE SHAPE (the round's protocol discovery — derived first-hand from
// the compiled Next 16 + React 19 sources, measured here): CheckoutFlow
// renders NO <form action> (the dispatch is programmatic —
// startTransition(() => formAction(fd))), so the F-PP no-JS $ACTION_REF
// shape has no SSR'd binding to ride; and the cart-less /checkout page
// redirects at render time, which would swallow the MPA re-render. The
// JS-path FETCH-ACTION dispatch instead:
//   POST /checkout
//   Next-Action: <placeOrderId>            (server-action-request-meta: isFetchAction)
//   multipart field "0"   = [null,"$K1"]    (react-server-dom-webpack client:
//                                            encodeReply args [prev, formData];
//                                            nextPartId starts at 1; the
//                                            FormData arg -> "$K1" + entries
//                                            appended with the "" prefix rule
//                                            → "_1_<field>")
//   multipart _1_email, _1_fullName, _1_street, _1_city, _1_state,
//              _1_zip, _1_country, _1_paymentMethod=cod
//   (the flight server's `case "K"` decoder reassembles "$K1" from the
//   "_1_"-prefixed entries; action-handler.js decodes the args and invokes
//   placeOrderAction(null, formData); the fetch-action response streams the
//   ActionResult — the envelope assertable in the body bytes, the exact
//   shape the action-seam gate pins for the PDP's JSON-arg actions).
//
// Checks (all on the wire):
//   1. the healthy-copy server BOOTS and LISTENS (/api/health → 200 +
//      {"ok":true,"db":true} — the F-OO control discipline);
//   2. the checkout page manifest exposes exactly THREE action ids, exactly
//      one placeOrderAction from src/lib/actions/checkout.ts (the
//      build-shape canary);
//   3. THE WIRE SHAPE: the crafted fetch-action POST (iteration 1, IP-A)
//      → 200 + '"ok":false' + the cart-less envelope "Your bag is empty."
//      (wire-real discrimination of placeOrderAction; zero writes, zero
//      cookies);
//   4. the fail-closed sweep: the two sibling ids (adjust/remove) answer
//      their own envelopes on garbage payloads, never 5xx (their payloads
//      never touch the checkout bucket);
//   5. LB (the floor): IP-A iterations 2..10 → all "Your bag is empty."
//      (the lawful window — the floor must not fire early), the 11th → the
//      floor envelope ("Too many attempts. Try again in N seconds." with N
//      bounded 1..600 — the 10-minute window);
//   6. the per-IP control: IP-B's single post answers the lawful envelope
//      (NOT the floor — the bucket key is checkout:<ip>, not global);
//   7. zero writes: the throwaway copy's Order / CartItem / User counts
//      unchanged after the whole ladder; kill → cleanup confirmed.
// Exits nonzero on any assumption failure.
const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("node:path");

const PORT = 3209;
const BASE = `http://localhost:${PORT}`;
const SECRET = "session46-probe-secret-0123456789abcdef";
const REPO = process.cwd();
const STANDALONE = path.join(REPO, ".next", "standalone", "server.js");
const CHECKOUT_MANIFEST = path.join(
  REPO,
  ".next/standalone/.next/server/app/(storefront)/checkout/page/server-reference-manifest.json",
);

// The healthy throwaway DB: a copy of the dev DB, deleted with the probe.
const TMPDIR = fs.mkdtempSync(`/tmp/probe-session46-${process.pid}-`);
const PROBE_DB = path.join(TMPDIR, "copy.db");

// The per-IP control pair (RFC 5737 documentation ranges, never routable).
const IP_A = "198.51.100.10";
const IP_B = "198.51.100.99";

const EMPTY_BAG_MSG = "Your bag is empty.";
const LINE_GONE_MSG = "That bag line no longer exists.";
const FLOOR_RE = /Too many attempts\. Try again in (\d+) seconds/;

const COD_PAYLOAD = {
  email: `fqq-burst-${process.pid}@example.com`,
  fullName: "FQQ Burst Probe",
  street: "1 Probe Lane",
  city: "Probe City",
  state: "Probe State",
  zip: "12345",
  country: "United States",
  paymentMethod: "cod",
};

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
      TRUST_PROXY: "1", // the per-IP control mechanism (the H-35 contract)
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
function dbCount(databaseUrl, model) {
  const out = JSON.parse(
    execSync(
      `node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient({datasources:{db:{url:'${databaseUrl}'}}});p.${model}.count().then(c=>{console.log(c);return p.\\$disconnect()}).catch(e=>{console.error(e.message);process.exit(1)})"`,
      { cwd: REPO, env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: ["ignore", "pipe", "pipe"] },
    ).toString(),
  );
  return out;
}

/**
 * The fetch-action dispatch — the JS-path wire format derived from the
 * compiled Next 16 + React 19 sources (the F-PP no-JS $ACTION_REF shape has
 * no SSR'd binding to ride on /checkout: the wizard renders no <form>).
 * `formDataIndex` picks the flight FormData-reference variant if the
 * primary ($K1 / "_1_" — nextPartId starts at 1) is ever refuted.
 *
 * ORDER IS LOAD-BEARING (the probe's own discovery — its first run answered
 * the Zod-null envelope): the real client's encodeReply appends the
 * FormData entries DURING the model walk and sets the flight row "0" LAST,
 * and the server's `case "K"` reassembly walks referencedEntries IN ORDER,
 * breaking at the first entry whose key does not start with the reference
 * prefix — so the "_1_*" fields MUST precede field "0" in the multipart
 * body (FormData insertion order).
 */
async function postCheckoutAction(actionId, fields, xff, formDataIndex = 1) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(`_${formDataIndex}_${k}`, String(v));
  fd.set("0", `[null,"$K${formDataIndex}"]`);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(`${BASE}/checkout`, {
      method: "POST",
      headers: { "Next-Action": actionId, "X-Forwarded-For": xff },
      body: fd,
      signal: ctrl.signal,
    });
    const setCookie = (res.headers.getSetCookie?.() ?? []).join("\n");
    return { status: res.status, body: await res.text(), setCookie, headers: res.headers };
  } finally {
    clearTimeout(timer);
  }
}

/** The action-seam gate's JSON-arg probe shape (the PDP spec's postAction). */
async function postJsonAction(pagePath, actionId, payload) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(`${BASE}${pagePath}`, {
      method: "POST",
      headers: { "Next-Action": actionId, "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    return { status: res.status, body: await res.text() };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  fs.copyFileSync(path.join(REPO, "db", "custom.db"), PROBE_DB);
  const DB_URL = `file:${PROBE_DB}`;

  const before = { order: dbCount(DB_URL, "order"), cartItem: dbCount(DB_URL, "cartItem"), user: dbCount(DB_URL, "user") };

  let server;
  try {
    server = await bootServer(DB_URL);
    results("1. healthy-copy server boots and listens (TRUST_PROXY=1)", true, "health answered on :3209");

    const health = await fetch(`${BASE}/api/health`);
    const healthBody = await health.text();
    results(
      "1b. /api/health against the copy",
      health.status === 200 && healthBody === '{"ok":true,"db":true}',
      `${health.status} ${healthBody}`,
    );

    // 2. The manifest canary — the authoritative id set for the checkout route.
    const manifest = JSON.parse(fs.readFileSync(CHECKOUT_MANIFEST, "utf8"));
    const entries = Object.entries(manifest.node ?? {});
    const placeEntries = entries.filter(([, v]) => v?.exportedName === "placeOrderAction" && v?.filename === "src/lib/actions/checkout.ts");
    const siblingEntries = entries.filter(([, v]) => v?.exportedName !== "placeOrderAction");
    results(
      "2. checkout manifest: exactly 3 ids, exactly one placeOrderAction",
      entries.length === 3 && entries.every(([id]) => /^[0-9a-f]{40,}$/.test(id)) && placeEntries.length === 1,
      `${entries.map(([id, v]) => `${id.slice(0, 8)}:${v?.exportedName}`).join(", ")}`,
    );
    const placeId = placeEntries[0][0];

    // 3. THE WIRE SHAPE (burst iteration 1 for IP-A — the probe IS the
    //    first consume): the crafted fetch-action POST answers the
    //    cart-less envelope. A 400 here would mean the flight decode
    //    shape is wrong; a 200 without the envelope would mean the
    //    ActionResult never reached the body.
    const iter1 = await postCheckoutAction(placeId, COD_PAYLOAD, IP_A);
    const iter1Ok =
      iter1.status === 200 &&
      iter1.body.includes('"ok":false') &&
      iter1.body.includes(EMPTY_BAG_MSG);
    results(
      "3. the crafted fetch-action POST invokes placeOrderAction (the cart-less envelope)",
      iter1Ok,
      iter1Ok ? `200, envelope in ${iter1.body.length} body bytes` : `${iter1.status} :: ${iter1.body.slice(0, 300).replace(/\s+/g, " ")}`,
    );
    results(
      "3b. no cookie minted on the cart-less burst",
      !iter1.setCookie,
      iter1.setCookie ? `Set-Cookie: ${iter1.setCookie.slice(0, 80)}` : "no Set-Cookie",
    );

    // 4. The fail-closed sweep over the sibling ids: garbage line ids
    //    answer the cart-line envelopes, never 5xx (their payloads never
    //    reach the checkout bucket — different actions entirely).
    for (const [sibId, sib] of siblingEntries) {
      const probe = await postJsonAction("/checkout", sibId, ["nonexistent-fqq-probe-id", 1]);
      results(
        `4. sibling ${sib?.exportedName} stays fail-closed on a foreign line id`,
        probe.status === 200 && !probe.body.includes("Internal Server Error") && probe.body.includes('"ok":false'),
        `${probe.status}, ${probe.body.includes(LINE_GONE_MSG) ? LINE_GONE_MSG : probe.body.slice(0, 120).replace(/\s+/g, " ")}`,
      );
    }

    // 5. LB (the floor): IP-A iterations 2..10 stay in the lawful window
    //    (the floor must not fire early), then the 11th same-IP attempt
    //    hits the floor with a bounded retry-seconds value (the window is
    //    10 minutes → N ∈ 1..600).
    let earlyFloor = false;
    let lawfulWindowHeld = true;
    for (let i = 2; i <= 10; i++) {
      const r = await postCheckoutAction(placeId, COD_PAYLOAD, IP_A);
      if (r.status !== 200 || !r.body.includes(EMPTY_BAG_MSG)) lawfulWindowHeld = false;
      if (FLOOR_RE.test(r.body)) earlyFloor = true;
    }
    results(
      "5a. IP-A iterations 2..10 stay in the lawful window (no early floor)",
      lawfulWindowHeld && !earlyFloor,
      earlyFloor ? "the floor fired EARLY — off-by-one in the burst count" : "9× the cart-less envelope",
    );

    const floored = await postCheckoutAction(placeId, COD_PAYLOAD, IP_A);
    const floorMatch = FLOOR_RE.exec(floored.body);
    const floorSeconds = floorMatch ? Number(floorMatch[1]) : 0;
    results(
      "5b. the 11th same-IP attempt answers the floor envelope",
      floored.status === 200 && floorMatch !== null && floorSeconds >= 1 && floorSeconds <= 600,
      floorMatch ? `"${floorMatch[0]}" (N=${floorSeconds}, bounded 1..600)` : `${floored.status} :: ${floored.body.slice(0, 200).replace(/\s+/g, " ")}`,
    );

    // 6. The per-IP control: IP-B's post answers the lawful envelope — the
    //    bucket key is checkout:<ip> (clientIpFrom honors the first XFF
    //    hop under TRUST_PROXY=1), so IP-A's exhausted bucket must not
    //    leak across keys.
    const control = await postCheckoutAction(placeId, COD_PAYLOAD, IP_B);
    results(
      "6. the per-IP control: a different IP is NOT floored",
      control.status === 200 && control.body.includes(EMPTY_BAG_MSG) && !FLOOR_RE.test(control.body),
      control.status === 200 ? "IP-B answered the lawful envelope" : `${control.status} :: ${control.body.slice(0, 200)}`,
    );

    // 7. Zero writes: the whole ladder persisted nothing on the copy (the
    //    burst carried no cookies → findCart read null every time).
    const after = { order: dbCount(DB_URL, "order"), cartItem: dbCount(DB_URL, "cartItem"), user: dbCount(DB_URL, "user") };
    const zeroWrites = before.order === after.order && before.cartItem === after.cartItem && before.user === after.user;
    results(
      "7. zero writes on the throwaway copy",
      zeroWrites,
      `order ${before.order}→${after.order}, cartItem ${before.cartItem}→${after.cartItem}, user ${before.user}→${after.user}`,
    );
  } catch (err) {
    console.error("PROBE ERROR:", err.message);
    process.exitCode = 1;
  } finally {
    if (server) await killServer(server.child);
    try { fs.rmSync(TMPDIR, { recursive: true, force: true }); } catch { /* best effort */ }
  }

  console.log(process.exitCode ? "\nPROBE: FAILED" : "\nPROBE: ALL CHECKS PASSED");
}

main();
