// AURELIA — reference catalog data (extracted verbatim from the live
// reference app bundle, 2026-10-14; see docs/reference-spec.md).
//
// PARITY CONTRACT: names, brands, integer-cent prices, ratings, review
// counts, sizes, colors, images, badges and array order are pinned to the
// reference catalog. `sortOrder` in the seed = array position here. Do not
// reorder or reformat without a fresh reference measurement.
//
// PRICING: reference prices are whole dollars (3400 = $3,400.00). The seed
// multiplies by 100 to store integer cents; these literals are reference
// dollars and are converted in exactly one place (prisma/seed.ts).

// G-10 (session-4): the exported CATEGORY_SLUGS const had zero consumers and
// was deleted; the slug union stays (used by CatalogProduct.category below).
export type CategorySlug = "women" | "men" | "accessories" | "shoes";

export interface CatalogProduct {
  slug: string;
  name: string;
  brand: string;
  description: string;
  price: number; // reference dollars (whole)
  compareAtPrice: number | null;
  discount: number;
  category: CategorySlug;
  subcategory: string;
  sizes: string[];
  colors: string[];
  images: string[];
  tag: string | null;
  rating: number;
  reviewCount: number;
  isNew: boolean;
  isBestseller: boolean;
}

// 12 reference products in reference array order (sortOrder 1..12).
export const CATALOG_PRODUCTS: CatalogProduct[] = [
  {
    slug: "silk-draped-evening-gown",
    name: "Silk Draped Evening Gown",
    brand: "MAISON ÉLITE",
    description: "Exquisite pure silk gown with cascading drape, adorned with hand-stitched detailing at the neckline.",
    price: 2850, // $2,850.00
    compareAtPrice: 4200,
    discount: 32,
    category: "women",
    subcategory: "dresses",
    sizes: ["XS","S","M","L","XL"],
    colors: ["Ivory","Midnight","Bordeaux"],
    images: ["https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600&q=80&fm=jpg&fit=crop","https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80&fm=jpg&fit=crop"],
    tag: "SALE",
    rating: 4.9,
    reviewCount: 142,
    isNew: false,
    isBestseller: true,
  }, // reference position 1
  {
    slug: "cashmere-overcoat",
    name: "Cashmere Overcoat",
    brand: "NORDIC ATELIER",
    description: "Supremely soft double-faced cashmere overcoat with structured silhouette and subtle lapels.",
    price: 3400, // $3,400.00
    compareAtPrice: null,
    discount: 0,
    category: "women",
    subcategory: "coats",
    sizes: ["XS","S","M","L"],
    colors: ["Camel","Ecru","Graphite"],
    images: ["https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&q=80&fm=jpg&fit=crop","https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80&fm=jpg&fit=crop"],
    tag: "NEW",
    rating: 4.8,
    reviewCount: 89,
    isNew: true,
    isBestseller: false,
  }, // reference position 2
  {
    slug: "tailored-wool-blazer",
    name: "Tailored Wool Blazer",
    brand: "SAVILE & CO",
    description: "Hand-crafted in Milan, this tailored wool blazer features horn buttons and a signature satin lining.",
    price: 1890, // $1,890.00
    compareAtPrice: 2600,
    discount: 27,
    category: "men",
    subcategory: "blazers",
    sizes: ["S","M","L","XL","XXL"],
    colors: ["Navy","Charcoal","Ivory"],
    images: ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80&fm=jpg&fit=crop","https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=600&q=80&fm=jpg&fit=crop"],
    tag: "SALE",
    rating: 4.7,
    reviewCount: 203,
    isNew: false,
    isBestseller: true,
  }, // reference position 3
  {
    slug: "leather-crossbody-bag",
    name: "Leather Crossbody Bag",
    brand: "LUNA VOSS",
    description: "Full-grain Italian leather crossbody with gold-toned hardware and adjustable strap.",
    price: 1250, // $1,250.00
    compareAtPrice: null,
    discount: 0,
    category: "accessories",
    subcategory: "bags",
    sizes: ["One Size"],
    colors: ["Tan","Black","Cognac"],
    images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80&fm=jpg&fit=crop","https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80&fm=jpg&fit=crop"],
    tag: "NEW",
    rating: 5,
    reviewCount: 67,
    isNew: true,
    isBestseller: false,
  }, // reference position 4
  {
    slug: "pleated-palazzo-trousers",
    name: "Pleated Palazzo Trousers",
    brand: "MAISON ÉLITE",
    description: "Wide-leg palazzo trousers in fluid crepe fabric with a high waist and fluid pleated front.",
    price: 890, // $890.00
    compareAtPrice: 1400,
    discount: 36,
    category: "women",
    subcategory: "trousers",
    sizes: ["XS","S","M","L","XL"],
    colors: ["Ecru","Black","Sage"],
    images: ["https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&q=80&fm=jpg&fit=crop","https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&q=80&fm=jpg&fit=crop"],
    tag: "SALE",
    rating: 4.6,
    reviewCount: 178,
    isNew: false,
    isBestseller: false,
  }, // reference position 5
  {
    slug: "oxford-derby-shoes",
    name: "Oxford Derby Shoes",
    brand: "CRESTWOOD",
    description: "Goodyear-welted derby shoes in premium calfskin with a hand-burnished finish.",
    price: 780, // $780.00
    compareAtPrice: null,
    discount: 0,
    category: "men",
    subcategory: "shoes",
    sizes: ["40","41","42","43","44","45"],
    colors: ["Black","Burgundy","Tan"],
    images: ["https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?w=600&q=80&fm=jpg&fit=crop","https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80&fm=jpg&fit=crop"],
    tag: "NEW",
    rating: 4.8,
    reviewCount: 124,
    isNew: true,
    isBestseller: false,
  }, // reference position 6
  {
    slug: "embroidered-silk-blouse",
    name: "Embroidered Silk Blouse",
    brand: "ORIENT LUXE",
    description: "100% pure silk blouse with intricate floral embroidery, mother-of-pearl buttons.",
    price: 640, // $640.00
    compareAtPrice: 950,
    discount: 33,
    category: "women",
    subcategory: "tops",
    sizes: ["XS","S","M","L"],
    colors: ["Pearl","Rose","Sky"],
    images: ["https://images.unsplash.com/photo-1520975916090-3105956dac38?w=600&q=80&fm=jpg&fit=crop","https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=600&q=80&fm=jpg&fit=crop"],
    tag: "SALE",
    rating: 4.5,
    reviewCount: 91,
    isNew: false,
    isBestseller: false,
  }, // reference position 7
  {
    slug: "structured-tote-bag",
    name: "Structured Tote Bag",
    brand: "LUNA VOSS",
    description: "Iconic structured tote in saffiano leather, featuring a zip closure and interior organizer pockets.",
    price: 2100, // $2,100.00
    compareAtPrice: null,
    discount: 0,
    category: "accessories",
    subcategory: "bags",
    sizes: ["One Size"],
    colors: ["Black","Caramel","Forest"],
    images: ["https://images.unsplash.com/photo-1591561954557-26941169b49e?w=600&q=80&fm=jpg&fit=crop","https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600&q=80&fm=jpg&fit=crop"],
    tag: "BESTSELLER",
    rating: 4.9,
    reviewCount: 215,
    isNew: false,
    isBestseller: true,
  }, // reference position 8
  {
    slug: "merino-wool-turtleneck",
    name: "Merino Wool Turtleneck",
    brand: "NORDIC ATELIER",
    description: "Ultra-fine extra merino wool turtleneck in relaxed fit, naturally temperature-regulating.",
    price: 420, // $420.00
    compareAtPrice: 580,
    discount: 28,
    category: "men",
    subcategory: "knitwear",
    sizes: ["S","M","L","XL","XXL"],
    colors: ["Oatmeal","Navy","Forest"],
    images: ["https://images.unsplash.com/photo-1516826957135-700dedea698c?w=600&q=80&fm=jpg&fit=crop","https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&q=80&fm=jpg&fit=crop"],
    tag: "SALE",
    rating: 4.7,
    reviewCount: 156,
    isNew: false,
    isBestseller: false,
  }, // reference position 9
  {
    slug: "wide-brim-felt-hat",
    name: "Wide-Brim Felt Hat",
    brand: "ATELIER CAPRI",
    description: "Premium 100% beaver felt hat with raw edge brim and grosgrain ribbon band.",
    price: 320, // $320.00
    compareAtPrice: null,
    discount: 0,
    category: "accessories",
    subcategory: "hats",
    sizes: ["S/M","M/L","L/XL"],
    colors: ["Beige","Black","Cognac"],
    images: ["https://images.unsplash.com/photo-1521369909029-2afed882baee?w=600&q=80&fm=jpg&fit=crop","https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=600&q=80&fm=jpg&fit=crop"],
    tag: "NEW",
    rating: 4.6,
    reviewCount: 43,
    isNew: true,
    isBestseller: false,
  }, // reference position 10
  {
    slug: "linen-suit-set",
    name: "Linen Suit Set",
    brand: "SAVILE & CO",
    description: "Two-piece linen suit tailored for warm seasons, with patch pockets and unlined jacket.",
    price: 2200, // $2,200.00
    compareAtPrice: 3100,
    discount: 29,
    category: "men",
    subcategory: "suits",
    sizes: ["S","M","L","XL"],
    colors: ["Stone","Ivory","Navy"],
    images: ["https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=600&q=80&fm=jpg&fit=crop","https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&q=80&fm=jpg&fit=crop"],
    tag: "SALE",
    rating: 4.8,
    reviewCount: 88,
    isNew: false,
    isBestseller: true,
  }, // reference position 11
  {
    slug: "crystal-drop-earrings",
    name: "Crystal Drop Earrings",
    brand: "BIJOUX ÉTOILE",
    description: "Swarovski crystal drop earrings set in 18k gold-plated sterling silver.",
    price: 480, // $480.00
    compareAtPrice: null,
    discount: 0,
    category: "accessories",
    subcategory: "jewelry",
    sizes: ["One Size"],
    colors: ["Crystal","Smoke","Rose Gold"],
    images: ["https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80&fm=jpg&fit=crop","https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&q=80&fm=jpg&fit=crop"],
    tag: "NEW",
    rating: 4.9,
    reviewCount: 72,
    isNew: true,
    isBestseller: false,
  }, // reference position 12
];

export interface HeroSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  image: string;
  align: "left" | "right"; // P-1: live-measured 2026-10-14 — slides anchor left/right, never center
  accent: string;
}

// 3 hero slides (auto-rotating carousel on the reference home).
export const HERO_SLIDES: HeroSlide[] = [{"id":1,"title":"The New","subtitle":"Autumn Collection","description":"Crafted for those who define their own elegance","cta":"Explore Collection","image":"https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=90&fm=jpg&fit=crop","align":"left","accent":"WOMEN'S COLLECTION 2026"},{"id":2,"title":"Timeless","subtitle":"Tailoring","description":"Where heritage meets contemporary craft","cta":"Shop Men's","image":"https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=1600&q=90&fm=jpg&fit=crop","align":"right","accent":"MEN'S COLLECTION 2026"},{"id":3,"title":"Rare","subtitle":"Accessories","description":"Finishing touches that define the whole","cta":"Discover More","image":"https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=90&fm=jpg&fit=crop","align":"right","accent":"ACCESSORIES EDIT"}];

// P-3 (session-5): the reference's brand marquee under the hero — 8 houses in
// catalog-brand order, separated by gold ◆, doubled in the component for the
// seamless 30s loop. Measured live 2026-10-14.
export const BRAND_MARQUEE: string[] = [
  "MAISON ÉLITE",
  "NORDIC ATELIER",
  "SAVILE & CO",
  "LUNA VOSS",
  "ORIENT LUXE",
  "CRESTWOOD",
  "BIJOUX ÉTOILE",
  "ATELIER CAPRI",
];

export interface CategoryCard {
  id: string;
  label: string;
  image: string;
  count: number;
}

// "The Edit" category cards (piece counts are display copy from the reference).
export const CATEGORY_CARDS: CategoryCard[] = [{"id":"women","label":"Women","image":"https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&q=80&fm=jpg&fit=crop","count":248},{"id":"men","label":"Men","image":"https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80&fm=jpg&fit=crop","count":186},{"id":"accessories","label":"Accessories","image":"https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=600&q=80&fm=jpg&fit=crop","count":124},{"id":"shoes","label":"Shoes","image":"https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&q=80&fm=jpg&fit=crop","count":92}];

export interface NavMenu {
  label: string;
  sub: string[];
}

// Desktop dropdown menus (Designers/Sale ship empty submenus on the reference).
export const NAV_MENUS: NavMenu[] = [{"label":"Women","sub":["New Arrivals","Dresses","Coats","Tops","Trousers"]},{"label":"Men","sub":["New Arrivals","Suits","Blazers","Knitwear","Shoes"]},{"label":"Accessories","sub":["Bags","Jewelry","Hats","Scarves"]},{"label":"Designers","sub":[]},{"label":"Sale","sub":[]}];

export interface UgcCard {
  image: string;
  title: string;
  desc: string;
  tag: string;
}

// "Styled by You" lookbook cards.
export const UGC_CARDS: UgcCard[] = [{"image":"https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=500&q=80","title":"Evening Allure","desc":"Silk & Drama","tag":"#VelourEvening"},{"image":"https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&q=80","title":"Modern Classic","desc":"Effortless Tailoring","tag":"#VelourClassic"},{"image":"https://images.unsplash.com/photo-1509631179647-0177331693ae?w=500&q=80","title":"Resort Luxe","desc":"Sun & Cashmere","tag":"#VelourResort"},{"image":"https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&q=80","title":"Urban Edge","desc":"Statement pieces","tag":"#VelourUrban"}];

export interface Deal {
  kicker: string;
  title: string;
  image: string;
  cta: string;
  category: string;
  copy?: string;
  discount?: string;
}

// "Exclusive Deals" promo cards (featured big + 2 stacked).
export const FEATURED_DEAL: Deal = {"kicker":"WOMEN'S EDIT","title":"Up to 40% Off","copy":"Premium eveningwear & resort","cta":"Shop Women","image":"https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&q=80","discount":"-40%","category":"women"};
export const SECONDARY_DEALS: Deal[] = [{"kicker":"MEN'S EDIT","title":"Up to 30% Off","image":"https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=600&q=80","cta":"Shop Men","category":"men"},{"kicker":"ACCESSORIES","title":"Up to 35% Off","image":"https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=600&q=80","cta":"Shop Accessories","category":"accessories"}];

export const TRENDING_SEARCHES = ["Silk Gown", "Cashmere", "Tailored Blazer", "Leather Bag", "Accessories"];

export const ANNOUNCEMENT_TEXT = "COMPLIMENTARY SHIPPING ON ORDERS OVER $500 · FREE RETURNS";

// Demo accounts (shown on /login; admin console + customer account).
export const DEMO_USERS = {
  customer: { email: "james@example.com", password: "Demo1234!" },
  admin: { email: "admin@aurelia.com", password: "Admin1234!" },
} as const;
