import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminProductsTable } from "@/components/account/admin-products-table";

export const metadata: Metadata = { title: "Admin — Products" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/admin/products");
  // H-34 (session-6): role checked on the already-loaded user — isAdmin()
  // re-fetched the session + user for a comparison it already had.
  if (user.role !== "admin") redirect("/account");

  const products = await db.product.findMany({
    include: { category: true },
    orderBy: { sortOrder: "asc" },
    take: 200, // H-30 (session-6): every list query carries a cap (F-19/H-2 discipline)
  });

  return (
    <AdminProductsTable
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        slug: p.slug,
        category: p.category.name,
        price: p.price,
        stock: p.stock,
        isActive: p.isActive,
      }))}
    />
  );
}
