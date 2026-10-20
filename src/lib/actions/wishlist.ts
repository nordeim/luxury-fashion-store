"use server";

// Wishlist mutations: toggle (add when absent, remove when present).

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateWishlist } from "@/lib/cart";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { wishlistMutationSchema } from "@/lib/validation";

export interface WishlistToggleResult {
  wishlisted: boolean;
}

export async function toggleWishlistAction(productId: string): Promise<ActionResult<WishlistToggleResult>> {
  // H-53 (session-8): Zod at the seam — the schema existed unused and a
  // malformed id reached Prisma unvalidated (raw PrismaClientValidationError
  // 500 outside the try/catch). AGENTS.md rule 5: validate at every seam.
  const parsed = wishlistMutationSchema.safeParse({ productId });
  if (!parsed.success) return fail("Invalid wishlist request.");

  const user = await getCurrentUser();
  // F-TT (session-49): the availability wall's inactive half — the cart's
  // exact mirror (cart.ts:57-60). The existence-only check let a
  // DEACTIVATED product (the admin's H-7 visibility toggle) be wishlisted
  // over the wire or from a stale PDP tab, minting a hidden row whose only
  // wire-visible trace is the header badge (the RAW set) counting it while
  // the wishlist page's isActive:true read renders the empty-state guidance
  // — the badge-vs-page disagreement, reproduced end-to-end in the plan
  // probe and pinned by the F-TT spec.
  const product = await db.product.findUnique({
    where: { id: parsed.data.productId },
    select: { id: true, isActive: true },
  });
  if (!product || !product.isActive) return fail("This piece is no longer available.");

  const wishlistId = await getOrCreateWishlist(user?.id ?? null);

  // H-42 (session-7): keep the parent row's `updatedAt` truthful so the K-1
  // sweeper's "idle > 30d" predicate measures last ACTIVITY, not creation
  // age. Best-effort — a failed touch must never fail the toggle.
  const touch = db.wishlist
    .update({ where: { id: wishlistId }, data: { updatedAt: new Date() } })
    .catch(() => {});

  // F-3 (session-3): the delete/create toggle raced on the @@unique (two rapid
  // toggles, or toggle+merge) and threw P2002 across the seam. Resolve the
  // winner by existence inside a transaction, and map residual races to the
  // envelope instead of throwing.
  try {
    const wishlisted = await db.$transaction(async (tx) => {
      const existing = await tx.wishlistItem.findUnique({
        where: { wishlistId_productId: { wishlistId, productId: parsed.data.productId } },
      });
      if (existing) {
        await tx.wishlistItem.delete({ where: { id: existing.id } });
        return false;
      }
      await tx.wishlistItem.create({ data: { wishlistId, productId: parsed.data.productId } });
      return true;
    });
    await touch;
    revalidatePath("/", "layout");
    return ok({ wishlisted });
  } catch (error) {
    console.error("toggleWishlistAction failed", error);
    return fail("We couldn't update your wishlist. Please try again.");
  }
}
