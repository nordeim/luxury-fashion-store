// Boot-time environment guard (F-1 companion, session-3). Next.js calls
// register() once per server process before serving traffic. A misconfigured
// production deploy (missing/short AUTH_SECRET) must fail at startup — not
// at the first signed-in request, and never silently downgrade guest-order
// capability tokens to a public constant.
//
// K-1 (session-6): the process also owns the transient-state sweeper — one
// pass at boot, then hourly. Deletes are idempotent, so multi-instance
// deployments duplicate the work harmlessly.
import { runSweep } from "@/lib/sweeper";

const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const secret = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 8)) {
    throw new Error(
      "AUTH_SECRET must be set (>= 8 chars) in production — session cookies and guest order-view tokens are HMAC'd with it.",
    );
  }
  void runSweep().catch((error) => console.error("[sweeper] boot sweep failed", error));
  const timer = setInterval(() => {
    runSweep().catch((error) => console.error("[sweeper] sweep failed", error));
  }, SWEEP_INTERVAL_MS);
  // Never hold the process open just for the next sweep.
  timer.unref?.();
}
