"use client";

// Shop client island: filter bar + grid. Client-side filtering over the
// server-loaded catalog (12 reference pieces — well within client budget);
// URL state stays in sync via history.replaceState so filters deep-link.

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/store/product-card";
import { QuickViewModal } from "@/components/store/quick-view-modal";
import { CATEGORY_CARDS } from "@/lib/data/catalog";
import type { ProductCardData } from "@/lib/products";

type SortKey = "featured" | "newest" | "price_asc" | "price_desc" | "rating";
type PriceBucket = "" | "under_500" | "500_2000" | "2000_3500" | "over_3500";

interface Filters {
  category: string;
  search: string;
  price: string;
  sort: string;
  sale: boolean;
  designers: boolean;
}

const PRICE_BUCKETS: { key: PriceBucket; label: string; test: (cents: number) => boolean }[] = [
  { key: "under_500", label: "Under $500", test: (c) => c < 50000 },
  { key: "500_2000", label: "$500 – $2,000", test: (c) => c >= 50000 && c <= 200000 },
  { key: "2000_3500", label: "$2,000 – $3,500", test: (c) => c > 200000 && c <= 350000 },
  { key: "over_3500", label: "Over $3,500", test: (c) => c > 350000 },
];

export function ShopClient({ products, initial }: { products: ProductCardData[]; initial: Filters }) {
  const [category, setCategory] = useState(initial.category);
  const [search, setSearch] = useState(initial.search);
  const [price, setPrice] = useState(initial.price);
  const [sort, setSort] = useState<SortKey>((initial.sort as SortKey) || "featured");
  const [saleOnly, setSaleOnly] = useState(initial.sale);
  // H-32 (session-6): the designers showcase is filter STATE like any other —
  // it used to live only in `initial`, so any filter interaction rewrote the
  // URL without it (a reload silently dropped the showcase) and the clear
  // affordance couldn't reset it.
  const [designers, setDesigners] = useState(initial.designers);
  const [quickView, setQuickView] = useState<ProductCardData | null>(null);

  const filtered = useMemo(() => {
    let list = products.slice();
    if (category) list = list.filter((p) => p.categorySlug === category);
    if (designers) list = list.filter((p) => p.brand.length > 0); // designer showcase (all seeded pieces are designer-made)
    if (saleOnly) list = list.filter((p) => p.compareAtPrice !== null);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.subcategory.toLowerCase().includes(q) ||
          p.categorySlug.toLowerCase().includes(q),
      );
    }
    const bucket = PRICE_BUCKETS.find((b) => b.key === price);
    if (bucket) list = list.filter((p) => bucket.test(p.price));
    switch (sort) {
      case "newest":
        list.sort((a, b) => Number(b.isNew) - Number(a.isNew));
        break;
      case "price_asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list.sort((a, b) => b.rating - a.rating);
        break;
      default:
        break; // featured = reference array order (server-sorted)
    }
    return list;
  }, [products, category, search, price, sort, saleOnly, designers]);

  const syncUrl = (next: Partial<Filters>) => {
    const params = new URLSearchParams();
    const merged = { category, search, price, sort, sale: saleOnly, designers, ...next };
    if (merged.category) params.set("category", merged.category);
    if (merged.search) params.set("search", merged.search);
    if (merged.price) params.set("price", merged.price);
    if (merged.sort && merged.sort !== "featured") params.set("sort", merged.sort);
    if (merged.sale) params.set("sale", "1");
    if (merged.designers) params.set("designers", "1");
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/shop?${qs}` : "/shop");
  };

  const activeFilters =
    Boolean(category) || Boolean(search.trim()) || Boolean(price) || saleOnly || designers;

  return (
    <div className="py-14 px-6 lg:px-10">
      <div className="max-w-screen-xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-[10px] tracking-[0.4em] text-gold font-montserrat mb-3">THE COLLECTION</div>
          <h1 className="font-cormorant text-5xl lg:text-6xl font-light">
            Shop the <span className="italic">Collection</span>
          </h1>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between border-y border-border py-4 mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCategory("");
                syncUrl({ category: "" });
              }}
              aria-pressed={!category}
              className={`text-xs tracking-[0.15em] uppercase font-montserrat px-4 py-2 border transition-colors ${
                !category ? "border-foreground text-foreground" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            {CATEGORY_CARDS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCategory(c.id);
                  syncUrl({ category: c.id });
                }}
                aria-pressed={category === c.id}
                className={`text-xs tracking-[0.15em] uppercase font-montserrat px-4 py-2 border transition-colors ${
                  category === c.id ? "border-foreground text-foreground" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setSaleOnly(!saleOnly);
                syncUrl({ sale: !saleOnly });
              }}
              aria-pressed={saleOnly}
              className={`text-xs tracking-[0.15em] uppercase font-montserrat px-4 py-2 border transition-colors ${
                saleOnly ? "border-red-600 text-red-600" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              Sale
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  syncUrl({ search: e.target.value });
                }}
                placeholder="Search the collection..."
                aria-label="Search the collection"
                className="w-full bg-transparent border border-border pl-9 pr-8 py-2.5 text-xs font-montserrat focus:outline-none focus:border-foreground placeholder:text-muted-foreground/60"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearch("");
                    syncUrl({ search: "" });
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="relative flex-1 lg:w-44">
              <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={14} />
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as SortKey);
                  syncUrl({ sort: e.target.value });
                }}
                aria-label="Sort products"
                className="w-full appearance-none bg-transparent border border-border pl-9 pr-8 py-2.5 text-xs font-montserrat uppercase tracking-wider focus:outline-none focus:border-foreground"
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
            <div className="relative flex-1 lg:w-44">
              <select
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  syncUrl({ price: e.target.value });
                }}
                aria-label="Filter by price"
                className="w-full appearance-none bg-transparent border border-border px-3 py-2.5 text-xs font-montserrat uppercase tracking-wider focus:outline-none focus:border-foreground"
              >
                <option value="">All Prices</option>
                {PRICE_BUCKETS.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Result count + active filter chips */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs text-muted-foreground font-montserrat" data-testid="result-count">
            {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}
          </p>
          {activeFilters && (
            <button
              type="button"
              onClick={() => {
                setCategory("");
                setSearch("");
                setPrice("");
                setSaleOnly(false);
                setDesigners(false);
                window.history.replaceState(null, "", "/shop");
              }}
              className="text-xs tracking-wider uppercase font-montserrat text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-cormorant text-2xl mb-2">Nothing matches your search</p>
            <p className="text-sm text-muted-foreground font-montserrat">Try a different filter or browse the full collection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6" data-testid="product-grid">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} onQuickView={setQuickView} />
            ))}
          </div>
        )}
      </div>
      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
    </div>
  );
}
