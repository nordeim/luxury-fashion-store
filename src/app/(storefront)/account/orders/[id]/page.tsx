import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Truck, Package } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatCents } from "@/lib/money";
import { parseShippingAddress, type ShippingAddressView } from "@/lib/address";

export const metadata: Metadata = { title: "Order Detail" };
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  processing: "Processing",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const order = await db.order.findUnique({
    where: { id },
    include: { items: true, events: { orderBy: { createdAt: "asc" } } },
  });
  // Owner gate: customers see only their own orders (admins use /admin/orders).
  if (!order || order.userId !== user.id) notFound();

  // F-8 (session-3): safe parse — a corrupted address row must not 500 the page.
  const address = parseShippingAddress(order.shippingAddress) as ShippingAddressView;
  // F-16 (session-3): hide admin-authored events by the structured actor
  // field — the old `note.includes("admin@")` heuristic leaked internal notes
  // whenever the admin email changed.
  const customerEvents = order.events.filter((e) => e.actor !== "admin");

  return (
    <div className="py-14 px-6 lg:px-10">
      <div className="max-w-screen-lg mx-auto">
        <Link
          href="/account"
          className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase font-montserrat text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Back to Account
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <div className="text-[10px] tracking-[0.4em] text-gold font-montserrat mb-2">ORDER {order.number}</div>
            <h1 className="font-cormorant text-4xl font-light">
              Placed {order.placedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </h1>
          </div>
          <span className={`text-[10px] tracking-widest uppercase font-montserrat border px-3 py-1.5 w-fit ${order.status === "delivered" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : order.status === "in_transit" ? "bg-blue-50 text-blue-700 border-blue-200" : order.status === "cancelled" ? "bg-red-50 text-red-700 border-red-200" : "bg-gold/15 text-gold border-gold/30"}`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>

        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 flex flex-col gap-8">
            <section className="border border-border divide-y divide-border">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 p-5 items-center">
                  { }
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
            </section>

            <section className="border border-border p-6">
              <h2 className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-4">Order Progress</h2>
              <ol className="flex flex-col gap-3">
                {customerEvents.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 text-sm font-montserrat">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" aria-hidden="true" />
                    <span className="capitalize">{e.type.replace("_", " ")}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {e.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside className="flex flex-col gap-6 h-fit">
            <div className="border border-border p-6">
              <h2 className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3 flex items-center gap-2">
                <Package size={13} /> Payment
              </h2>
              <p className="text-sm font-montserrat capitalize">
                {order.paymentMethod === "cod" ? "Cash on Delivery" : `Card ···· ${order.cardLast4 ?? ""}`}
              </p>
              {order.paymentStatus && (
                <p className="text-xs text-muted-foreground font-montserrat mt-1 capitalize">{order.paymentStatus}</p>
              )}
              <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2 text-sm font-montserrat">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCents(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{order.shipping === 0 ? "Complimentary" : formatCents(order.shipping)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t border-border">
                  <span>Total</span>
                  <span>{formatCents(order.total)}</span>
                </div>
              </div>
            </div>
            <div className="border border-border p-6">
              <h2 className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3 flex items-center gap-2">
                <Truck size={13} /> Shipping
              </h2>
              <p className="text-sm font-montserrat">{address.fullName}</p>
              <p className="text-xs text-muted-foreground font-montserrat mt-1">
                {address.street}, {address.city}, {address.state} {address.zip}, {address.country}
              </p>
              {order.carrier && (
                <p className="text-xs font-montserrat mt-3">
                  {order.carrier} — {order.trackingNumber}
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
