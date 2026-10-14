"use client";

// "SALE ENDS IN" countdown (P-9, session-7) — parity surface.
//
// Reference markup (measured live 2026-10-15): a row `flex flex-col
// lg:flex-row items-start lg:items-center justify-between` — left: the
// `text-xs tracking-[0.2em] text-muted-foreground font-montserrat` label;
// right: three `bg-primary text-primary-foreground w-12 h-12` digit boxes,
// each a `font-cormorant text-xl font-medium leading-none` number over a
// `text-[8px] tracking-widest font-montserrat` unit, separated by colons.
//
// Hydration-safe by construction (SKILL §6: no setState-in-effect): the
// ticking seconds come from useSyncExternalStore — the server snapshot is a
// stable placeholder, the client snapshot derives from the mount deadline
// and recomputes once per second from a shared interval store.

import { useSyncExternalStore } from "react";
import { SALE_COUNTDOWN_MS, formatCountdownParts } from "@/lib/countdown";

// One shared 1s ticker for every mounted countdown (the home renders one;
// the store starts lazily and stops when the last listener leaves).
const listeners = new Set<() => void>();
let interval: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!interval) {
    interval = setInterval(() => listeners.forEach((l) => l()), 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && interval) {
      clearInterval(interval);
      interval = null;
    }
  };
}

/**
 * Remaining milliseconds until this component's mount deadline. The snapshot
 * is cached per second (stable string identity within one tick — required by
 * useSyncExternalStore's snapshot-immutability check).
 */
let deadline = 0;
function remainingMs(): number {
  // Captured on first CLIENT access — the server render never reaches here
  // (getServerSnapshot owns SSR), so the deadline is genuinely mount-relative.
  if (!deadline) deadline = Date.now() + SALE_COUNTDOWN_MS;
  return deadline - Date.now();
}
function getClientSnapshot(): string {
  const { hours, minutes, seconds } = formatCountdownParts(remainingMs());
  return `${hours}:${minutes}:${seconds}`;
}
function getServerSnapshot(): string {
  return "08:24:00";
}

const PART_BOX = "bg-primary text-primary-foreground w-12 h-12 flex flex-col items-center justify-center";
const PART_DIGIT = "font-cormorant text-xl font-medium leading-none";
const PART_UNIT = "text-[8px] tracking-widest font-montserrat text-primary-foreground/70";

export function SaleCountdown() {
  // The snapshot IS the display state: "HH:MM:SS", identity-stable within a
  // second, placeholder on the server, real ticking after hydration.
  const snapshot = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const [hours, minutes, seconds] = snapshot.split(":");
  const cells: Array<[string, string]> = [
    [hours, "HRS"],
    [minutes, "MIN"],
    [seconds, "SEC"],
  ];
  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-12 gap-4">
      <div className="text-xs tracking-[0.2em] text-muted-foreground font-montserrat uppercase">
        Sale ends in
      </div>
      <div className="flex items-center gap-2" data-testid="sale-countdown" aria-label={`Sale ends in ${snapshot}`}>
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
