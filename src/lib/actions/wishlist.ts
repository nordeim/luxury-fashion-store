"use server";

// Wishlist mutations: toggle (add when absent, remove when present).

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateWishlist } from "@/lib/cart";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export interface WishlistToggleResult {
  wishlisted: boolean;
}

export async function toggleWishlistAction(productId: string): Promise<ActionResult<WishlistToggleResult>> {
  const user = await getCurrentUser();
  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return fail("This piece is no longer available.");

  const wishlistId = await getOrCreateWishlist(user?.id ?? null);

  // F-3 (session-3): the delete/create toggle raced on the @@unique (two rapid
  // toggles, or toggle+merge) and threw P2002 across the seam. Resolve the
  // winner by existence inside a transaction, and map residual races to the
  // envelope instead of throwing.
  try {
    const wishlisted = await db.$transaction(async (tx) => {
      const existing = await tx.wishlistItem.findUnique({
        where: { wishlistId_productId: { wishlistId, productId } },
      });
      if (existing) {
        await tx.wishlistItem.delete({ where: { id: existing.id } });
        return false;
      }
      await tx.wishlistItem.create({ data: { wishlistId, productId } });
      return true;
    });
    revalidatePath("/", "layout");
    return ok({ wishlisted });
  } catch (error) {
    console.error("toggleWishlistAction failed", error);
    return fail("We couldn't update your wishlist. Please try again.");
  }
}
