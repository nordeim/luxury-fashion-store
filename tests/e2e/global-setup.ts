// Playwright global setup — materialize the scratch E2E database.
//
// The webServer below boots the production standalone against
// db/e2e.db (DATABASE_URL="file:../db/e2e.db"). Before that happens the
// scratch file must exist with the schema pushed and the catalog seeded.
// We reuse the repo's own tooling (prisma CLI + tsx seed) with the env
// override — the schema-relative URL resolves to <repoRoot>/db/e2e.db the
// same way it does for the dev database.
import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

// Playwright's global-setup loader compiles TS to CJS (no import.meta).
// The CLI always runs from the config directory (repo root).
const repoRoot = process.cwd();

function run(cmd: string, args: string[]) {
  const res = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: "file:../db/e2e.db" },
  });
  if (res.status !== 0) {
    throw new Error(`[e2e-setup] ${cmd} ${args.join(" ")} failed with exit ${res.status}`);
  }
}

export default function globalSetup() {
  // The db/ directory is git-ignored — recreate it if a fresh clone omitted it.
  fs.mkdirSync(path.join(repoRoot, "db"), { recursive: true });
  run("npx", ["prisma", "db", "push", "--accept-data-loss", "--skip-generate"]);
  run("npx", ["tsx", "prisma/seed.ts"]);
  // Session 5: reset TRANSIENT runtime state. The seed is idempotent
  // (upserts) but never removes rows created AFTER it — a previous run's
  // guest carts merged into the demo user made the next run's drawer specs
  // see two lines. Every run starts from the canonical catalog/user/order
  // state with empty bags, wishlists, and sessions.
  // Session 6 (H-25): the wipe extends to ALL order rows — checkout specs
  // mint ORD-2026-0XX orders every run (the seed only upserts 001–004), and
  // the residue grew the shared DB unboundedly until the admin COUNT pin
  // would have broken at 200. Orders/items/events are wiped wholesale and
  // the (idempotent) seed re-runs to restore the 4 canonical orders, which
  // also makes absolute dashboard KPI pins deterministic (H-28).
  const wipe = [
    `DELETE FROM "OrderItem";`,
    `DELETE FROM "OrderEvent";`,
    `DELETE FROM "Order";`,
    `DELETE FROM "CartItem";`,
    `DELETE FROM "Cart";`,
    `DELETE FROM "WishlistItem";`,
    `DELETE FROM "Wishlist";`,
    `DELETE FROM "Session";`,
    `DELETE FROM "Address" WHERE "label" LIKE 'E2E%';`,
    `DELETE FROM "User" WHERE "email" LIKE 'e2e-%@example.com';`,
  ].join("\n");
  const wipeFile = path.join(repoRoot, "db", ".e2e-wipe.sql");
  fs.writeFileSync(wipeFile, wipe);
  run("npx", ["prisma", "db", "execute", "--schema", "prisma/schema.prisma", "--file", "db/.e2e-wipe.sql"]);
  // Re-seed AFTER the order wipe: canonical ORD-2026-001..004 come back,
  // everything else stays wiped.
  run("npx", ["tsx", "prisma/seed.ts"]);
}
