"use client";

// Account tabs — Profile / Orders / Addresses / Settings (Radix Tabs).
// Status pill colors follow the order-status palette; forms post the account
// server actions with inline field errors.

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { useState, useTransition } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { changePasswordAction, saveAddressAction, updateProfileAction, deleteAddressAction, setDefaultAddressAction } from "@/lib/actions/account";
import { formatCents } from "@/lib/money";
import { logoutAction } from "@/lib/actions/auth";
import type { SafeUser } from "@/lib/auth";

export interface AccountOrderDto {
  id: string;
  number: string;
  status: string;
  total: number;
  placedAt: string;
  itemCount: number;
}

export interface AccountAddressDto {
  id: string;
  label: string;
  fullName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  isDefault: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  processing: "bg-gold/15 text-gold border-gold/30",
  in_transit: "bg-blue-50 text-blue-700 border-blue-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  processing: "Processing",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const inputCls =
  "w-full bg-transparent border border-border px-4 py-3 text-sm font-montserrat focus:outline-none focus:border-foreground placeholder:text-muted-foreground/60";
const labelCls = "block text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1.5";

export function AccountTabs({
  user,
  orders,
  addresses,
}: {
  user: SafeUser;
  orders: AccountOrderDto[];
  addresses: AccountAddressDto[];
}) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfileAction, null);
  const [passwordState, passwordAction, passwordPending] = useActionState(changePasswordAction, null);
  const [addressState, addressAction, addressPending] = useActionState(saveAddressAction, null);
  const [editing, setEditing] = useState<AccountAddressDto | null>(null);
  // F-12 (session-3): address action failures used to vanish (`void (await …)`)
  // — surface them inline instead.
  const [addressError, setAddressError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const removeAddress = (id: string) =>
    startTransition(async () => {
      setAddressError(null);
      const res = await deleteAddressAction(id);
      if (!res.ok) setAddressError(res.error.message);
    });
  const makeDefault = (id: string) =>
    startTransition(async () => {
      setAddressError(null);
      const res = await setDefaultAddressAction(id);
      if (!res.ok) setAddressError(res.error.message);
    });

  return (
    <div className="py-14 px-6 lg:px-10">
      <div className="max-w-screen-lg mx-auto">
        <div className="text-center mb-10">
          <div className="text-[10px] tracking-[0.4em] text-gold font-montserrat mb-3">WELCOME BACK</div>
          <h1 className="font-cormorant text-5xl font-light">
            My <span className="italic">Account</span>
          </h1>
          <form action={logoutAction} className="mt-4">
            <button
              type="submit"
              className="text-xs tracking-[0.2em] uppercase font-montserrat text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>

        <Tabs defaultValue="orders">
          <TabsList className="w-full justify-start flex-wrap">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            {orders.length === 0 ? (
              <div className="text-center py-16 border border-border">
                <p className="font-cormorant text-2xl mb-2">No orders yet</p>
                <Link href="/shop" className="text-xs tracking-[0.2em] uppercase font-montserrat text-muted-foreground hover:text-foreground underline underline-offset-4">
                  Discover the collection
                </Link>
              </div>
            ) : (
              <div className="border border-border divide-y divide-border">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/account/orders/${order.id}`}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 p-5 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="sm:w-40">
                      <p className="text-xs font-montserrat font-semibold">{order.number}</p>
                      <p className="text-[10px] text-muted-foreground font-montserrat mt-0.5">
                        {new Date(order.placedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <span className={`text-[10px] tracking-widest uppercase font-montserrat border px-2.5 py-1 w-fit ${STATUS_STYLES[order.status] ?? "border-border text-muted-foreground"}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    <p className="text-xs text-muted-foreground font-montserrat sm:flex-1">
                      {order.itemCount} {order.itemCount === 1 ? "piece" : "pieces"}
                    </p>
                    <p className="text-sm font-semibold font-montserrat">{formatCents(order.total)}</p>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="addresses">
            {addressError && (
              <p role="alert" className="mb-4 text-xs font-montserrat text-destructive">
                {addressError}
              </p>
            )}
            <div className="grid md:grid-cols-2 gap-6">
              {addresses.map((addr) => (
                <div key={addr.id} className="border border-border p-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs tracking-[0.2em] uppercase font-montserrat">
                      {addr.label}
                      {addr.isDefault && <span className="ml-2 text-gold normal-case tracking-normal text-[10px]">Default</span>}
                    </p>
                    <div className="flex gap-2">
                      {!addr.isDefault && (
                        <button type="button" onClick={() => makeDefault(addr.id)} className="text-[10px] uppercase tracking-wider font-montserrat text-muted-foreground hover:text-foreground">
                          Set default
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={`Edit ${addr.label}`}
                        onClick={() => {
                          setEditing(addr);
                          document.getElementById("addr-label")?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }}
                        className="text-[10px] uppercase tracking-wider font-montserrat text-muted-foreground hover:text-foreground"
                      >
                        Edit
                      </button>
                      <button type="button" aria-label={`Delete ${addr.label}`} onClick={() => removeAddress(addr.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-montserrat">{addr.fullName}</p>
                  <p className="text-sm text-muted-foreground font-montserrat mt-1">
                    {addr.street}, {addr.city}, {addr.state} {addr.zip}, {addr.country}
                  </p>
                </div>
              ))}
              <div className="border border-dashed border-border p-6">
                <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-4 flex items-center gap-2">
                  <Plus size={13} /> {editing ? "Edit address" : "Add address"}
                </p>
                <form action={addressAction} className="flex flex-col gap-3">
                  {editing && <input type="hidden" name="id" value={editing.id} />}
                  <div>
                    <label className={labelCls} htmlFor="addr-label">Label</label>
                    <input id="addr-label" name="label" defaultValue={editing?.label ?? "Home"} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="addr-name">Full Name</label>
                    <input id="addr-name" name="fullName" required defaultValue={editing?.fullName ?? ""} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="addr-street">Street</label>
                    <input id="addr-street" name="street" required defaultValue={editing?.street ?? ""} className={inputCls} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls} htmlFor="addr-city">City</label>
                      <input id="addr-city" name="city" required defaultValue={editing?.city ?? ""} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="addr-state">State</label>
                      <input id="addr-state" name="state" required defaultValue={editing?.state ?? ""} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="addr-zip">ZIP</label>
                      <input id="addr-zip" name="zip" required defaultValue={editing?.zip ?? ""} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="addr-country">Country</label>
                    <input id="addr-country" name="country" defaultValue={editing?.country ?? "United States"} className={inputCls} />
                  </div>
                  {addressState && !addressState.ok && (
                    <p className="text-xs text-red-600" role="alert">{addressState.error.message}</p>
                  )}
                  {addressState?.ok && (
                    <p className="text-xs text-emerald-700" role="status">Address saved.</p>
                  )}
                  <button
                    type="submit"
                    disabled={addressPending}
                    className="bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase py-3.5 hover:bg-accent transition-colors font-montserrat disabled:opacity-50"
                  >
                    {addressPending ? "Saving…" : "Save Address"}
                  </button>
                </form>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <div className="max-w-md border border-border p-8">
              <h2 className="font-cormorant text-2xl font-light mb-6">Profile</h2>
              <form action={profileAction} className="flex flex-col gap-4">
                <div>
                  <label className={labelCls} htmlFor="profile-name">Full Name</label>
                  <input id="profile-name" name="name" defaultValue={user.name} required className={inputCls} />
                  {profileState && !profileState.ok && profileState.error.fieldErrors?.name && (
                    <p className="text-xs text-red-600 mt-1" role="alert">{profileState.error.fieldErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className={labelCls} htmlFor="profile-email">Email</label>
                  <input id="profile-email" value={user.email} disabled className={`${inputCls} opacity-60`} />
                </div>
                {profileState?.ok && <p className="text-xs text-emerald-700" role="status">Profile updated.</p>}
                <button
                  type="submit"
                  disabled={profilePending}
                  className="bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase py-3.5 hover:bg-accent transition-colors font-montserrat disabled:opacity-50"
                >
                  {profilePending ? "Saving…" : "Save Changes"}
                </button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="max-w-md border border-border p-8">
              <h2 className="font-cormorant text-2xl font-light mb-6">Change Password</h2>
              <form action={passwordAction} className="flex flex-col gap-4">
                <div>
                  <label className={labelCls} htmlFor="current-password">Current Password</label>
                  <input id="current-password" name="currentPassword" type="password" required autoComplete="current-password" className={inputCls} />
                  {passwordState && !passwordState.ok && passwordState.error.fieldErrors?.currentPassword && (
                    <p className="text-xs text-red-600 mt-1" role="alert">{passwordState.error.fieldErrors.currentPassword}</p>
                  )}
                </div>
                <div>
                  <label className={labelCls} htmlFor="new-password">New Password</label>
                  <input id="new-password" name="newPassword" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
                  {passwordState && !passwordState.ok && passwordState.error.fieldErrors?.newPassword && (
                    <p className="text-xs text-red-600 mt-1" role="alert">{passwordState.error.fieldErrors.newPassword}</p>
                  )}
                </div>
                <div>
                  <label className={labelCls} htmlFor="confirm-password">Confirm New Password</label>
                  <input id="confirm-password" name="confirmPassword" type="password" required autoComplete="new-password" className={inputCls} />
                  {passwordState && !passwordState.ok && passwordState.error.fieldErrors?.confirmPassword && (
                    <p className="text-xs text-red-600 mt-1" role="alert">{passwordState.error.fieldErrors.confirmPassword}</p>
                  )}
                </div>
                {passwordState?.ok && <p className="text-xs text-emerald-700" role="status">Password changed.</p>}
                <button
                  type="submit"
                  disabled={passwordPending}
                  className="bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase py-3.5 hover:bg-accent transition-colors font-montserrat disabled:opacity-50"
                >
                  {passwordPending ? "Updating…" : "Update Password"}
                </button>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
