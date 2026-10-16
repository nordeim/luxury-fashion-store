import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `standalone` ships a self-contained server (.next/standalone/server.js) —
  // what the E2E suite boots against the scratch e2e database.
  output: "standalone",
  // Hide the floating dev-tools indicator — dev-only chrome with no
  // reference counterpart; it pollutes screenshots.
  devIndicators: false,
  // Pin file tracing to this project so the standalone server always lands
  // at .next/standalone/server.js even inside a parent workspace.
  outputFileTracingRoot: import.meta.dirname,
  // Product/hero art is served from images.unsplash.com (the reference's
  // image CDN); optimization is disabled so the server ships byte-identical
  // sources without a sharp dependency.
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // Next 16 dev-origin protection silently blocks dev chunks served to a
  // 127.0.0.1 origin (unhydrated page / native form fallbacks) — allow both
  // loopback hostnames during development. No effect on production builds.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Security headers. The reference platform (base44) ships
  // referrer-policy / strict-transport-security / x-content-type-options
  // (live-measured 2026-10-14); the rest is the superset (F-7, session-3).
  // CSP is NOT here — since N-1 (session-19) it is minted per-request with
  // a nonce by src/proxy.ts (directives unit-pinned in src/lib/csp.ts);
  // a second static CSP header would intersect the dynamic one and the
  // static 'unsafe-inline' would defeat the nonce.
  // - Permissions-Policy: no browser capabilities are used — deny the noisy
  //   ones explicitly.
  // - COOP: process isolation for the storefront.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      // F-M (session-24): the self-hosted font binaries are immutable —
      // content-addressed by filename, never rewritten in place. Without this
      // they ship `max-age=0` and every visit re-downloads all twelve woff2
      // files. Root-relative `public/fonts/` paths only (not `/_next/static`,
      // which Next already caches immutable).
      {
        source: "/fonts/:file*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
