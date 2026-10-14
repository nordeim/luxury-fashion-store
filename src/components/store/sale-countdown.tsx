"use client";

// "SALE ENDS IN" countdown (P-9, session-7; P-14/H-49, session-8) — parity
// surface.
//
// Reference markup (re-measured live 2026-10-15): the countdown is the RIGHT
// side of the deals header row — a STACK (`flex flex-col items-start
// lg:items-end gap-2`): the 12px "SALE ENDS IN" label ABOVE the three
// `bg-primary text-primary-foreground w-12 h-12` digit boxes (cormorant
// digits + 8px unit labels), right-aligned at lg.
//
// Hydration-safe by construction (SKILL §6: no setState-in-effect): the
// ticking seconds come from useSyncExternalStore — the server snapshot is a
// stable placeholder, the client snapshot derives from the store's deadline
// and recomputes once per second. The deadline lives in
// `createCountdownStore` (H-49): it re-arms per MOUNT CYCLE — a fresh target
// whenever the component mounts with no prior listeners — so SPA navigation
// can no longer inherit a stale (eventually expired) deadline.

import { useSyncExternalStore } from "react";
import { createCountdownStore } from "@/lib/countdown-store";

// One shared store for every mounted countdown (the home renders one; the
// ticker starts lazily and stops + re-arms when the last listener leaves).
const store = createCountdownStore();

const PART_BOX = "bg-primary text-primary-foreground w-12 h-12 flex flex-col items-center justify-center";
const PART_DIGIT = "font-cormorant text-xl font-medium leading-none";
const PART_UNIT = "text-[8px] tracking-widest font-montserrat text-primary-foreground/70";

export function SaleCountdown() {
  // The snapshot IS the display state: "HH:MM:SS", identity-stable within a
  // second, placeholder on the server, real ticking after hydration.
  const snapshot = useSyncExternalStore(store.subscribe, store.getClientSnapshot, store.getServerSnapshot);
  const [hours, minutes, seconds] = snapshot.split(":");
  const cells: Array<[string, string]> = [
    [hours, "HRS"],
    [minutes, "MIN"],
    [seconds, "SEC"],
  ];
  return (
    // P-14: the right-hand stack — label above the boxes, right-aligned at
    // lg (the row layout around it is owned by exclusive-deals).
    <div className="flex flex-col items-start lg:items-end gap-2" data-testid="sale-countdown">
      <div className="text-xs tracking-[0.2em] text-muted-foreground font-montserrat uppercase">
        Sale ends in
      </div>
      <div className="flex items-center gap-2" aria-label={`Sale ends in ${snapshot}`}>
        {cells.map(([value, unit], i) => (
          <div key={unit} className="flex items-center gap-2">
            {i > 0 && <span className="text-muted-foreground font-cormorant text-xl">:</span>}
            <div className={PART_BOX}>
              <span className={PART_DIGIT}>{value}</span>
              <span className={PART_UNIT}>{unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
