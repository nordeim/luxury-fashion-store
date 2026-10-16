import type { Prisma } from "@prisma/client";

// Product DTO shape shared by server pages and client components.
// Arrays arrive pre-parsed (the DB stores JSON strings).

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  discount: number;
  subcategory: string;
  categorySlug: string;
  sizes: string[];
  colors: string[];
  images: string[];
  tag: string | null;
  rating: number;
  reviewCount: number;
  isNew: boolean;
  isBestseller: boolean;
  stock: number;
}

type ProductWithCategory = Prisma.ProductGetPayload<{ include: { category: true } }>;

/**
 * Defensively parse the product-images JSON column into URL strings
 * (session-24, F-K2: the PDP's og:image reads the first entry). Malformed
 * JSON, non-arrays, and non-string entries degrade to an empty array — the
 * metadata path falls back to the root share card, never throws.
 */
export function parseProductImages(json: string): string[] {
  try {
    const value: unknown = JSON.parse(json);
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is string => typeof v === "string" && v.length > 0);
  } catch {
    return [];
  }
}

/** Parse a DB product row (JSON string columns) into the DTO. */
export function toProductCardData(p: ProductWithCategory): ProductCardData {
  const parse = (json: string, fallback: string[] = []) => {
    try {
      const v = JSON.parse(json);
      return Array.isArray(v) ? v.map(String) : fallback;
    } catch {
      return fallback;
    }
  };
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    description: p.description,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    discount: p.discount,
    subcategory: p.subcategory,
    categorySlug: p.category.slug,
    sizes: parse(p.sizes),
    colors: parse(p.colors),
    images: parse(p.images),
    tag: p.tag,
    rating: p.rating,
    reviewCount: p.reviewCount,
    isNew: p.isNew,
    isBestseller: p.isBestseller,
    stock: p.stock,
  };
}
