import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { parseShippingAddress } from "@/lib/address";
import { AdminOrderActions } from "@/components/account/admin-order-actions";

export const metadata: Metadata = { title: "Admin — Order Detail" };
export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/admin/orders");
  // H-34 (session-6): role checked on the already-loaded user — isAdmin()
  // re-fetched the session + user for a comparison it already had.
  if (user.role !== "admin") redirect("/account");

  const order = await db.order.findUnique({
    where: { id },
    include: { items: true, events: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) notFound();

  // F-8 (session-3): safe parse — a corrupted address row must not 500 the page.
  const address = parseShippingAddress(order.shippingAddress);

  return (
    <div className="py-14 px-6 lg:px-10">
      <div className="max-w-screen-lg mx-auto">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase font-montserrat text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft size={14} /> All Orders
        </Link>

        <div className="mb-10">
          <div className="text-[10px] tracking-[0.4em] text-gold font-montserrat mb-2">ORDER {order.number}</div>
          <h1 className="font-cormorant text-4xl font-light">
            {order.email} · {formatCents(order.total)}
          </h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 flex flex-col gap-8">
            <section className="border border-border divide-y divide-border">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 p-5 items-center">
                  <img src={item.imageSnapshot ?? ""} alt="" className="w-14 h-18 object-cover rounded-sm bg-secondary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-montserrat font-medium">{item.nameSnapshot}</p>
                    <p className="text-[10px] text-muted-foreground font-montserrat">
                      {item.brandSnapshot} · Qty {item.quantity}{item.sizeSnapshot ? ` · ${item.sizeSnapshot}` : ""} · {formatCents(item.unitPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </section>

            <section className="border border-border p-6">
              <h2 className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-4">Event Timeline</h2>
              <ol className="flex flex-col gap-3">
                {order.events.map((e) => (
                  <li key={e.id} className="flex items-baseline gap-3 text-sm font-montserrat">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 translate-y-[-2px]" aria-hidden="true" />
                    <span className="capitalize">{e.type.replace("_", " ")}</span>
                    {e.note && <span className="text-xs text-muted-foreground">{e.note}</span>}
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                      {e.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside className="flex flex-col gap-6 h-fit">
            <AdminOrderActions
              orderId={order.id}
              status={order.status}
              carrier={order.carrier}
              trackingNumber={order.trackingNumber}
            />
            <div className="border border-border p-6">
              <h2 className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">Customer</h2>
              <p className="text-sm font-montserrat">{address.fullName}</p>
              <p className="text-xs text-muted-foreground font-montserrat mt-1">{order.email}</p>
              <p className="text-xs text-muted-foreground font-montserrat mt-3">
                {address.street}, {address.city}, {address.state} {address.zip}, {address.country}
              </p>
            </div>
            <div className="border border-border p-6">
              <h2 className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">Payment</h2>
              <p className="text-sm font-montserrat capitalize">
                {order.paymentMethod === "cod" ? "Cash on Delivery" : `Card ···· ${order.cardLast4 ?? ""}`}
              </p>
              {order.paymentStatus && (
                <p className="text-xs text-muted-foreground font-montserrat mt-1 capitalize">
                  {order.paymentStatus}
                </p>
              )}
              <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2 text-sm font-montserrat">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCents(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{order.shipping === 0 ? "Free" : formatCents(order.shipping)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t border-border">
                  <span>Total</span>
                  <span>{formatCents(order.total)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
