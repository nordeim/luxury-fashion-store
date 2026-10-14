"use client";

// Admin per-order actions: status transition + carrier/tracking in one form.

import { useActionState } from "react";
import { adminUpdateOrderAction } from "@/lib/actions/admin";

const STATUS_OPTIONS = ["processing", "in_transit", "delivered", "cancelled"] as const;

const inputCls = "w-full bg-transparent border border-border px-3 py-2.5 text-xs font-montserrat focus:outline-none focus:border-foreground";
const labelCls = "block text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1.5";

export function AdminOrderActions({
  orderId,
  status,
  carrier,
  trackingNumber,
}: {
  orderId: string;
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
}) {
  const [state, formAction, pending] = useActionState(adminUpdateOrderAction, null);

  return (
    <form action={formAction} className="border border-border p-6 flex flex-col gap-4">
      <h2 className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">Manage Order</h2>
      <input type="hidden" name="orderId" value={orderId} />
      <div>
        <label className={labelCls} htmlFor="admin-status">Status</label>
        <select id="admin-status" name="status" defaultValue={status} className={inputCls}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls} htmlFor="admin-carrier">Carrier</label>
        <input id="admin-carrier" name="carrier" defaultValue={carrier ?? ""} placeholder="DHL, UPS…" className={inputCls} />
      </div>
      <div>
        <label className={labelCls} htmlFor="admin-tracking">Tracking Number</label>
        <input id="admin-tracking" name="trackingNumber" defaultValue={trackingNumber ?? ""} placeholder="1Z…" className={inputCls} />
      </div>
      {state && !state.ok && <p className="text-xs text-red-600" role="alert">{state.error.message}</p>}
      {state?.ok && <p className="text-xs text-emerald-700" role="status">Order updated.</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase py-3 hover:bg-accent transition-colors font-montserrat disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}
