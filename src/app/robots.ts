// F-H (session-22): the /robots.txt metadata route — allow the root, disallow
// exactly the noindex surfaces (role-gated /admin, /account; transactional
// /cart, /checkout; session /wishlist; machine-facing /api), and point at the
// sitemap on the same origin. The contract lives in the pure seam
// (src/lib/sitemap.ts, unit-pinned); this file only adapts it to Next.
//
// The proxy matcher intentionally does NOT exclude these paths — they receive
// the per-request nonce CSP header (harmless; F-G, session-20).
import type { MetadataRoute } from "next";
import { buildRobots } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return buildRobots(process.env.NEXT_PUBLIC_SITE_URL);
}
