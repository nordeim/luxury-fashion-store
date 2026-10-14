import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCartDto } from "@/lib/cart";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  const cart = await getCartDto(user?.id ?? null);
  if (cart.lines.length === 0) redirect("/cart");

  const defaultAddress = user
    ? ((await db.address.findFirst({
        where: { userId: user.id, isDefault: true },
      })) ?? null)
    : null;

  return (
    <CheckoutFlow
      cart={cart}
      user={user ? { email: user.email, name: user.name } : null}
      defaultAddress={
        defaultAddress
          ? {
              fullName: defaultAddress.fullName,
              street: defaultAddress.street,
              city: defaultAddress.city,
              state: defaultAddress.state,
              zip: defaultAddress.zip,
              country: defaultAddress.country,
            }
          : null
      }
    />
  );
}
