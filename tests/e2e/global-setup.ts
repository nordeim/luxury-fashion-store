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
}
