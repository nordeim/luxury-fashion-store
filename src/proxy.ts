// N-1 (session-19): the per-request CSP minter.
//
// Production retires `script-src 'unsafe-inline'`: a fresh 128-bit nonce is
// minted for EVERY request, and the CSP header rides BOTH ways —
// 1. on the REQUEST headers, where Next's app-render reads it
//    (next/dist/server/route-modules/app-page/parse-request-headers.js →
//    get-script-nonce-from-header.js) and stamps the nonce on every script
//    it controls (bootstrap + RSC payload);
// 2. on the RESPONSE headers, where the browser enforces it.
// Setting only the response header would leave Next's inline bootstrap
// scripts nonceless — hydration dies on every page (measured against the
// installed next 16.4.0 before writing this).
//
// Dev keeps `'unsafe-inline' 'unsafe-eval'` (F-7, SKILL §9 #17): React's
// development runtime uses eval(). The directive set itself lives in the
// pure seam src/lib/csp.ts (unit-pinned); the other six security headers
// stay static in next.config.ts — only the CSP is per-request.

import { NextResponse, type NextRequest } from "next/server";
import { buildCspHeader, mintNonce } from "@/lib/csp";

export function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";
  const nonce = mintNonce();
  const csp = buildCspHeader({ nonce, isDev });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

// Document navigations (and their RSC payloads). API routes return JSON —
// no document, no CSP needed; _next/static and _next/image are inert assets.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
