"use server";

// Cart mutations — the only write seam for the bag.
//
// Invariants: steppers post ±1 DELTAS (rapid clicks can't lose updates);
// stock clamps silently on increases (never rejects a UI-visible cap);
// totals re-derive from DB rows after every mutation (server truth wins).

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCartDto, getOrCreateCart, type CartDto } from "@/lib/cart";
import { cartAddSchema, cartDeltaSchema } from "@/lib/validation";
import { fail, ok, type ActionResult } from "@/lib/action-result";

/** Clamp for a requested quantity against available stock. */
function clampToStock(requested: number, stock: number): number {
  return Math.max(1, Math.min(requested, Math.max(stock, 0)));
}

export async function addToCartAction(
  productId: string,
  size: string,
  quantity: number,
): Promise<ActionResult<CartDto>> {
  const parsed = cartAddSchema.safeParse({ productId, size, quantity });
  if (!parsed.success) return fail("Invalid bag request.");
  const input = parsed.data;
  const user = await getCurrentUser();
  const product = await db.product.findUnique({ where: { id: input.productId } });
  if (!product || !product.isActive) {
    return fail("This piece is no longer available.");
  }
  if (product.stock <= 0) {
    return fail("This piece is currently out of stock.");
  }
  const cartId = await getOrCreateCart(user?.id ?? null);

  const existing = await db.cartItem.findUnique({
    where: { cartId_productId_size: { cartId, productId: input.productId, size: input.size } },
  });
  const requestedQty = (existing?.quantity ?? 0) + input.quantity;
  const clamped = clampToStock(requestedQty, product.stock);

  if (existing) {
    await db.cartItem.update({ where: { id: existing.id }, data: { quantity: clamped } });
  } else {
    await db.cartItem.create({
      data: { cartId, productId: input.productId, size: input.size, quantity: clampToStock(input.quantity, product.stock) },
    });
  }

  revalidatePath("/", "layout");
  const dto = await getCartDto(user?.id ?? null);
  return ok(dto);
}

export async function adjustCartItemAction(
  itemId: string,
  delta: number,
): Promise<ActionResult<CartDto>> {
  const user = await getCurrentUser();
  const item = await db.cartItem.findUnique({ where: { id: itemId }, include: { cart: true, product: true } });
  if (!item) return fail("That bag line no longer exists.");
  // Ownership: the item's cart must belong to the caller.
  if (user) {
    if (item.cart.userId !== user.id) return fail("Sign in to manage this bag.");
  } else {
    const { findCart } = await import("@/lib/cart");
    const guestCart = await findCart(null);
    if (!guestCart || guestCart.id !== item.cartId) return fail("That bag line no longer exists.");
  }

  const parsedDelta = cartDeltaSchema.safeParse({ delta });
  if (!parsedDelta.success) {
    return fail("Invalid quantity change.");
  }

  const nextQty = item.quantity + parsedDelta.data.delta;
  if (nextQty <= 0) {
    await db.cartItem.delete({ where: { id: item.id } });
  } else {
    const clamped = clampToStock(nextQty, item.product.stock);
    await db.cartItem.update({ where: { id: item.id }, data: { quantity: clamped } });
  }

  revalidatePath("/", "layout");
  const dto = await getCartDto(user?.id ?? null);
  return ok(dto);
}

export async function removeCartItemAction(itemId: string): Promise<ActionResult<CartDto>> {
  const user = await getCurrentUser();
  const item = await db.cartItem.findUnique({ where: { id: itemId }, include: { cart: true } });
  if (!item) return fail("That bag line no longer exists.");
  if (user) {
    if (item.cart.userId !== user.id) return fail("Sign in to manage this bag.");
  } else {
    const { findCart } = await import("@/lib/cart");
    const guestCart = await findCart(null);
    if (!guestCart || guestCart.id !== item.cartId) return fail("That bag line no longer exists.");
  }
  await db.cartItem.delete({ where: { id: item.id } });
  revalidatePath("/", "layout");
  const dto = await getCartDto(user?.id ?? null);
  return ok(dto);
}
