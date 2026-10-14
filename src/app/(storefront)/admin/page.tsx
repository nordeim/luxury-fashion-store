import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

// Admin dashboard — role-gated (re-checked server-side on every request).

export default async function AdminPage() {
  // H-34 (session-6): a single getCurrentUser() — the isAdmin() helper used
  // to re-fetch the session + user for a role check the loaded user already
  // answers.
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/admin");
  if (user.role !== "admin") redirect("/account");

  const [orders, lowStockCount, lowStock, productCount, revenueAgg, orderCount] = await Promise.all([
    db.order.findMany({ orderBy: { placedAt: "desc" }, take: 8 }),
    // G-3 (session-4): the KPI reads a dedicated COUNT — the list below is
    // take-capped (20), so lowStock.length would silently under-count once
    // more than 20 products sit at or below the threshold (F-21 class).
    db.product.count({ where: { isActive: true, stock: { lte: 3 } } }),
    db.product.findMany({
      where: { isActive: true, stock: { lte: 3 } },
      orderBy: { sortOrder: "asc" },
      take: 20,
    }),
    db.product.count(),
    // H-28 (session-6): Revenue excludes cancelled orders — a refund isn't
    // revenue. The Orders KPI intentionally stays "all orders placed", so it
    // reads its own unfiltered count (the aggregate's where would filter it).
    db.order.aggregate({
      _sum: { total: true },
      _count: true,
      where: { status: { not: "cancelled" } },
    }),
    db.order.count(),
  ]);

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
            { label: "Orders", value: String(orderCount) },
            { label: "Products", value: String(productCount) },
            { label: "Low Stock", value: String(lowStockCount) },
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
