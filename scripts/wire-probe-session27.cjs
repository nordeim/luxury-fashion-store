#!/usr/bin/env node
// Session-27 wire probe — verifies the session-26 (c15c0fb) claims on the
// BUILT standalone: F-R (newsletter inside <main>), F-S (auth identity +
// breadcrumb blocks, nonce-carrying), F-T (canonicals on 4 statics + PDP),
// F-V (PDP product:price metas). Read-only probes; no DB writes.
const { spawn } = require("child_process");
const http = require("http");

const PORT = 3200;
const BASE = `http://localhost:${PORT}`;

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BASE}${path}`, { headers: { accept: "text/html" } }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on("error", reject);
    req.setTimeout(8000, () => { req.destroy(new Error("timeout")); });
  });
}

function waitHealth(deadlineMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      get("/api/health")
        .then((r) => (r.status === 200 ? resolve() : retry()))
        .catch(retry);
    };
    const retry = () => {
      if (Date.now() - start > deadlineMs) return reject(new Error("health deadline"));
      setTimeout(tick, 400);
    };
    tick();
  });
}

const child = spawn("node", [".next/standalone/server.js"], {
  env: {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: "production",
    AUTH_SECRET: "session27-probe-secret-0123456789abcdef",
    DATABASE_URL: `file:${process.cwd()}/db/custom.db`,
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let stderrTail = "";
child.stderr.on("data", (c) => (stderrTail = (stderrTail + c).slice(-2000)));

async function main() {
  await waitHealth(20000);
  const results = [];
  const check = (name, cond, detail) => results.push({ name, ok: !!cond, detail });

  // F-S: login ships THREE ld+json blocks in reference order (WebSite → Organization → BreadcrumbList)
  const login = await get("/login");
  const loginBlocks = [...login.body.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => {
    try { return JSON.parse(m[1]); } catch { return { "@type": "PARSE_FAIL" }; }
  });
  check("login ld block count == 3", loginBlocks.length === 3, `got ${loginBlocks.length}: [${loginBlocks.map((b) => b["@type"]).join(", ")}]`);
  check(
    "login block order WebSite→Organization→BreadcrumbList",
    loginBlocks.length === 3 && loginBlocks[0]["@type"] === "WebSite" && loginBlocks[1]["@type"] === "Organization" && loginBlocks[2]["@type"] === "BreadcrumbList",
    loginBlocks.map((b) => b["@type"]).join(",")
  );
  if (loginBlocks[2]?.itemListElement) {
    const items = loginBlocks[2].itemListElement;
    // The unit-pinned shape (structured-data.test.ts): flat {position, name,
    // item} — name at the top level, item the URL string.
    check(
      "login breadcrumb shape Home/→/login, 1-based",
      items.length === 2 && items[0].position === 1 && items[0].name === "Home" && items[0].item === "http://localhost:3000/" && items[1].position === 2 && items[1].name === "login" && items[1].item === "http://localhost:3000/login",
      JSON.stringify(items)
    );
  }
  // F-S: nonce-carrying on the auth data blocks
  const nonceMatch = login.headers["content-security-policy"]?.match(/nonce-([^'"]+)/);
  const nonce = nonceMatch ? nonceMatch[1] : null;
  const nonceTagged = nonce ? (login.body.match(new RegExp(`nonce="${nonce}"`, "g")) || []).length : 0;
  check("login: CSP nonce present + data blocks carry it", !!nonce && nonceTagged >= 3, `nonce=${!!nonce}, tagged=${nonceTagged}`);

  // F-S: register parallel shape
  const reg = await get("/register");
  const regBlocks = [...reg.body.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => {
    try { return JSON.parse(m[1]); } catch { return { "@type": "PARSE_FAIL" }; }
  });
  check("register 3 blocks, breadcrumb → /register", regBlocks.length === 3 && regBlocks[2]["@type"] === "BreadcrumbList" && regBlocks[2]?.itemListElement?.[1]?.name === "register" && regBlocks[2]?.itemListElement?.[1]?.item === "http://localhost:3000/register", regBlocks.map((b) => b["@type"]).join(","));

  // F-T: canonicals on the four statics
  const home = await get("/");
  const shop = await get("/shop");
  const homeCanon = home.body.match(/<link rel="canonical" href="([^"]+)"/);
  const shopCanon = shop.body.match(/<link rel="canonical" href="([^"]+)"/);
  const loginCanon = login.body.match(/<link rel="canonical" href="([^"]+)"/);
  const regCanon = reg.body.match(/<link rel="canonical" href="([^"]+)"/);
  check("home canonical = bare origin (Next root collapse)", homeCanon && homeCanon[1] === "http://localhost:3000", homeCanon?.[1]);
  check("shop canonical = …/shop", shopCanon?.[1] === "http://localhost:3000/shop", shopCanon?.[1]);
  check("login canonical = …/login", loginCanon?.[1] === "http://localhost:3000/login", loginCanon?.[1]);
  check("register canonical = …/register", regCanon?.[1] === "http://localhost:3000/register", regCanon?.[1]);

  // F-R: home mainKids == 11, newsletter is the LAST main child
  const mainMatch = home.body.match(/<main[^>]*id="main-content"[\s\S]*?<\/main>/);
  if (mainMatch) {
    const mainHtml = mainMatch[0];
    const kidCount = (mainHtml.match(/<(?:section|div|nav|form|script|img|ul|footer|header|article|aside)\b/g) || []).length; // rough — the census tool is authoritative
    const newsletterInside = /THE VELOUR JOURNAL|Join the Inner Circle|newsletter/i.test(mainHtml);
    check("home: newsletter markup INSIDE <main>", newsletterInside, `rough tag count ${kidCount}`);
  } else {
    check("home: <main> found", false, "no main match");
  }

  // F-V: PDP price metas
  const pdp = await get("/product/silk-draped-evening-gown");
  const priceAmount = pdp.body.match(/<meta name="product:price:amount" content="([^"]+)"/);
  const priceCur = pdp.body.match(/<meta name="product:price:currency" content="([^"]+)"/);
  const pdpCanon = pdp.body.match(/<link rel="canonical" href="([^"]+)"/);
  check("PDP product:price:amount = 2850.00", priceAmount?.[1] === "2850.00", priceAmount?.[1]);
  check("PDP product:price:currency = USD", priceCur?.[1] === "USD", priceCur?.[1]);
  check("PDP canonical = …/product/silk-draped-evening-gown", pdpCanon?.[1] === "http://localhost:3000/product/silk-draped-evening-gown", pdpCanon?.[1]);

  // F-W (session-27 finding): the PDP's child openGraph REPLACES the root's
  // (Next shallow metadata merge) — og:type/og:site_name/og:url dropped.
  // This check is RED on the pre-fix tree by design (the finding's evidence).
  const ogType = pdp.body.match(/<meta property="og:type" content="([^"]+)"/);
  const ogSite = pdp.body.match(/<meta property="og:site_name" content="([^"]+)"/);
  const ogUrl = pdp.body.match(/<meta property="og:url" content="([^"]+)"/);
  check(
    "PDP carries og:type + og:site_name + og:url (F-W)",
    ogType?.[1] === "website" && ogSite?.[1] === "AURELIA" && ogUrl?.[1] === "http://localhost:3000",
    `og:type=${ogType?.[1] ?? "ABSENT"} og:site_name=${ogSite?.[1] ?? "ABSENT"} og:url=${ogUrl?.[1] ?? "ABSENT"}`
  );

  let failed = 0;
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : `  — ${r.detail}`}`);
    if (!r.ok) failed++;
  }
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exitCode = failed ? 1 : 0;
}

main()
  .catch((e) => { console.error("PROBE ERROR:", e.message); console.error(stderrTail); process.exitCode = 2; })
  .finally(() => { try { child.kill("SIGTERM"); } catch {} });
