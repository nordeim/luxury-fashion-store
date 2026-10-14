// Delivery-window estimator (pure seam, unit-pinned).
// Luxury ground: 2-4 business days processing+transit domestically.

export interface DeliveryWindow {
  from: Date;
  to: Date;
  label: string;
}

/** Next N business days from `from` (skips Sat/Sun). */
function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

export function estimateDelivery(from: Date = new Date()): DeliveryWindow {
  const fromDay = addBusinessDays(from, 2);
  const toDay = addBusinessDays(from, 4);
  // F-15 (session-3): pin the formatter's timezone — this label renders on
  // BOTH the server and the client (SSR'd client component), and a TZ-dependent
  // format produces hydration text mismatches for evening visitors. UTC keeps
  // server and client byte-identical.
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return {
    from: fromDay,
    to: toDay,
    label: `${fmt(fromDay)} – ${fmt(toDay)}`,
  };
}
