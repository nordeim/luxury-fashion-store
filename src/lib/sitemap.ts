// F-H (session-22): the SEO metadata seam behind /sitemap.xml + /robots.txt.
//
// The docs have advertised this contract since session 1 ("NEXT_PUBLIC_SITE_URL —
// canonical/og:url + sitemap origin") and the F-G note (session-20) already
// accounted for sitemap/robots in the proxy matcher — but the paths were
// served by the SCAFFOLD's stale foreign statics: public/robots.txt +
// public/sitemap.xml (an ecommerce-store lineage artifact advertising a Vite
// :4173 origin and an /order-success route this app does not have). Next
// serves public/ files BEFORE metadata routes, so the wire metadata was not
// merely missing — it was WRONG since session 1. The statics are deleted in
// the same commit (F-H2); these routes take over. The seam owns every decision so the
// metadata routes stay thin executors:
//
//   siteOrigin          — the documented default-origin fallback
//                         (http://localhost:3000) + trailing-slash normalization
//   buildSitemapEntries — the four indexable static surfaces FIRST (canonical
//                         order), then ACTIVE products only (the route may
//                         pass every product; the seam enforces the filter),
//                         in the caller's order (the catalog's sortOrder)
//   buildRobots         — allow the root; disallow exactly the noindex
//                         surfaces; point at the sitemap on the same origin
//
// Zero visual surface: these routes feed crawlers only — the parity census is
// unaffected by construction (proven by the 17a=17b byte-equal ritual).
import type { MetadataRoute } from "next";

export const DEFAULT_SITE_ORIGIN = "http://localhost:3000";

// Every path here is either role-gated (/admin, /account), transactional
// (/cart, /checkout), a session surface (/wishlist), or machine-facing
// (/api) — none belongs in an index.
export const ROBOTS_DISALLOW = [
  "/admin",
  "/api",
  "/account",
  "/cart",
  "/checkout",
  "/wishlist",
] as const;

const STATIC_PATHS = ["/", "/shop", "/login", "/register"] as const;

export interface SitemapProduct {
  slug: string;
  updatedAt: Date;
  isActive: boolean;
}

export function siteOrigin(raw: string | undefined): string {
  const base = raw?.trim() || DEFAULT_SITE_ORIGIN;
  return base.replace(/\/+$/, "");
}

export function buildSitemapEntries(
  baseUrl: string | undefined,
  products: SitemapProduct[],
): MetadataRoute.Sitemap {
  const origin = siteOrigin(baseUrl);
  const statics: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${origin}${path}`,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
  const productEntries: MetadataRoute.Sitemap = products
    .filter((product) => product.isActive)
    .map((product) => ({
      url: `${origin}/product/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  return [...statics, ...productEntries];
}

export function buildRobots(baseUrl: string | undefined): MetadataRoute.Robots {
  const origin = siteOrigin(baseUrl);
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [...ROBOTS_DISALLOW] }],
    sitemap: `${origin}/sitemap.xml`,
  };
}
