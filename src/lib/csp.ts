// N-1 (session-19): the CSP seam. Production retires
// `script-src 'unsafe-inline'` in favor of a per-request nonce — Next reads
// the nonce from the REQUEST's CSP header
// (next/dist/server/route-modules/app-page/parse-request-headers.js →
// get-script-nonce-from-header.js) and stamps it on every script it
// controls; src/proxy.ts sets the header on both the request (so Next sees
// it) and the response (so the browser enforces it).
//
// Deliberate, documented exceptions:
// - Dev keeps `'unsafe-inline' 'unsafe-eval'` — React's development runtime
//   uses eval(); the shipped CSP stays eval-free (F-7, session-3, SKILL §9
//   #17).
// - `style-src 'unsafe-inline'` stays in BOTH modes: React injects inline
//   styles and Tailwind's utility output rides inline style attributes.
// - A nonceless production call still emits `script-src 'self'` — the safe
//   default (Next's inline bootstrap would be blocked and hydration fails
//   LOUDLY); it must never silently widen back to unsafe-inline.

/** The nonce alphabet Next's getScriptNonceFromHeader accepts. */
const NEXT_NONCE_SOURCE = /^'nonce-([A-Za-z0-9+/_-]+={0,2})'$/;

export interface CspOptions {
  /** Per-request base64 nonce (see mintNonce). Omit only in dev. */
  nonce?: string;
  isDev: boolean;
}

/** Build the full CSP header value. Directives are byte-stable apart from script-src. */
export function buildCspHeader({ nonce, isDev }: CspOptions): string {
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : nonce && NEXT_NONCE_SOURCE.test(`'nonce-${nonce}'`)
      ? `script-src 'self' 'nonce-${nonce}'`
      : "script-src 'self'";
  return (
    [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://images.unsplash.com",
      "font-src 'self'",
      "connect-src 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; ")
  );
}

/** Mint a 128-bit base64 nonce (Web Crypto + btoa — runtime-agnostic). */
export function mintNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

// F-N (session-25): the nonce source step for hand-rendered data blocks.
// Next stamps its nonce on the scripts IT controls (bootstrap + RSC
// payload); a hand-rendered `<script type="application/ld+json">` is served
// nonceless (wire-verified), so the home page extracts the nonce from the
// request's CSP header — which src/proxy.ts sets on BOTH directions — and
// carries it on the data block. A data block is CSP-exempt regardless (the
// HTML spec does not execute it); carrying the nonce keeps the
// security-csp gate's served-bytes per-tag assertion literally true on `/`
// without touching that gate.
const NONCE_IN_HEADER = /'nonce-([A-Za-z0-9+/_-]+={0,2})'/;

/** Extract the nonce value from a CSP header string; null when absent. */
export function extractNonce(cspHeader: string): string | null {
  const match = NONCE_IN_HEADER.exec(cspHeader);
  // An empty extraction is junk (e.g. a bare 'nonce-') — omit the attribute.
  return match && match[1] ? match[1] : null;
}
