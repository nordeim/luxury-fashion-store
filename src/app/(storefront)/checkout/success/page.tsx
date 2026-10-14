import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { verifyOrderViewToken } from "@/lib/order-token";
import { formatCents } from "@/lib/money";
import { estimateDelivery } from "@/lib/delivery";
import { parseShippingAddress } from "@/lib/address";
import { firstParam } from "@/lib/search-params";
import { CheckCircle2, Package, Truck } from "lucide-react";

export const metadata: Metadata = { title: "Order Confirmed" };
export const dynamic = "force-dynamic";

interface SuccessPageProps {
  searchParams: Promise<{ order?: string; t?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  // G-8 (session-4) + H-1 (session-5): Next types searchParams values as
  // string, but repeated keys (?t=a&t=b) arrive as string[] at runtime. Every
  // value passes through firstParam — a non-string must simply fail
  // verification (404), never reach the HMAC seam or a Prisma where malformed.
  const { order: orderParam, t: tokenParam } = await searchParams;
  const orderNumber = firstParam(orderParam);
  const tokenValue = firstParam(tokenParam);
  if (!orderNumber) notFound();

  const order = await db.order.findUnique({
    where: { number: orderNumber },
    include: { items: true },
  });
  if (!order) notFound();

  // Capability gate: signed-in owners see their own orders; guests need the
  // HMAC view-token. Anything else is a 404 (no existence leak).
  const user = await getCurrentUser();
  const isOwner = user && order.userId === user.id;
  const isGuestWithToken = !order.userId && tokenValue && verifyOrderViewToken(order.number, tokenValue);
  if (!isOwner && !isGuestWithToken) notFound();

  // F-8 (session-3): safe parse — a corrupted address row must not 500 the page.
  const address = parseShippingAddress(order.shippingAddress);
  const delivery = estimateDelivery(order.placedAt);

  return (
    <div className="py-16 px-6 lg:px-10">
      <div className="max-w-2xl mx-auto text-center">
        <div className="w-16 h-16 rounded-full border-2 border-gold text-gold flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={30} strokeWidth={1.5} />
        </div>
        <div className="text-[10px] tracking-[0.4em] text-gold font-montserrat mb-3">ORDER {order.number}</div>
        <h1 className="font-cormorant text-5xl font-light mb-4">
          Thank You for Your <span className="italic">Order</span>
        </h1>
        <p className="text-sm text-muted-foreground font-montserrat mb-10 max-w-md mx-auto">
          A confirmation has been sent to {order.email}. Our ateliers are preparing your pieces with the utmost care.
        </p>

        <div className="bg-card border border-border p-8 text-left">
          <div className="grid sm:grid-cols-2 gap-6 pb-6 border-b border-border">
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2 flex items-center gap-2">
                <Truck size={13} /> Estimated Delivery
              </p>
              <p className="font-cormorant text-xl">{delivery.label}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2 flex items-center gap-2">
                <Package size={13} /> Payment
              </p>
              <p className="font-cormorant text-xl capitalize">
                {order.paymentMethod === "cod" ? "Cash on Delivery" : `Card ···· ${order.cardLast4 ?? ""}`}
              </p>
            </div>
          </div>
          <div className="py-6 border-b border-border flex flex-col gap-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4 items-center">
                <img src={item.imageSnapshot ?? ""} alt="" className="w-16 h-20 object-cover rounded-sm bg-secondary" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{item.brandSnapshot}</p>
                  <p className="font-cormorant text-lg">{item.nameSnapshot}</p>
                  <p className="text-xs text-muted-foreground font-montserrat">
                    Qty {item.quantity}{item.sizeSnapshot ? ` · Size ${item.sizeSnapshot}` : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold font-montserrat">{formatCents(item.unitPrice * item.quantity)}</p>
              </div>
            ))}
          </div>
          <div className="pt-6 flex flex-col gap-2 text-sm font-montserrat">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCents(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{order.shipping === 0 ? "Complimentary" : formatCents(order.shipping)}</span>
            </div>
            <div className="flex justify-between font-cormorant text-xl font-medium pt-3 border-t border-border">
              <span>Total</span>
              <span>{formatCents(order.total)}</span>
            </div>
            <div className="mt-4 text-xs text-muted-foreground font-montserrat">
              Shipping to: {address.fullName}, {address.street}, {address.city}, {address.state} {address.zip}, {address.country}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
          <Link
            href="/shop"
            className="bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase px-10 py-4 hover:bg-accent transition-colors font-montserrat"
          >
            Continue Shopping
          </Link>
          <Link
            href="/account"
            className="border border-primary text-xs tracking-[0.2em] uppercase px-10 py-4 hover:bg-primary hover:text-primary-foreground transition-colors font-montserrat"
          >
            Track Your Order
          </Link>
        </div>
      </div>
    </div>
  );
}
