"use server";

// Auth mutations: login / register / logout. Zod in, ActionResult out.
// Login is rate-limited (10/15min per IP+email, anti-enumeration copy).

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { mergeGuestCartIntoUser, mergeGuestWishlistIntoUser } from "@/lib/cart";
import { isUniqueViolation } from "@/lib/prisma-errors";
import { clientIpFrom, rateLimit } from "@/lib/rate-limit";
import { loginSchema, registerSchema, validateRedirectPath } from "@/lib/validation";
import { fail, fieldErrorsFrom, type ActionResult } from "@/lib/action-result";

export async function loginAction(_prev: unknown, formData: FormData): Promise<ActionResult<never> | never> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return fail("Check the highlighted fields", fieldErrorsFrom(parsed.error));
  }

  const hdrs = await headers();
  const ip = clientIpFrom(hdrs);
  const limiter = rateLimit(`login:${ip}:${parsed.data.email.toLowerCase()}`, 10, 15 * 60 * 1000);
  if (!limiter.allowed) {
    return fail(`Too many attempts. Try again in ${limiter.retryAfterSeconds} seconds.`);
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    // Identical copy for unknown email and wrong password (anti-enumeration).
    return fail("Incorrect email or password.");
  }

  await createSession(user.id);
  await mergeGuestCartIntoUser(user.id);
  await mergeGuestWishlistIntoUser(user.id);

  const redirectTo = validateRedirectPath(formData.get("redirect"));
  // Session-5 (guest-merge E2E): success MUST redirect server-side. The old
  // envelope + client-push design let the action's own page re-render race
  // the client: the response re-renders /login AFTER createSession set the
  // cookie, so the page guard's `redirect("/account")` rode along in the
  // action payload and bounced ?redirect=/cart logins to /account (flaky —
  // whichever redirect landed last won). A server action redirect responds
  // with the redirect directive alone; the router follows it to the target
  // (fresh RSC: session, merged cart, updated badge) and never re-renders
  // /login. Failures still return the ActionResult envelope above.
  redirect(redirectTo);
}

export async function registerAction(_prev: unknown, formData: FormData): Promise<ActionResult<never> | never> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name") || undefined,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return fail("Check the highlighted fields", fieldErrorsFrom(parsed.error));
  }

  const hdrs = await headers();
  const ip = clientIpFrom(hdrs);
  const limiter = rateLimit(`register:${ip}`, 10, 15 * 60 * 1000);
  if (!limiter.allowed) {
    return fail(`Too many attempts. Try again in ${limiter.retryAfterSeconds} seconds.`);
  }

  const email = parsed.data.email.toLowerCase();
  const local = email.split("@")[0] ?? "Customer";
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return fail("An account with this email already exists.", {
      email: "An account with this email already exists.",
    });
  }

  // Display name: the form's optional name field, else derived from the
  // email local part (john.doe@x → "John Doe").
  const derivedName =
    parsed.data.name?.trim() ||
    local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
      .slice(0, 80) ||
    "AURELIA Customer";

  // H-3 (session-5): two concurrent registers for the same email race past the
  // findUnique above; the loser used to throw P2002 across the seam (raw 500).
  // The unique violation IS the "account exists" outcome — map it to the same
  // envelope the pre-check returns.
  let user;
  try {
    user = await db.user.create({
      data: {
        email,
        passwordHash: hashPassword(parsed.data.password),
        name: derivedName,
        role: "user",
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail("An account with this email already exists.", {
        email: "An account with this email already exists.",
      });
    }
    throw error;
  }

  await createSession(user.id);
  await mergeGuestCartIntoUser(user.id);
  await mergeGuestWishlistIntoUser(user.id);

  // Session-5: server-side redirect for the same reason as loginAction — the
  // action response must not re-render /register with a live session (its
  // page guard redirects, racing the client push).
  redirect("/account");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
