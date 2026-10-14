// Pins for the schema-relative SQLite URL resolution contract.
//
// The repo ships DATABASE_URL="file:../db/custom.db" — intentionally
// relative, resolved the way the Prisma CLI does (against the directory
// containing prisma/schema.prisma). These tests reproduce that rule so the
// app, its tooling, and future refactors all agree on one physical file.
import { describe, expect, it } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { defaultDatabaseUrl, findPrismaAnchor, resolveDatabaseUrl } from "./db-path";

/** Build a throwaway directory tree; caller removes it. */
function scratch(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "db-path-"));
}

describe("findPrismaAnchor", () => {
  it("finds the repo root from a nested directory", () => {
    const repo = scratch();
    fs.mkdirSync(path.join(repo, "prisma"), { recursive: true });
    fs.writeFileSync(path.join(repo, "prisma", "schema.prisma"), "datasource db {}");
    const nested = path.join(repo, "src", "lib", "actions");
    fs.mkdirSync(nested, { recursive: true });
    expect(findPrismaAnchor(nested)).toBe(repo);
    fs.rmSync(repo, { recursive: true, force: true });
  });

  it("returns null when no anchor exists within the bounded walk", () => {
    const repo = scratch();
    expect(findPrismaAnchor(repo)).toBeNull();
    fs.rmSync(repo, { recursive: true, force: true });
  });
});

describe("resolveDatabaseUrl", () => {
  const cwd = process.cwd(); // the real repo root (has prisma/schema.prisma)

  it("re-anchors the repo's schema-relative default at <repoRoot>/db/custom.db", () => {
    const resolved = resolveDatabaseUrl("file:../db/custom.db", cwd);
    expect(resolved).toBe(`file:${path.resolve(cwd, "db", "custom.db")}`);
  });

  it("resolves identically regardless of the caller's cwd inside the repo", () => {
    const fromSrc = resolveDatabaseUrl("file:../db/custom.db", path.join(cwd, "src"));
    const fromRoot = resolveDatabaseUrl("file:../db/custom.db", cwd);
    expect(fromSrc).toBe(fromRoot);
  });

  it("passes absolute file paths through unchanged", () => {
    expect(resolveDatabaseUrl("file:/tmp/x.db", cwd)).toBe("file:/tmp/x.db");
  });

  it("passes bare filenames through (no relative segment to re-anchor)", () => {
    expect(resolveDatabaseUrl("file:custom.db", cwd)).toBe("file:custom.db");
  });

  it("passes non-file URLs through (postgres et al.)", () => {
    expect(resolveDatabaseUrl("postgres://host/db", cwd)).toBe("postgres://host/db");
  });

  it("passes undefined through (caller handles a missing env)", () => {
    expect(resolveDatabaseUrl(undefined, cwd)).toBeUndefined();
  });
});

describe("defaultDatabaseUrl", () => {
  it("is the repo's canonical <repoRoot>/db/custom.db", () => {
    expect(defaultDatabaseUrl(process.cwd())).toBe(
      `file:${path.resolve(process.cwd(), "db", "custom.db")}`,
    );
  });
});
