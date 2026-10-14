import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

// Admin dashboard — role-gated (re-checked server-side on every request).

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/admin");
  if (!(await isAdmin())) redirect("/account");

  const [orders, products, revenueAgg] = await Promise.all([
    db.order.findMany({ orderBy: { placedAt: "desc" }, take: 8 }),
    db.product.findMany({ orderBy: { sortOrder: "asc" } }),
    db.order.aggregate({ _sum: { total: true }, _count: true }),
  ]);
  const lowStock = products.filter((p) => p.stock <= 3 && p.isActive);

  return (
    <div className="py-14 px-6 lg:px-10">
      <div className="max-w-screen-xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-[10px] tracking-[0.4em] text-gold font-montserrat mb-3">ATELIER CONSOLE</div>
          <h1 className="font-cormorant text-5xl font-light">
            Admin <span className="italic">Overview</span>
          </h1>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12">
          {[
            { label: "Revenue", value: formatCents(revenueAgg._sum.total ?? 0) },
            { label: "Orders", value: String(revenueAgg._count) },
            { label: "Products", value: String(products.length) },
            { label: "Low Stock", value: String(lowStock.length) },
          ].map((stat) => (
            <div key={stat.label} className="border border-border bg-card p-6">
              <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">{stat.label}</p>
              <p className="font-cormorant text-3xl font-light">{stat.value}</p>
            </div>
          ))}
        </div>

        {lowStock.length > 0 && (
          <div className="border border-gold/40 bg-gold/5 p-5 mb-12">
            <p className="text-xs tracking-[0.2em] uppercase font-montserrat text-gold mb-2">Low stock alert</p>
            <p className="text-sm font-montserrat text-muted-foreground">
              {lowStock.map((p) => p.name).join(" · ")} — 3 or fewer remaining.
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-10">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-cormorant text-2xl font-light">Recent Orders</h2>
              <Link href="/admin/orders" className="text-[10px] tracking-[0.25em] uppercase font-montserrat text-muted-foreground hover:text-foreground">
                View all
              </Link>
            </div>
            <div className="border border-border divide-y divide-border">
              {orders.map((o) => (
                <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
                  <div>
                    <p className="text-xs font-montserrat font-semibold">{o.number}</p>
                    <p className="text-[10px] text-muted-foreground font-montserrat">{o.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold font-montserrat">{formatCents(o.total)}</p>
                    <p className="text-[10px] text-muted-foreground font-montserrat capitalize">{o.status.replace("_", " ")}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-cormorant text-2xl font-light">Quick Actions</h2>
            </div>
            <div className="flex flex-col gap-3">
              <Link href="/admin/products" className="border border-border p-5 hover:border-foreground transition-colors">
                <p className="text-xs tracking-[0.2em] uppercase font-montserrat">Manage Products</p>
                <p className="text-xs text-muted-foreground font-montserrat mt-1">Stock levels, visibility, pricing review</p>
              </Link>
              <Link href="/admin/orders" className="border border-border p-5 hover:border-foreground transition-colors">
                <p className="text-xs tracking-[0.2em] uppercase font-montserrat">Process Orders</p>
                <p className="text-xs text-muted-foreground font-montserrat mt-1">Status transitions, carrier tracking</p>
              </Link>
              <Link href="/shop" className="border border-border p-5 hover:border-foreground transition-colors">
                <p className="text-xs tracking-[0.2em] uppercase font-montserrat">View Storefront</p>
                <p className="text-xs text-muted-foreground font-montserrat mt-1">Open the customer-facing shop</p>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
