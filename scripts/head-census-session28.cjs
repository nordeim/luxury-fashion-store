#!/usr/bin/env node
// Session-28 fresh-audit probe — two seams no prior round audited:
//   S1. the referenced brand asset FILES actually serve (the manifest body
//       and the store-root JSON-LD reference /icons/icon-*.png, the head
//       links /apple-icon.png; opengraph-image.png auto-injects on every
//       route — but no gate ever fetched the files themselves).
//   S2. the per-route head census beyond the four audited routes — every
//       route's served head checked for the site-level OG identity fields
//       (og:type / og:site_name / og:url), the twitter mirror, og:image,
//       title + canonical (the inheritance claim "every other page carries
//       them" verified across the FULL route surface, not four routes).
// Read-only probes; no DB writes. Boots the standalone on :3201.
const { spawn } = require("child_process");
const http = require("http");

const PORT = 3201;
const BASE = `http://localhost:${PORT}`;
const ORIGIN = "http://localhost:3000"; // NEXT_PUBLIC_SITE_URL fallback baked into metadata

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
      if (Date.now() - start > deadlineMs) return reject(new Error("health timeout"));
      setTimeout(tick, 400);
    };
    tick();
  });
}

function metaTags(body) {
  const out = {};
  const re = /<meta\s+([^>]*?)\/?>/g;
  let m;
  while ((m = re.exec(body))) {
    const tag = m[1];
    const prop = /(?:property|name)="([^"]+)"/.exec(tag);
    const content = /content="([^"]*)"/.exec(tag);
    if (prop && content) out[prop[1]] = content[1];
  }
  return out;
}

function linkTags(body) {
  const out = [];
  const re = /<link\s+([^>]*?)\/?>/g;
  let m;
  while ((m = re.exec(body))) out.push(m[1]);
  return out;
}

async function main() {
  const results = [];
  const check = (name, cond, detail) => results.push({ name, ok: !!cond, detail });

  // ---------- S1: the referenced asset files serve ----------
  const assets = [
    ["/icons/icon-192.png", "image/png"],
    ["/icons/icon-512.png", "image/png"],
    ["/apple-icon.png", "image/png"],
    ["/opengraph-image.png", "image/png"],
    ["/icon.svg", "image/svg+xml"],
    ["/favicon.ico", "image/x-icon"],
  ];
  for (const [p, type] of assets) {
    const r = await get(p);
    const ct = (r.headers["content-type"] || "").toLowerCase();
    check(
      `asset ${p} serves 200 ${type}`,
      r.status === 200 && ct.includes(type) && r.body.length > 100,
      `status=${r.status} ct=${ct} bytes=${r.body.length}`
    );
  }

  // ---------- S2: per-route head census ----------
  const PDP = "/product/silk-draped-evening-gown";
  const routes = [
    ["/", "home"],
    ["/shop", "shop"],
    [PDP, "pdp"],
    ["/cart", "cart"],
    ["/checkout", "checkout"],
    ["/wishlist", "wishlist"],
    ["/login", "login"],
    ["/register", "register"],
    ["/definitely-not-a-route", "404"],
  ];
  for (const [path, label] of routes) {
    const r = await get(path);
    const metas = metaTags(r.body);
    const links = linkTags(r.body);
    const has = (k) => Object.prototype.hasOwnProperty.call(metas, k);
    check(
      `[${label}] og:type + og:site_name + og:url present`,
      has("og:type") && has("og:site_name") && has("og:url"),
      `og:type=${metas["og:type"] || "ABSENT"} siteName=${metas["og:site_name"] || "ABSENT"} og:url=${metas["og:url"] || "ABSENT"}`
    );
    check(
      `[${label}] og:image + twitter mirror present`,
      has("og:image") && has("twitter:image"),
      `og:image=${(metas["og:image"] || "ABSENT").slice(0, 60)} twitter:card=${metas["twitter:card"] || "ABSENT"}`
    );
    check(
      `[${label}] title present`,
      has("title") || /<title>/.test(r.body),
      `title=${metas.title || (/<title>([^<]*)<\/title>/.exec(r.body) || [])[1] || "ABSENT"}`
    );
    // Canonicals live on the INDEXABLE set only (F-T): the four sitemap
    // statics + the PDP. /cart, /checkout, /wishlist are ROBOTS_DISALLOW
    // noindex surfaces (src/lib/sitemap.ts) — a canonical there would be
    // meaningless; the census asserts their ABSENCE as the contract.
    if (["home", "shop", "pdp", "login", "register"].includes(label)) {
      const canonical = links.find((l) => /rel="canonical"/.test(l));
      check(`[${label}] canonical link present`, !!canonical, canonical || "ABSENT");
    } else if (["cart", "checkout", "wishlist"].includes(label)) {
      const canonical = links.find((l) => /rel="canonical"/.test(l));
      check(
        `[${label}] canonical ABSENT (robots-disallowed noindex surface)`,
        !canonical,
        canonical ? "unexpected canonical" : "absent as designed"
      );
    }
    // detail dump for the routes never dumped before
    if (["cart", "checkout", "wishlist", "404"].includes(label)) {
      console.log(`--- ${label} head metas ---`);
      for (const k of Object.keys(metas)) console.log(`  ${k} = ${metas[k].slice(0, 90)}`);
    }
  }

  // account/admin redirect when logged out — the census cannot see their own
  // head without a session; verify the redirect is a server-side redirect
  // (3xx) rather than a broken render.
  for (const p of ["/account", "/admin"]) {
    const r = await get(p);
    check(
      `[${p}] logged-out visit is a server redirect (3xx) or a 200 head-carrying page`,
      (r.status >= 300 && r.status < 400) || (r.status === 200 && r.body.includes("og:type")),
      `status=${r.status}`
    );
  }

  const failed = results.filter((r) => !r.ok).length;
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : "  ||  " + r.detail}`);
  }
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exitCode = failed ? 1 : 0;
}

const child = spawn("node", [".next/standalone/server.js"], {
  // Spawn from the REPO ROOT (AGENTS.md recipe) — the standalone server
  // resolves its own assets from __dirname; a cwd override + repo-relative
  // arg double-resolves to a nonexistent path (the probe's own boot bug,
  // caught by its health deadline — fix the tool, not the wait).
  env: {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: "production",
    AUTH_SECRET: "session28-probe-secret-0123456789abcdef",
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
    console.error("probe error:", e.message);
    process.exitCode = 1;
  })
  .finally(() => child.kill("SIGTERM"));
