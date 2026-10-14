// Countdown store (H-49, session-8) — the subscribe/snapshot seam the
// SaleCountdown component feeds to useSyncExternalStore.
//
// Session-7's implementation stamped its deadline in a module-global `let`
// on the first CLIENT access and never reset it — "mount-relative" only for
// the FIRST mount. After SALE_COUNTDOWN_MS of SPA session time every later
// mount showed a frozen 00:00:00, while the reference recomputes its target
// at every page load (measured live 2026-10-15). The store re-arms a FRESH
// target whenever its listener count transitions 0→1 — a new mount cycle —
// and stops its ticker when the last listener leaves.
//
// The clock is injectable so the re-arm semantics are unit-pinnable without
// touching the wall clock (src/lib/countdown-store.test.ts).

import { SALE_COUNTDOWN_MS, formatCountdownParts } from "@/lib/countdown";

export interface CountdownStoreOptions {
  /** Rolling window the reference exhibits (~8h24m). */
  ttlMs?: number;
  /** Injectable clock (tests drive it manually). */
  now?: () => number;
  /** Tick cadence — 1s, like the reference's real-second decrement. */
  intervalMs?: number;
  /** Server placeholder — the pre-hydration paint (measured reference shape). */
  serverSnapshot?: string;
}

export interface CountdownStore {
  subscribe(listener: () => void): () => void;
  getClientSnapshot(): string;
  getServerSnapshot(): string;
}

export function createCountdownStore(options: CountdownStoreOptions = {}): CountdownStore {
  const ttlMs = options.ttlMs ?? SALE_COUNTDOWN_MS;
  const now = options.now ?? (() => Date.now());
  const intervalMs = options.intervalMs ?? 1000;
  const serverSnapshot = options.serverSnapshot ?? "08:24:00";

  const listeners = new Set<() => void>();
  let interval: ReturnType<typeof setInterval> | null = null;
  // 0 = disarmed: the next mount cycle stamps a fresh target (H-49). The
  // deadline is discarded when the LAST listener leaves, not on any
  // intermediate unsubscribe — concurrent mounts share one target.
  let deadline = 0;
  // The formatted snapshot is cached PER TICK (useSyncExternalStore requires
  // a cached getSnapshot — re-deriving from the clock on every read could
  // cross a second boundary between React's calls and trip its stability
  // check). The cache is invalidated on each tick fan-out and on re-arm.
  let cached = "";

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    if (!deadline) deadline = now() + ttlMs;
    if (!interval) {
      interval = setInterval(() => {
        cached = "";
        listeners.forEach((l) => l());
      }, intervalMs);
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        deadline = 0; // re-arm on the next subscribe (H-49)
        cached = "";
      }
    };
  }

  function getClientSnapshot(): string {
    // The deadline is stamped on the first client READ (hydration render)
    // and re-stamped by subscribe on every fresh mount cycle.
    if (!deadline) deadline = now() + ttlMs;
    if (!cached) cached = formatCountdown(deadline - now());
    return cached;
  }

  return { subscribe, getClientSnapshot, getServerSnapshot: () => serverSnapshot };
}

function formatCountdown(remainingMs: number): string {
  const { hours, minutes, seconds } = formatCountdownParts(remainingMs);
  return `${hours}:${minutes}:${seconds}`;
}
