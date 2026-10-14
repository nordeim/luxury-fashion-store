// Assemble the runnable standalone bundle (Next.js docs step).
//
// `output: "standalone"` emits a self-contained SERVER, but deliberately
// does NOT copy the client assets: per the Next.js docs, `.next/static`
// and `public/` must be copied into `.next/standalone/` by the deployer.
// Without this step the standalone server 404s every /_next/static chunk —
// the pages render (SSR) but never hydrate, so ALL client interactivity
// (menu, drawers, actions) is dead. That exact failure mode is what the
// Playwright "mobile" project hit: SSR snapshots looked perfect while
// every click was inert.
//
// Idempotent: rm the previous copies so stale chunks can never survive.
import { cpSync, rmSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
const staticSrc = path.join(root, ".next", "static");
const staticDst = path.join(standalone, ".next", "static");
const publicSrc = path.join(root, "public");
const publicDst = path.join(standalone, "public");

for (const [src, dst] of [
  [staticSrc, staticDst],
  [publicSrc, publicDst],
]) {
  if (!existsSync(src)) {
    console.warn(`[assemble-standalone] skipping missing ${path.relative(root, src)}`);
    continue;
  }
  rmSync(dst, { recursive: true, force: true });
  cpSync(src, dst, { recursive: true });
  console.log(`[assemble-standalone] ${path.relative(root, src)} -> ${path.relative(root, dst)}`);
}
