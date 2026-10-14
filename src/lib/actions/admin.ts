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

  const parsed = adminOrderUpdateSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status") || undefined,
    carrier: formData.get("carrier") || undefined,
    trackingNumber: formData.get("trackingNumber") || undefined,
  });
  if (!parsed.success) return fail("Check the highlighted fields.");

  const { orderId, status, carrier, trackingNumber } = parsed.data;
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return fail("That order no longer exists.");

  await db.$transaction(async (tx) => {
    if (status && status !== order.status) {
      await tx.order.update({ where: { id: orderId }, data: { status } });
      await tx.orderEvent.create({
        data: {
          orderId,
          type: "status_changed",
          note: `${order.status} → ${status} by ${admin.email}`,
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
          note: `${carrier ?? order.carrier ?? "Carrier"} — ${trackingNumber ?? order.trackingNumber ?? ""} by ${admin.email}`,
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
