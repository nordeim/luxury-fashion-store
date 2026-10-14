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
import { isRecordNotFound, isUniqueViolation } from "@/lib/prisma-errors";
import { planAdjustment, planCorrection } from "@/lib/adjust-plan";

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

/**
 * H-42 (session-7): keep the parent row's `updatedAt` truthful so the K-1
 * sweeper's "idle > 30d" predicate measures last ACTIVITY, not creation age
 * (nothing else ever writes cart/wishlist rows — item mutations touch only
 * the children). Best-effort: a failed touch must never fail the user's
 * mutation (the row may have vanished mid-flight — a sweep or merge won).
 */
async function touchTransientParent(model: "cart" | "wishlist", id: string): Promise<void> {
  try {
    if (model === "cart") {
      await db.cart.update({ where: { id }, data: { updatedAt: new Date() } });
    } else {
      await db.wishlist.update({ where: { id }, data: { updatedAt: new Date() } });
    }
  } catch {
    // Non-critical by design — the sweeper's next hourly pass re-derives.
  }
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

  await touchTransientParent("cart", cartId);
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

  // H-23 (session-6) + H-39/H-40 (session-7): the write is a PLANNED atomic
  // delta. `planAdjustment` refuses growth on a sold-out line BEFORE any write
  // (the increment used to land first, violating H-15's "leave the line
  // untouched" on a stale UI); `planCorrection` derives the post-write
  // correction from the OBSERVED quantity, and the executor applies it
  // conditionally (WHERE quantity = observed) so a concurrent ±1 that landed
  // after our write is never erased. Both the write and the corrections
  // tolerate the line vanishing mid-flight — P2025 means the caller's desired
  // end-state already holds, so the action re-syncs the bag and returns ok
  // instead of throwing a raw 500.
  try {
    const plan = planAdjustment(parsedDelta.data.delta, item.product.stock);
    if (plan.kind === "increment") {
      const updated = await db.cartItem.update({
        where: { id: item.id },
        data: { quantity: { increment: plan.delta } },
        select: { quantity: true },
      });
      const correction = planCorrection(updated.quantity, item.product.stock);
      if (correction.kind === "delete") {
        // H-40: conditional — a concurrent increment landing after ours
        // changes `quantity` away from the observed value and survives.
        await db.cartItem.deleteMany({ where: { id: item.id, quantity: updated.quantity } });
      } else if (correction.kind === "clamp") {
        // H-40: clamp against FRESH stock (the pre-read may be stale); a
        // fresh sellout leaves the line for the checkout guard (H-15).
        const fresh = await db.product.findUnique({ where: { id: item.productId }, select: { stock: true } });
        const freshStock = fresh?.stock ?? 0;
        if (freshStock > 0) {
          const capped = Math.min(updated.quantity, freshStock);
          if (capped !== updated.quantity) {
            await db.cartItem.updateMany({
              where: { id: item.id, quantity: updated.quantity },
              data: { quantity: capped },
            });
          }
        }
      }
    }
  } catch (error) {
    if (isRecordNotFound(error)) {
      revalidatePath("/", "layout");
      return ok(await getCartDto(user?.id ?? null));
    }
    throw error;
  }

  await touchTransientParent("cart", item.cartId);
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
  try {
    await db.cartItem.delete({ where: { id: item.id } });
  } catch (error) {
    // H-23 (session-6): the line was removed concurrently (second click of a
    // double-tap, checkout decrementing in parallel) — the desired end-state
    // already holds; re-sync instead of a raw 500 + rejected transition.
    if (isRecordNotFound(error)) {
      revalidatePath("/", "layout");
      return ok(await getCartDto(user?.id ?? null));
    }
    throw error;
  }
  await touchTransientParent("cart", item.cartId);
  revalidatePath("/", "layout");
  const dto = await getCartDto(user?.id ?? null);
  return ok(dto);
}
