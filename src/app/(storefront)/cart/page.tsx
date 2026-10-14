import type { Metadata } from "next";
import { CartPageClient } from "@/components/store/cart-page-client";

export const metadata: Metadata = { title: "Shopping Bag" };
export const dynamic = "force-dynamic";

export default function CartPage() {
  return <CartPageClient />;
}
