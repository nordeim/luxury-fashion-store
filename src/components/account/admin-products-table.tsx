"use client";

// Admin products table: inline stock updates + visibility toggle.

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useActionState, useTransition } from "react";
import { adminUpdateProductAction } from "@/lib/actions/admin";
import { formatCents } from "@/lib/money";

export interface AdminProductRow {
  id: string;
  name: string;
  brand: string;
  slug: string;
  category: string;
  price: number;
  stock: number;
  isActive: boolean;
}

export function AdminProductsTable({ products }: { products: AdminProductRow[] }) {
  const [state, formAction] = useActionState(adminUpdateProductAction, null);
  const [, startTransition] = useTransition();

  const toggleVisibility = (productId: string, isActive: boolean) => {
    const fd = new FormData();
    fd.set("productId", productId);
    fd.set("isActive", String(!isActive));
    startTransition(() => formAction(fd));
  };

  return (
    <div className="py-14 px-6 lg:px-10">
      <div className="max-w-screen-xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-[10px] tracking-[0.4em] text-gold font-montserrat mb-3">ATELIER CONSOLE</div>
          <h1 className="font-cormorant text-5xl font-light">Products</h1>
        </div>

        {state && !state.ok && (
          <p className="text-xs text-red-600 font-montserrat mb-4" role="alert">{state.error.message}</p>
        )}
        {state?.ok && (
          <p className="text-xs text-emerald-700 font-montserrat mb-4" role="status">Product updated.</p>
        )}

        <div className="border border-border divide-y divide-border">
          {products.map((p) => (
            <div key={p.id} className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6 p-4">
              <div className="lg:w-64">
                <Link href={`/product/${p.slug}`} className="text-xs font-montserrat font-semibold hover:text-gold transition-colors">
                  {p.name}
                </Link>
                <p className="text-[10px] text-muted-foreground font-montserrat">
                  {p.brand} · {p.category}
                </p>
              </div>
              <p className="text-sm font-semibold font-montserrat lg:w-24">{formatCents(p.price)}</p>
              <span
                className={`text-[10px] tracking-widest uppercase font-montserrat border px-2.5 py-1 w-fit ${
                  p.stock <= 3 ? "border-gold/50 text-gold" : "border-border text-muted-foreground"
                }`}
              >
                {p.stock} in stock
              </span>
              <form action={formAction} className="flex items-center gap-2">
                <input type="hidden" name="productId" value={p.id} />
                <input
                  name="stock"
                  type="number"
                  min={0}
                  max={999}
                  defaultValue={p.stock}
                  aria-label={`Stock for ${p.name}`}
                  className="w-20 bg-transparent border border-border px-2 py-1.5 text-xs font-montserrat focus:outline-none focus:border-foreground"
                />
                <button type="submit" className="border border-primary text-[10px] tracking-[0.15em] uppercase font-montserrat px-3 py-1.5 hover:bg-primary hover:text-primary-foreground transition-colors">
                  Set
                </button>
              </form>
              <button
                type="button"
                onClick={() => toggleVisibility(p.id, p.isActive)}
                aria-label={p.isActive ? `Hide ${p.name}` : `Show ${p.name}`}
                className={`flex items-center gap-1.5 text-[10px] tracking-wider uppercase font-montserrat ${p.isActive ? "text-muted-foreground hover:text-foreground" : "text-red-600 hover:text-red-700"}`}
              >
                {p.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
                {p.isActive ? "Visible" : "Hidden"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
