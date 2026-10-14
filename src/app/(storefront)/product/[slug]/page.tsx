import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toProductCardData } from "@/lib/products";
import { estimateDelivery } from "@/lib/delivery";
import { ProductDetail } from "@/components/store/product-detail";

// PDP — functional superset (reference /product/* 404s). Same design
// language as the reference home: serif display, size chips, outlined CTAs.

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.product.findUnique({ where: { slug } });
  if (!product) return { title: "Product Not Found" };
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/product/${product.slug}` },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    include: { category: true },
  });
  if (!product || !product.isActive) notFound();

  const related = await db.product.findMany({
    where: { isActive: true, categoryId: product.categoryId, id: { not: product.id } },
    include: { category: true },
    orderBy: { sortOrder: "asc" },
    take: 4,
  });

  return (
    <ProductDetail
      product={toProductCardData(product)}
      related={related.map(toProductCardData)}
      // H-37 (session-6): single clock — the label is computed here (server)
      // and passed down, instead of each render environment calling
      // estimateDelivery() with its own `new Date()`.
      deliveryLabel={estimateDelivery().label}
    />
  );
}
