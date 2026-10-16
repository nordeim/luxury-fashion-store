// F-L (session-24): the /manifest.webmanifest metadata route — installability
// (id/scope/start_url, standalone display), the measured palette, and the
// self-hosted swan icons. The contract lives in the pure seam
// (src/lib/manifest.ts, unit-pinned); this file only adapts it to Next.
// STATIC by design: the contract reads no DB, so the build stays DB-free
// (unlike sitemap.ts, whose catalog query needs force-dynamic).
import type { MetadataRoute } from "next";
import { buildManifest } from "@/lib/manifest";

export default function manifest(): MetadataRoute.Manifest {
  return buildManifest();
}
