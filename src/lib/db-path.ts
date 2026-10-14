// Schema-relative SQLite URL resolution (the repo's db contract).
//
// `DATABASE_URL="file:../db/custom.db"` is intentionally relative: the Prisma
// CLI resolves `file:` URLs against the directory containing
// prisma/schema.prisma, so the database lands at <repoRoot>/db/custom.db no
// matter where a command runs from. The Prisma **client** (used at runtime
// here) resolves the same URL against the generated client's location —
// which can differ. resolveDatabaseUrl() reproduces the CLI rule so the app
// and its tooling agree on one physical file.
//
// DO NOT simplify: the resolution rules are pinned by tests/db-path.test.ts.

import path from "node:path";
import fs from "node:fs";

/** True when the process can be anchored at a directory containing prisma/schema.prisma. */
export function findPrismaAnchor(startDir: string): string | null {
  let dir = path.resolve(startDir);
  // Bounded walk: repo roots are shallow; 8 levels is generous.
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "prisma", "schema.prisma"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

/**
 * Resolve a `file:` SQLite URL against the prisma anchor (the CLI rule).
 * Absolute file paths, `file:` URLs without relative segments, and non-file
 * URLs pass through unchanged. Env overrides win over the repo default.
 */
export function resolveDatabaseUrl(
  rawUrl: string | undefined,
  cwd: string = process.cwd(),
): string {
  if (!rawUrl) return rawUrl as never; // unchanged (caller handles missing)
  if (!rawUrl.startsWith("file:")) return rawUrl;

  const filePath = rawUrl.slice("file:".length);
  // Absolute path or bare filename: nothing relative to re-anchor.
  if (path.isAbsolute(filePath) || !filePath.startsWith(".")) return rawUrl;

  const anchor = findPrismaAnchor(cwd);
  if (!anchor) return rawUrl; // no anchor discoverable — pass through
  const abs = path.resolve(anchor, "prisma", filePath);
  return `file:${abs}`;
}

/** The repo's canonical runtime URL for <repoRoot>/db/custom.db. */
export function defaultDatabaseUrl(cwd: string = process.cwd()): string {
  return resolveDatabaseUrl("file:../db/custom.db", cwd);
}
