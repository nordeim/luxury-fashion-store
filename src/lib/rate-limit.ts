// In-memory fixed-window rate limiter (per-instance, documented tradeoff —
// the deployment is single-node SQLite; horizontal scale would swap this
// seam for a shared store without touching call sites).

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Bounded memory: drop expired buckets lazily when the map grows large.
function gc(now: number): void {
  if (buckets.size < 10_000) return;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  gc(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfterSeconds: 0 };
  }
  existing.count += 1;
  if (existing.count > max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, remaining: max - existing.count, retryAfterSeconds: 0 };
}

/**
 * Best-effort client IP (F-6 + G-2): BOTH `x-forwarded-for` and `x-real-ip`
 * are client-controlled hop headers, so either is honored only when the
 * deployment opts in with TRUST_PROXY=1 (i.e. the app actually sits behind a
 * trusted reverse proxy that overwrites them). Without it, a direct client
 * could rotate either header on every request and never trip a
 * login/register/checkout bucket; headerless clients share one bucket.
 */
export function clientIpFrom(headers: Headers): string {
  if (process.env.TRUST_PROXY === "1") {
    const fwd = headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return headers.get("x-real-ip") ?? "local";
  }
  return "local";
}
