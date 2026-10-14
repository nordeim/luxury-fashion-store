import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { firstParam } from "@/lib/search-params";
import { AdminOrdersTable } from "@/components/account/admin-orders-table";

export const metadata: Metadata = { title: "Admin — Orders" };
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/admin/orders");
  // H-34 (session-6): role checked on the already-loaded user — isAdmin()
  // re-fetched the session + user for a comparison it already had.
  if (user.role !== "admin") redirect("/account");

  // H-1 (session-5): repeated query keys (?status=a&status=b) arrive as
  // string[] at runtime — firstParam coerces before anything reaches Prisma.
  const { status: statusParam, q: qParam } = await searchParams;
  const status = firstParam(statusParam);
  const q = firstParam(qParam);
  const where = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ number: { contains: q } }, { email: { contains: q } }] } : {}),
  };
  // H-2 (session-5): the visible list is take-capped; the count comes from a
  // dedicated COUNT so the table header never under-reports (F-21/G-3 class).
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      take: 100,
    }),
    db.order.count({ where }),
  ]);

  return (
    <AdminOrdersTable
      total={total}
      orders={orders.map((o) => ({
        id: o.id,
        number: o.number,
        email: o.email,
        status: o.status,
        total: o.total,
        placedAt: o.placedAt.toISOString(),
      }))}
      filter={{ status: status ?? "", q: q ?? "" }}
    />
  );
}
