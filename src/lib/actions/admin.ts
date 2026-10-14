"use server";

// Admin mutations: order status/tracking, product stock/visibility.
// Authorization is RE-CHECKED inside every action (never trust the UI gate).

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { adminOrderUpdateSchema, adminProductUpdateSchema } from "@/lib/validation";
import { fail, ok, type ActionResult } from "@/lib/action-result";

async function requireAdmin(): Promise<{ id: string; email: string } | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function adminUpdateOrderAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ updated: true }>> {
  const admin = await requireAdmin();
  if (!admin) return fail("Admin access required.");

  // F-9 (session-3): distinguish "field absent" (keep stored value) from
  // "field present but empty" (clear it) — an admin could previously never
  // erase a carrier/tracking number once set.
  const parsed = adminOrderUpdateSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status") || undefined,
    carrier: formData.has("carrier") ? String(formData.get("carrier") ?? "").trim() || "" : undefined,
    trackingNumber: formData.has("trackingNumber")
      ? String(formData.get("trackingNumber") ?? "").trim() || ""
      : undefined,
  });
  if (!parsed.success) return fail("Check the highlighted fields.");

  const { orderId } = parsed.data;
  const carrier = parsed.data.carrier === undefined ? undefined : parsed.data.carrier || null;
  const trackingNumber =
    parsed.data.trackingNumber === undefined ? undefined : parsed.data.trackingNumber || null;
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return fail("That order no longer exists.");

  await db.$transaction(async (tx) => {
    if (status && status !== order.status) {
      await tx.order.update({ where: { id: orderId }, data: { status } });
      // F-16 (session-3): internal events are stamped actor:"admin" with a
      // clean note (no admin email in customer-visible timelines).
      await tx.orderEvent.create({
        data: {
          orderId,
          type: "status_changed",
          actor: "admin",
          note: `${order.status} → ${status}`,
        },
      });
    }
    const trackingChanged =
      (carrier !== undefined && carrier !== order.carrier) ||
      (trackingNumber !== undefined && trackingNumber !== order.trackingNumber);
    if (trackingChanged) {
      await tx.order.update({
        where: { id: orderId },
        data: { carrier: carrier ?? order.carrier, trackingNumber: trackingNumber ?? order.trackingNumber },
      });
      await tx.orderEvent.create({
        data: {
          orderId,
          type: "tracking_added",
          actor: "admin",
          note: `${carrier ?? order.carrier ?? "Carrier"} — ${trackingNumber ?? order.trackingNumber ?? ""}`.trim(),
        },
      });
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return ok({ updated: true });
}

export async function adminUpdateProductAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ updated: true }>> {
  const admin = await requireAdmin();
  if (!admin) return fail("Admin access required.");

  const parsed = adminProductUpdateSchema.safeParse({
    productId: formData.get("productId"),
    stock: formData.get("stock") !== null && formData.get("stock") !== "" ? Number(formData.get("stock")) : undefined,
    isActive: formData.get("isActive") !== null ? formData.get("isActive") === "true" : undefined,
  });
  if (!parsed.success) return fail("Check the highlighted fields.");

  const { productId, stock, isActive } = parsed.data;
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return fail("That piece no longer exists.");

  await db.product.update({
    where: { id: productId },
    data: {
      ...(stock !== undefined ? { stock } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  return ok({ updated: true });
}
