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
import { isUniqueViolation } from "@/lib/prisma-errors";

/**
 * Clamp for a requested quantity against available stock. 0 means the stock
 * is gone — callers decide between "leave the line alone" and "reject the add"
 * (H-15, session-5: the old floor of 1 wrote a qty-1 line for a sold-out piece
 * when the G-4 per-attempt re-read caught a mid-loop sellout).
 */
function clampToStock(requested: number, stock: number): number {
  if (stock <= 0) return 0;
  return Math.max(1, Math.min(requested, stock));
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

  // F-3 (session-3) + G-4 (session-4): the read-then-write race (two concurrent
  // adds of the same (cart, product, size)) hits the @@unique and used to throw
  // P2002 across the seam. The session-3 fix retried exactly once INSIDE the
  // catch — a second violation (3-way race) escaped as a 500, and the clamp
  // reused pre-race stock. Bounded loop instead: re-read stock + line each
  // attempt; the final failure maps to the ActionResult envelope.
  // "written" = line created/updated; "sold-out" = stock is gone (a fresh add
  // is rejected; an existing line is left untouched for the checkout guard).
  const upsertLine = async (): Promise<"written" | "sold-out"> => {
    // G-4: fresh product read per attempt — stock may have moved under contention.
    const current = await db.product.findUnique({ where: { id: input.productId }, select: { stock: true } });
    const stock = current?.stock ?? 0;
    const existing = await db.cartItem.findUnique({
      where: { cartId_productId_size: { cartId, productId: input.productId, size: input.size } },
    });
    if (stock <= 0) {
      // H-15 (session-5): the piece sold out mid-race. Never write a qty-1 line
      // for it — starting a line is rejected; an existing line keeps its
      // quantity (the checkout stock guard owns that conversation).
      return existing ? "written" : "sold-out";
    }
    if (existing) {
      const requestedQty = existing.quantity + input.quantity;
      await db.cartItem.update({ where: { id: existing.id }, data: { quantity: clampToStock(requestedQty, stock) } });
    } else {
      await db.cartItem.create({
        data: { cartId, productId: input.productId, size: input.size, quantity: clampToStock(input.quantity, stock) },
      });
    }
    return "written";
  };
  const MAX_ATTEMPTS = 3;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const outcome = await upsertLine();
      if (outcome === "sold-out") {
        return fail("This piece is currently out of stock.");
      }
      lastError = null;
      break;
    } catch (error) {
      if (!isUniqueViolation(error)) {
        console.error("addToCartAction failed", error);
        return fail("We couldn't update your bag. Please try again.");
      }
      lastError = error;
    }
  }
  if (lastError) {
    console.error("addToCartAction: unique violation persisted after retries", lastError);
    return fail("We couldn't update your bag. Please try again.");
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
  } else if (item.product.stock <= 0) {
    // H-15 (session-5): stock is gone — leave the line untouched (the checkout
    // stock guard surfaces it) instead of writing the clamp's 0.
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
