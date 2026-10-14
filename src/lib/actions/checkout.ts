"use server";

// Checkout — place the order in ONE transaction.
//
// Invariants: money math re-derives from DB rows inside the transaction
// (client prices never trusted); stock is re-read and decremented inside the
// transaction (overselling rejected with customer-safe copy); order numbers
// allocate as count+1 zero-padded (race-free on single-writer SQLite);
// guest confirmations ride an HMAC view-token (sequential numbers are not
// capability tokens).

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { findCart } from "@/lib/cart";
import { shippingForSubtotal } from "@/lib/money";
import { clientIpFrom, rateLimit } from "@/lib/rate-limit";
import { checkoutSchema, isLuhnValid } from "@/lib/validation";
import { fail, fieldErrorsFrom, ok } from "@/lib/action-result";
import { orderViewToken } from "@/lib/order-token";
import type { PlacedOrderResult } from "@/lib/actions/checkout-types";

export async function placeOrderAction(
  _prev: unknown,
  formData: FormData,
): Promise<import("@/lib/action-result").ActionResult<PlacedOrderResult>> {
  const parsed = checkoutSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    street: formData.get("street"),
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
    country: formData.get("country") || "United States",
    paymentMethod: formData.get("paymentMethod") || "card",
    // FormData.get() yields NULL (not undefined) for absent keys — zod
    // `.optional()` rejects null, so absent card fields must coerce. COD
    // orders never set them; card orders always do (submit handler).
    cardNumber: formData.get("cardNumber") ?? undefined,
    cardExpiry: formData.get("cardExpiry") ?? undefined,
    cardCvc: formData.get("cardCvc") ?? undefined,
  });
  if (!parsed.success) {
    // Field-level diagnostics: the review step renders only the generic
    // message, so without this the failing field is invisible server-side.
    console.error("[checkout] validation failed:", parsed.error.flatten().fieldErrors);
    return fail("Check the highlighted fields", fieldErrorsFrom(parsed.error));
  }
  const data = parsed.data;

  if (data.paymentMethod === "card") {
    if (!data.cardNumber || !isLuhnValid(data.cardNumber)) {
      return fail("Check the highlighted fields", { cardNumber: "Enter a valid card number" });
    }
    if (!data.cardExpiry || !/^(0[1-9]|1[0-2])\s?\/\s?\d{2}$/.test(data.cardExpiry.replace(/\s/g, ""))) {
      return fail("Check the highlighted fields", { cardExpiry: "Enter a valid expiry (MM/YY)" });
    }
    if (!data.cardCvc || !/^\d{3,4}$/.test(data.cardCvc)) {
      return fail("Check the highlighted fields", { cardCvc: "Enter a valid CVC" });
    }
  }

  const hdrs = await headers();
  const limiter = rateLimit(`checkout:${clientIpFrom(hdrs)}`, 10, 10 * 60 * 1000);
  if (!limiter.allowed) {
    return fail(`Too many attempts. Try again in ${limiter.retryAfterSeconds} seconds.`);
  }

  const user = await getCurrentUser();
  const cart = await findCart(user?.id ?? null);
  if (!cart) return fail("Your bag is empty.");

  try {
    const placed = await db.$transaction(async (tx) => {
      const items = await tx.cartItem.findMany({
        where: { cartId: cart.id },
        include: { product: true },
      });
      if (items.length === 0) throw new Error("EMPTY_CART");

      // Server-truth totals (never trust the client's numbers).
      const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
      const shipping = shippingForSubtotal(subtotal);
      const total = subtotal + shipping;

      // Stock re-read + decrement inside the transaction (oversell guard).
      for (const item of items) {
        const fresh = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stock: true, isActive: true },
        });
        if (!fresh || !fresh.isActive || fresh.stock < item.quantity) {
          throw new Error(`STOCK_SHORT:${item.productId}`);
        }
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Order number: count+1 zero-padded inside the tx (single-writer SQLite).
      const count = await tx.order.count();
      const number = `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

      const cardLast4 =
        data.paymentMethod === "card" && data.cardNumber
          ? data.cardNumber.replace(/[\s-]/g, "").slice(-4)
          : null;

      const order = await tx.order.create({
        data: {
          number,
          userId: user?.id ?? null,
          email: user?.email ?? data.email,
          status: "processing",
          subtotal,
          shipping,
          total,
          shippingAddress: JSON.stringify({
            fullName: data.fullName,
            street: data.street,
            city: data.city,
            state: data.state,
            zip: data.zip,
            country: data.country,
          }),
          paymentMethod: data.paymentMethod,
          cardLast4,
          // Demo settlement: card orders confirm immediately (SAQ-A style
          // "paid" — the reference storefront has no live PSP).
          paymentStatus: data.paymentMethod === "card" ? "paid" : null,
          items: {
            create: items.map((i) => ({
              productId: i.productId,
              nameSnapshot: i.product.name,
              brandSnapshot: i.product.brand,
              imageSnapshot: (JSON.parse(i.product.images || "[]") as string[])[0] ?? "",
              sizeSnapshot: i.size,
              unitPrice: i.product.price,
              quantity: i.quantity,
            })),
          },
          events: { create: [{ type: "placed" }] },
        },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return order;
    });

    // NOTE: no revalidatePath here. Every storefront route is force-dynamic
    // (re-rendered per request), so path revalidation buys no freshness —
    // but it DOES make the /checkout page re-render mid-action with an
    // emptied cart, whose server redirect("/cart") races the client's
    // router.push("/checkout/success") and usually wins. The header badge
    // updates client-side via setCart(EMPTY_CART) in the flow's ok-branch.
    const result: PlacedOrderResult = { number: placed.number };
    if (!user) result.viewToken = orderViewToken(placed.number);
    return ok(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "EMPTY_CART") return fail("Your bag is empty.");
    if (message.startsWith("STOCK_SHORT")) {
      return fail("A piece in your bag just sold out. Please review your bag.");
    }
    console.error("[checkout]", err);
    return fail("We couldn't place your order. Please try again.");
  }
}
