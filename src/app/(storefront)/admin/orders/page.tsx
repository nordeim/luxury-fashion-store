import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
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
  if (!(await isAdmin())) redirect("/account");

  const { status, q } = await searchParams;
  const orders = await db.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ number: { contains: q } }, { email: { contains: q } }] } : {}),
    },
    orderBy: { placedAt: "desc" },
    take: 100,
  });

  return (
    <AdminOrdersTable
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
