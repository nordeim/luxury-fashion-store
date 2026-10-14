// Boot-time environment guard (F-1 companion, session-3). Next.js calls
// register() once per server process before serving traffic. A misconfigured
// production deploy (missing/short AUTH_SECRET) must fail at startup — not
// at the first signed-in request, and never silently downgrade guest-order
// capability tokens to a public constant.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 8) {
    throw new Error(
      "AUTH_SECRET must be set (>= 8 chars) in production — session cookies and guest order-view tokens are HMAC'd with it.",
    );
  }
}
