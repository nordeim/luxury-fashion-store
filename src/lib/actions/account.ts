"use server";

// Account mutations: profile, password change, address book.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, hashPassword, verifyPassword, currentSessionToken } from "@/lib/auth";
import { addressSchema, passwordSchema } from "@/lib/validation";
import { fail, fieldErrorsFrom, ok, type ActionResult } from "@/lib/action-result";

export async function updateProfileAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ name: string; email: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to update your profile.");

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 80) {
    return fail("Check the highlighted fields", { name: "Enter your full name" });
  }
  const updated = await db.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/account");
  return ok({ name: updated.name, email: updated.email });
}

export async function changePasswordAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ changed: true }>> {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to change your password.");

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  const record = await db.user.findUnique({ where: { id: user.id } });
  if (!record) return fail("Sign in to change your password.");
  if (!verifyPassword(current, record.passwordHash)) {
    return fail("Check the highlighted fields", { currentPassword: "Current password is incorrect" });
  }
  // F-10 (session-3): reuse the governed password schema instead of
  // hand-rolled length rules (single source of truth for the policy).
  const parsed = passwordSchema.safeParse(next);
  if (!parsed.success) {
    return fail("Check the highlighted fields", { newPassword: parsed.error.issues[0]?.message ?? "Invalid password" });
  }
  if (next !== confirm) {
    return fail("Check the highlighted fields", { confirmPassword: "Passwords do not match" });
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(next) } });
  // F-4 (session-3): a password rotation must revoke every OTHER session — a
  // hijacked session previously survived the change. The current session (the
  // caller's own cookie) is kept so the user isn't logged out mid-flow.
  const keepToken = await currentSessionToken();
  await db.session.deleteMany({
    where: { userId: user.id, ...(keepToken ? { token: { not: keepToken } } : {}) },
  });
  revalidatePath("/account");
  return ok({ changed: true });
}

export async function saveAddressAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ saved: true }>> {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to manage your address book.");

  const parsed = addressSchema.safeParse({
    label: formData.get("label") || "Home",
    fullName: formData.get("fullName"),
    street: formData.get("street"),
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
    country: formData.get("country") || "United States",
  });
  if (!parsed.success) {
    // H-19 (session-5): reuse the shared mapper (the hand-rolled loop here had
    // drifted to last-wins semantics; fieldErrorsFrom is first-wins).
    return fail("Check the highlighted fields", fieldErrorsFrom(parsed.error));
  }

  const existingId = String(formData.get("id") ?? "");
  if (existingId) {
    const existing = await db.address.findUnique({ where: { id: existingId } });
    if (!existing || existing.userId !== user.id) return fail("That address no longer exists.");
    await db.address.update({ where: { id: existingId }, data: parsed.data });
  } else {
    const count = await db.address.count({ where: { userId: user.id } });
    await db.address.create({
      data: { ...parsed.data, userId: user.id, isDefault: count === 0 },
    });
  }
  revalidatePath("/account");
  return ok({ saved: true });
}

export async function deleteAddressAction(addressId: string): Promise<ActionResult<{ deleted: true }>> {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to manage your address book.");
  const existing = await db.address.findUnique({ where: { id: addressId } });
  if (!existing || existing.userId !== user.id) return fail("That address no longer exists.");
  await db.address.delete({ where: { id: addressId } });
  revalidatePath("/account");
  return ok({ deleted: true });
}

export async function setDefaultAddressAction(addressId: string): Promise<ActionResult<{ done: true }>> {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to manage your address book.");
  const existing = await db.address.findUnique({ where: { id: addressId } });
  if (!existing || existing.userId !== user.id) return fail("That address no longer exists.");
  // Default is exclusive: clear others, then set — one transaction (F-13,
  // session-3) so concurrent calls can't end with two or zero defaults.
  await db.$transaction([
    db.address.updateMany({ where: { userId: user.id, isDefault: true }, data: { isDefault: false } }),
    db.address.update({ where: { id: addressId }, data: { isDefault: true } }),
  ]);
  revalidatePath("/account");
  return ok({ done: true });
}
