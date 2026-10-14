// Auth seam — scrypt password hashing + DB-backed sessions + HMAC cookies.
//
// Design (inherited ADR-006 from the repo family): no auth library. scrypt
// defends low-entropy secrets; sessions are DB rows (revocable — the session
// table IS the denylist); the cookie carries `token.hmac(token)` so a stolen
// DB cannot mint cookies and a tampered cookie fails HMAC before any DB hit.
// Login is rate-limited in src/lib/rate-limit.ts.

import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "aurelia_session";
export const SESSION_TTL_DAYS = 30;
const SCRYPT_KEYLEN = 64;

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 8) {
    // Fail loud in production; dev fallback keeps local flows working.
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set in production");
    }
    return "aurelia-dev-secret-rotate-in-production-4f8b2c";
  }
  return secret;
}

/**
 * Governed HMAC secret for every capability token in the app (sessions AND
 * guest order views). F-1 (session-3): order-token.ts previously kept its own
 * lenient fallback — with no cookie present `getCurrentUser` returns early,
 * `authSecret` never runs, and a misconfigured production deploy would mint
 * order-view tokens HMAC'd with a public constant (sequential order numbers
 * made every guest order readable). One validated source, shared everywhere.
 */
export function capabilitySecret(): string {
  return authSecret();
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `s1$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "s1") return false;
  const [, salt, expectedHex] = parts;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function signToken(token: string): string {
  return `${token}.${createHmac("sha256", authSecret()).update(token).digest("base64url")}`;
}

function parseCookieValue(value: string): string | null {
  const idx = value.lastIndexOf(".");
  if (idx <= 0) return null;
  const token = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  const expected = createHmac("sha256", authSecret()).update(token).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return token;
}

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function toSafeUser(u: { id: string; email: string; name: string; role: string }): SafeUser {
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

/** Create a DB session row and set the signed httpOnly cookie. */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { token, userId, expiresAt } });
  const store = await cookies();
  store.set(SESSION_COOKIE, signToken(token), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** Delete the current session row (if any) and clear the cookie. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (raw) {
    const token = parseCookieValue(raw);
    if (token) {
      await db.session.deleteMany({ where: { token } });
    }
  }
  store.delete(SESSION_COOKIE);
}

/** The caller's current session token (null when anonymous) — lets actions
 * scope "revoke all other sessions" without logging the caller out. */
export async function currentSessionToken(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return parseCookieValue(raw);
}

/** Resolve the signed-in user from the session cookie (null when anonymous). */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const token = parseCookieValue(raw);
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return toSafeUser(session.user);
}
