import { headers } from "next/headers";
import { extractNonce } from "@/lib/csp";
import { serializeJsonLd, storeRootJsonLd } from "@/lib/structured-data";

// (auth) group layout — chrome-less by ADR-008: the measured slate auth
// cards render with no header/footer/overlays. This layout exists since F-S
// (session-26) and ships ONLY the two site-level identity graphs: the
// reference's login head carries WebSite + Organization JSON-LD exactly like
// its home (measured 2026-10-17 — the builder injects them on every page),
// and the clone's auth pages shipped zero (the session-25 fix scoped the
// blocks to the storefront layout). They render BEFORE the page content so
// the served order matches the reference: WebSite → Organization → the
// page's own BreadcrumbList. Same nonce discipline as the storefront layout
// (hand-rendered data blocks are not nonce-stamped by Next; the attribute is
// omitted in dev where no nonce exists).
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cspHeader = (await headers()).get("content-security-policy") ?? "";
  const nonce = extractNonce(cspHeader) ?? undefined;

  return (
    <>
      {storeRootJsonLd(
        process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
      ).map((block) => (
        <script
          key={block["@type"]}
          type="application/ld+json"
          nonce={nonce}
          // The F-D discipline (raw-HTML sinks stay enumerated and escaped):
          // serializeJsonLd escapes `<` so no future string value can
          // terminate the data block early.
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(block) }}
        />
      ))}
      {children}
    </>
  );
}
