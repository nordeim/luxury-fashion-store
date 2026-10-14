/**
 * AURELIA — database seed (idempotent, natural-key upserts; never deletes).
 *
 * Seeds: 4 categories, the 12 reference products (verbatim from
 * src/lib/data/catalog.ts — prices converted reference-dollars → integer
 * cents in exactly this one place), 2 demo users (scrypt-hashed passwords),
 * demo orders mirroring an active account, and their event timelines.
 *
 * Run: npm run db:seed   (or db:setup = db:push + seed)
 */
import { PrismaClient } from "@prisma/client";
import { scryptSync } from "node:crypto";
import { CATALOG_PRODUCTS } from "../src/lib/data/catalog";

const prisma = new PrismaClient();

/** Deterministic scrypt hash (s1$<salt>$<hash>) for fixtures that must be stable across reseeds. */
function hashPasswordFixed(password: string, saltHex: string): string {
  return `s1$${saltHex}$${scryptSync(password, saltHex, 64).toString("hex")}`;
}

async function main() {
  console.info("[seed] categories…");
  const categoryDefs = [
    { slug: "women", name: "Women", sortOrder: 1 },
    { slug: "men", name: "Men", sortOrder: 2 },
    { slug: "accessories", name: "Accessories", sortOrder: 3 },
    { slug: "shoes", name: "Shoes", sortOrder: 4 },
  ];
  for (const c of categoryDefs) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: c.sortOrder },
      create: c,
    });
  }
  const categories = await prisma.category.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  console.info("[seed] products (reference catalog, sortOrder = array position)…");
  for (let i = 0; i < CATALOG_PRODUCTS.length; i++) {
    const p = CATALOG_PRODUCTS[i];
    const slug = p.slug;
    const data = {
      slug,
      name: p.name,
      brand: p.brand,
      description: p.description,
      // Reference dollars → integer cents (the single conversion point).
      price: p.price * 100,
      compareAtPrice: p.compareAtPrice === null ? null : p.compareAtPrice * 100,
      discount: p.discount,
      categoryId: categoryBySlug.get(p.category)!,
      subcategory: p.subcategory,
      sizes: JSON.stringify(p.sizes),
      colors: JSON.stringify(p.colors),
      images: JSON.stringify(p.images),
      tag: p.tag,
      rating: p.rating,
      reviewCount: p.reviewCount,
      isNew: p.isNew,
      isBestseller: p.isBestseller,
      // Parity contract: reference array position, 1-indexed.
      sortOrder: i + 1,
      stock: 12,
      isActive: true,
    };
    await prisma.product.upsert({
      where: { slug },
      update: data,
      create: data,
    });
  }

  console.info("[seed] demo users…");
  // Static salts: a seed fixture cannot carry per-run random salts and stay
  // idempotent. These are demo-only accounts (documented in README).
  const customerHash = hashPasswordFixed("Demo1234!", "aurelia-demo-customer-salt-01");
  const adminHash = hashPasswordFixed("Admin1234!", "aurelia-demo-admin-salt-0001");

  const customer = await prisma.user.upsert({
    where: { email: "james@example.com" },
    update: { passwordHash: customerHash, name: "James Whitmore" },
    create: {
      email: "james@example.com",
      passwordHash: customerHash,
      name: "James Whitmore",
      role: "user",
    },
  });
  await prisma.user.upsert({
    where: { email: "admin@aurelia.com" },
    update: { passwordHash: adminHash, name: "Aurelia Admin" },
    create: {
      email: "admin@aurelia.com",
      passwordHash: adminHash,
      name: "Aurelia Admin",
      role: "admin",
    },
  });

  await prisma.address.upsert({
    where: { id: "addr-demo-1" },
    update: {},
    create: {
      id: "addr-demo-1",
      userId: customer.id,
      label: "Home",
      fullName: "James Whitmore",
      street: "212 Mercer Street, Apt 4B",
      city: "New York",
      state: "NY",
      zip: "10012",
      country: "United States",
      isDefault: true,
    },
  });

  console.info("[seed] canonical demo orders…");
  const gown = await prisma.product.findUnique({ where: { slug: "silk-draped-evening-gown" } });
  const coat = await prisma.product.findUnique({ where: { slug: "cashmere-overcoat" } });
  const blazer = await prisma.product.findUnique({ where: { slug: "tailored-wool-blazer" } });
  const bag = await prisma.product.findUnique({ where: { slug: "leather-crossbody-bag" } });
  if (!gown || !coat || !blazer || !bag) throw new Error("[seed] catalog products missing — seed products first");

  const addrJson = JSON.stringify({
    fullName: "James Whitmore",
    street: "212 Mercer Street, Apt 4B",
    city: "New York",
    state: "NY",
    zip: "10012",
    country: "United States",
  });

  const orderDefs = [
    {
      number: "ORD-2026-001",
      userId: customer.id,
      email: customer.email,
      status: "delivered",
      subtotal: 285000,
      shipping: 0,
      total: 285000,
      paymentMethod: "card",
      cardLast4: "4242",
      paymentStatus: "paid",
      placedAt: new Date("2026-09-18T10:24:00Z"),
      items: [{ productId: gown.id, nameSnapshot: gown.name, brandSnapshot: gown.brand, imageSnapshot: JSON.parse(gown.images)[0], sizeSnapshot: "M", unitPrice: gown.price, quantity: 1 }],
      events: [
        { type: "placed", note: null, at: "2026-09-18T10:24:00Z" },
        { type: "status_changed", note: "processing → in_transit", at: "2026-09-19T09:00:00Z" },
        { type: "status_changed", note: "in_transit → delivered", at: "2026-09-23T14:30:00Z" },
      ],
      carrier: null as string | null,
      trackingNumber: null as string | null,
    },
    {
      number: "ORD-2026-002",
      userId: customer.id,
      email: customer.email,
      status: "in_transit",
      subtotal: 340000,
      shipping: 0,
      total: 340000,
      paymentMethod: "card",
      cardLast4: "4242",
      paymentStatus: "paid",
      placedAt: new Date("2026-10-08T16:05:00Z"),
      items: [{ productId: coat.id, nameSnapshot: coat.name, brandSnapshot: coat.brand, imageSnapshot: JSON.parse(coat.images)[0], sizeSnapshot: "L", unitPrice: coat.price, quantity: 1 }],
      events: [
        { type: "placed", note: null, at: "2026-10-08T16:05:00Z" },
        { type: "status_changed", note: "processing → in_transit", at: "2026-10-09T11:20:00Z" },
        { type: "tracking_added", note: "DHL added — 1Z8V4X209311", at: "2026-10-09T11:21:00Z" },
      ],
      carrier: "DHL",
      trackingNumber: "1Z8V4X209311",
    },
    {
      number: "ORD-2026-003",
      userId: customer.id,
      email: customer.email,
      status: "processing",
      subtotal: 314000,
      shipping: 0,
      total: 314000,
      paymentMethod: "card",
      cardLast4: "1881",
      paymentStatus: "paid",
      placedAt: new Date("2026-10-12T09:41:00Z"),
      items: [
        { productId: blazer.id, nameSnapshot: blazer.name, brandSnapshot: blazer.brand, imageSnapshot: JSON.parse(blazer.images)[0], sizeSnapshot: "M", unitPrice: blazer.price, quantity: 1 },
        { productId: bag.id, nameSnapshot: bag.name, brandSnapshot: bag.brand, imageSnapshot: JSON.parse(bag.images)[0], sizeSnapshot: "", unitPrice: bag.price, quantity: 1 },
      ],
      events: [{ type: "placed", note: null, at: "2026-10-12T09:41:00Z" }],
      carrier: null as string | null,
      trackingNumber: null as string | null,
    },
  ];

  for (const o of orderDefs) {
    await prisma.order.upsert({
      where: { number: o.number },
      update: {},
      create: {
        number: o.number,
        userId: o.userId,
        email: o.email,
        status: o.status,
        subtotal: o.subtotal,
        shipping: o.shipping,
        total: o.total,
        shippingAddress: addrJson,
        paymentMethod: o.paymentMethod,
        cardLast4: o.cardLast4,
        paymentStatus: o.paymentStatus,
        carrier: o.carrier,
        trackingNumber: o.trackingNumber,
        placedAt: o.placedAt,
        items: { create: o.items },
        events: {
          create: o.events.map((e) => ({ type: e.type, note: e.note, createdAt: new Date(e.at) })),
        },
      },
    });
  }

  // Admin demo order (refund-ready processing order from a guest).
  await prisma.order.upsert({
    where: { number: "ORD-2026-004" },
    update: {},
    create: {
      number: "ORD-2026-004",
      userId: null,
      email: "guest.visitor@example.com",
      status: "processing",
      subtotal: 19500,
      shipping: 999,
      total: 20499,
      shippingAddress: JSON.stringify({
        fullName: "Ava Chen",
        street: "8 Grand Avenue",
        city: "San Francisco",
        state: "CA",
        zip: "94105",
        country: "United States",
      }),
      paymentMethod: "cod",
      placedAt: new Date("2026-10-13T18:12:00Z"),
      items: {
        create: [
          {
            productId: bag.id,
            nameSnapshot: bag.name,
            brandSnapshot: bag.brand,
            imageSnapshot: JSON.parse(bag.images)[0],
            sizeSnapshot: "",
            unitPrice: bag.price,
            quantity: 1,
          },
        ],
      },
      events: { create: [{ type: "placed", note: null }] },
    },
  });

  const counts = {
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    users: await prisma.user.count(),
    orders: await prisma.order.count(),
  };
  console.info("[seed] complete:", counts);
}

main()
  .catch((e) => {
    console.error("[seed] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
