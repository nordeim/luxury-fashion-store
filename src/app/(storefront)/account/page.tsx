import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AccountTabs } from "@/components/account/account-tabs";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/account");

  const [orders, addresses] = await Promise.all([
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { placedAt: "desc" },
      include: { items: true },
      take: 50, // F-19 (session-3): bounded history page
    }),
    db.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { id: "asc" }],
    }),
  ]);

  return (
    <AccountTabs
      user={user}
      orders={orders.map((o) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        total: o.total,
        placedAt: o.placedAt.toISOString(),
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
      }))}
      addresses={addresses.map((a) => ({
        id: a.id,
        label: a.label,
        fullName: a.fullName,
        street: a.street,
        city: a.city,
        state: a.state,
        zip: a.zip,
        country: a.country,
        isDefault: a.isDefault,
      }))}
    />
  );
}
