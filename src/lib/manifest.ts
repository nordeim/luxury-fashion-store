// F-L (session-24): the PWA manifest seam behind /manifest.webmanifest.
//
// The Vite lineage shipped a manifest + its E2E gate (168d2ec, R18-01); the
// Next.js transform (8c675a7) silently dropped both — the installability
// surface never made it to the superset. The seam owns every decision so the
// metadata route stays a thin executor:
//
//   buildManifest — identity (AURELIA), installability (id/scope/start_url /,
//                   display standalone), the measured palette (#F8F7F6 — the
//                   census-pinned page background on both color roles), and
//                   the two self-hosted swan icons (192 + 512, purpose any).
//
// The contract is ORIGIN-INDEPENDENT (root-relative paths only) and DB-FREE —
// the route is static, not force-dynamic; the build stays DB-free. The
// reference's own /manifest.webmanifest is its SPA catch-all (text/html), so
// this is pure superset. Zero visual surface: install metadata only — the
// parity census is unaffected by construction (19a=19b byte-equal ritual).
import type { MetadataRoute } from "next";

// The measured page background (SKILL §1: rgb(248,247,246)) — the OS-level
// splash and task-switcher tint match the paper the page renders on.
export const MANIFEST_BRAND_COLOR = "#F8F7F6";

export function buildManifest(): MetadataRoute.Manifest {
  return {
    name: "AURELIA",
    short_name: "AURELIA",
    description:
      "AURELIA — crafting timeless luxury since 1987. Discover women's and men's collections, fine accessories and shoes from the world's finest ateliers.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: MANIFEST_BRAND_COLOR,
    theme_color: MANIFEST_BRAND_COLOR,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
