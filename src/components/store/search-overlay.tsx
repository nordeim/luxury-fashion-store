"use client";

// Search overlay — parity surface (measured live 2026-10-14):
// fixed inset-0 bg-background/98 backdrop-blur-md z-50 flex flex-col;
// header row border-b px-6 lg:px-20 py-8 with max-w-screen-md input:
// bg-transparent border-b pl-8 pr-10 pb-3 text-lg font-light, search icon
// left, X right; TRENDING SEARCHES chips border border-border px-4 py-2
// text-xs. Superset: submitting navigates to /shop?search=…; typeahead
// results render below the chips once q >= 2 chars (via /api/search).

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/components/store/store-provider";
import { TRENDING_SEARCHES } from "@/lib/data/catalog";
import { formatCents } from "@/lib/money";

interface SearchHit {
  slug: string;
  name: string;
  brand: string;
  image: string;
  price: number;
}

export function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useStore();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  // hits remembers the query that produced it — the rendered list is derived
  // (visibleHits), so no effect is needed to clear stale results.
  const [hits, setHits] = useState<{ q: string; items: SearchHit[] } | null>(null);

  useEffect(() => {
    if (!searchOpen) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [searchOpen, setSearchOpen]);

  useEffect(() => {
    const trimmed = q.trim();
    if (!searchOpen || trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=6`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { ok: boolean; results: SearchHit[] };
        if (data.ok) setHits({ q: trimmed, items: data.results });
      } catch {
        /* aborted or offline — leave hits as-is */
      }
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [q, searchOpen]);

  const trimmedQ = q.trim();
  const visibleHits =
    hits && hits.q === trimmedQ && trimmedQ.length >= 2 ? hits.items : [];

  if (!searchOpen) return null;

  const submit = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setSearchOpen(false);
    router.push(`/shop?search=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="fixed inset-0 bg-background/98 backdrop-blur-md z-50 flex flex-col" data-testid="search-overlay">
      <div className="border-b border-border px-6 lg:px-20 py-8">
        <div className="max-w-screen-md mx-auto relative">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} strokeWidth={2} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit(q);
            }}
            placeholder="Search styles, brands, categories..."
            aria-label="Search styles, brands, categories"
            className="w-full bg-transparent border-b border-border pl-8 pr-10 pb-3 text-lg font-montserrat font-light focus:outline-none placeholder:text-muted-foreground/50 text-foreground focus:border-foreground transition-colors"
          />
          <button
            type="button"
            aria-label="Close search"
            onClick={() => setSearchOpen(false)}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 lg:px-20 py-10">
        <div className="max-w-screen-md mx-auto">
          {q.trim().length < 2 && (
            <div>
              <div className="text-[10px] tracking-[0.3em] text-muted-foreground font-montserrat mb-4">
                TRENDING SEARCHES
              </div>
              <div className="flex flex-wrap gap-2">
                {TRENDING_SEARCHES.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => submit(term)}
                    className="border border-border px-4 py-2 text-xs font-montserrat hover:border-primary hover:text-primary transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
          {trimmedQ.length >= 2 && visibleHits.length === 0 && (
            <p className="text-muted-foreground font-montserrat text-sm">No results for &ldquo;{trimmedQ}&rdquo;</p>
          )}
          {visibleHits.length > 0 && (
            <div className="flex flex-col divide-y divide-border">
              {visibleHits.map((hit) => (
                <button
                  key={hit.slug}
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    router.push(`/product/${hit.slug}`);
                  }}
                  className="flex items-center gap-4 py-3 text-left hover:bg-secondary/50 transition-colors px-2 -mx-2"
                >
                  <img src={hit.image} alt="" className="w-12 h-14 object-cover rounded-sm bg-secondary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{hit.brand}</p>
                    <p className="text-sm font-montserrat font-medium truncate">{hit.name}</p>
                  </div>
                  <p className="text-sm font-semibold font-montserrat">{formatCents(hit.price)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
