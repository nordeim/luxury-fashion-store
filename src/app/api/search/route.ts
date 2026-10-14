import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientIpFrom, rateLimit } from "@/lib/rate-limit";

// Search typeahead — whitelisted route handler.
// Rate-limited 60/min/IP; `limit` capped at 10.

export async function GET(request: Request) {
  const limiter = rateLimit(`search:${clientIpFrom(request.headers)}`, 60, 60 * 1000);
  if (!limiter.allowed) {
    return NextResponse.json({ ok: false, results: [] }, { status: 429 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 6) || 6, 1), 10);

  if (q.length === 0) {
    return NextResponse.json({ ok: true, results: [] });
  }

  const products = await db.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q } },
        { brand: { contains: q } },
        { subcategory: { contains: q } },
      ],
    },
    select: { slug: true, name: true, brand: true, images: true, price: true },
    orderBy: [{ isBestseller: "desc" }, { sortOrder: "asc" }],
    take: limit,
  });

  const results = products.map((p) => ({
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    image: (JSON.parse(p.images || "[]") as string[])[0] ?? "",
    price: p.price,
  }));

  return NextResponse.json({ ok: true, results });
}
