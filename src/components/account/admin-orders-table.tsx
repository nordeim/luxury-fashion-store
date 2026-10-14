"use client";

// Admin orders list + status-update form (client island). Money formatting
// happens here (client-safe import) — functions never cross the RSC boundary.

import Link from "next/link";
import { useActionState } from "react";
import { adminUpdateOrderAction } from "@/lib/actions/admin";
import { formatCents } from "@/lib/money";

export interface AdminOrderRow {
  id: string;
  number: string;
  email: string;
  status: string;
  total: number;
  placedAt: string;
}

const STATUS_OPTIONS = ["processing", "in_transit", "delivered", "cancelled"] as const;

export function AdminOrdersTable({
  orders,
  filter,
}: {
  orders: AdminOrderRow[];
  filter: { status: string; q: string };
}) {
  const [state, formAction] = useActionState(adminUpdateOrderAction, null);

  return (
    <div className="py-14 px-6 lg:px-10">
      <div className="max-w-screen-xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-[10px] tracking-[0.4em] text-gold font-montserrat mb-3">ATELIER CONSOLE</div>
          <h1 className="font-cormorant text-5xl font-light">Orders</h1>
        </div>

        {/* Filters (GET form — deep-linkable) */}
        <form method="get" className="flex flex-wrap items-center gap-3 border-y border-border py-4 mb-6">
          <select
            name="status"
            defaultValue={filter.status}
            aria-label="Filter by status"
            className="bg-transparent border border-border px-3 py-2.5 text-xs font-montserrat uppercase tracking-wider focus:outline-none"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <input
            name="q"
            defaultValue={filter.q}
            placeholder="Search number or email..."
            aria-label="Search orders"
            className="bg-transparent border border-border px-4 py-2.5 text-xs font-montserrat focus:outline-none focus:border-foreground flex-1 min-w-[200px]"
          />
          <button type="submit" className="bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase px-6 py-2.5 hover:bg-accent transition-colors font-montserrat">
            Filter
          </button>
        </form>

        <p className="text-xs text-muted-foreground font-montserrat mb-4">
          {orders.length} {orders.length === 1 ? "order" : "orders"}
        </p>

        {state && !state.ok && (
          <p className="text-xs text-red-600 font-montserrat mb-4" role="alert">{state.error.message}</p>
        )}
        {state?.ok && (
          <p className="text-xs text-emerald-700 font-montserrat mb-4" role="status">Order updated.</p>
        )}

        <div className="border border-border divide-y divide-border">
          {orders.map((o) => (
            <div key={o.id} className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6 p-4">
              <div className="lg:w-44">
                <Link href={`/admin/orders/${o.id}`} className="text-xs font-montserrat font-semibold hover:text-gold transition-colors">
                  {o.number}
                </Link>
                <p className="text-[10px] text-muted-foreground font-montserrat">
                  {new Date(o.placedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
              <p className="text-xs text-muted-foreground font-montserrat flex-1 truncate">{o.email}</p>
              <span className="text-[10px] tracking-widest uppercase font-montserrat border border-border px-2.5 py-1 w-fit capitalize">
                {o.status.replace("_", " ")}
              </span>
              <p className="text-sm font-semibold font-montserrat lg:w-24 lg:text-right">{formatCents(o.total)}</p>
              <form action={formAction} className="flex items-center gap-2">
                <input type="hidden" name="orderId" value={o.id} />
                <select
                  name="status"
                  defaultValue={o.status}
                  aria-label={`Update status for ${o.number}`}
                  className="bg-transparent border border-border px-2 py-1.5 text-[10px] font-montserrat uppercase tracking-wider focus:outline-none"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s} className="capitalize">
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
                <button type="submit" className="border border-primary text-[10px] tracking-[0.15em] uppercase font-montserrat px-3 py-1.5 hover:bg-primary hover:text-primary-foreground transition-colors">
                  Update
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
