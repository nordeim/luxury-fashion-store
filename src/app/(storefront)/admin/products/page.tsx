import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminProductsTable } from "@/components/account/admin-products-table";

export const metadata: Metadata = { title: "Admin — Products" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/admin/products");
  if (!(await isAdmin())) redirect("/account");

  const products = await db.product.findMany({
    include: { category: true },
    orderBy: { sortOrder: "asc" },
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
