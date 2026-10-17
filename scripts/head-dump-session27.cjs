#!/usr/bin/env node
// Session-27: dump ALL og:/twitter:/product: metas + canonical + title from
// the PDP and home served heads — settle the og:type question empirically.
const { spawn } = require("child_process");
const http = require("http");
const PORT = 3200;

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${PORT}${path}`, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve(body));
    });
    req.on("error", reject);
    req.setTimeout(8000, () => req.destroy(new Error("timeout")));
  });
}
function waitHealth(deadlineMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      get("/api/health").then(resolve).catch(retry);
    };
    const retry = () => (Date.now() - start > deadlineMs ? reject(new Error("deadline")) : setTimeout(tick, 400));
    tick();
  });
}
const child = spawn("node", [".next/standalone/server.js"], {
  env: { ...process.env, PORT: String(PORT), NODE_ENV: "production", AUTH_SECRET: "session27-probe-secret-0123456789abcdef", DATABASE_URL: `file:${process.cwd()}/db/custom.db`, NEXT_PUBLIC_SITE_URL: "http://localhost:3000" },
  stdio: ["ignore", "ignore", "inherit"],
});
(async () => {
  await waitHealth(20000);
  for (const path of ["/product/silk-draped-evening-gown", "/", "/shop", "/login"]) {
    const html = await get(path);
    const head = html.slice(0, html.indexOf("</head>"));
    const metas = [...head.matchAll(/<meta\s+([^>]*?)\/?>/g)].map((m) => m[1]).filter((a) => /(?:property|name)="(og:|twitter:|product:|description|theme-color)/.test(a));
    const canon = head.match(/<link rel="canonical" href="([^"]+)"/);
    const title = head.match(/<title>([^<]*)<\/title>/);
    console.log(`\n===== ${path} =====`);
    console.log("title:", title?.[1]);
    console.log("canonical:", canon?.[1] ?? "NONE");
    for (const m of metas) console.log("  meta", m.replace(/\s+/g, " "));
  }
  process.exitCode = 0;
})()
  .catch((e) => { console.error("ERR", e.message); process.exitCode = 2; })
  .finally(() => { try { child.kill("SIGTERM"); } catch {} });
