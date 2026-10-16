// F-H (session-22): the /sitemap.xml metadata route — the docs' sitemap-origin
// contract (README/CLAUDE/PAD/SKILL env tables) made real.
//
// force-dynamic keeps the BUILD DB-free (no prerender queries the database at
// build time) and the sitemap always fresh — the same posture as the
// storefront's force-dynamic pages. The active-only filter and the URL
// contract live in the pure seam (src/lib/sitemap.ts, unit-pinned); this file
// only reads the catalog and delegates.
import type { MetadataRoute } from "next";
import { buildSitemapEntries } from "@/lib/sitemap";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await db.product.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, updatedAt: true, isActive: true },
  });
  return buildSitemapEntries(process.env.NEXT_PUBLIC_SITE_URL, products);
}
