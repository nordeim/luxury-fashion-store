import { PrismaClient } from "@prisma/client";
import { defaultDatabaseUrl, resolveDatabaseUrl } from "@/lib/db-path";

// Prisma singleton (HMR-safe): Next.js dev hot-reload would otherwise open a
// new pool per module evaluation. The globalThis cache survives reloads in
// dev and is a no-op in production.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// The schema-relative DATABASE_URL ("file:../db/custom.db") resolves against
// the generated client's baked schema dir — which MOVES in the standalone
// bundle (.next/standalone/node_modules/.prisma/client, chdir'd to boot).
// Re-anchor it with the CLI rule (find prisma/schema.prisma upward from cwd)
// so dev, E2E standalone, and tooling all open ONE physical file. Absolute
// paths, bare filenames and non-file URLs pass through untouched.
const databaseUrl =
  resolveDatabaseUrl(process.env.DATABASE_URL) ?? defaultDatabaseUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
