// Unit pins for the countdown STORE (H-49, session-8).
//
// Session-7's countdown stamped its deadline in a module-global `let` on the
// first CLIENT access and never reset it — "mount-relative" only for the
// FIRST mount. After SALE_COUNTDOWN_MS of SPA session time every later mount
// showed a frozen 00:00:00, while the reference recomputes the target at
// every page load. The store now re-arms a FRESH target whenever its listener
// count transitions 0→1 (a new mount cycle), and stops its ticker when the
// last listener leaves. The clock is injected and the fake-timer interval
// advances in lockstep, so the pins exercise the real tick path.
import { afterEach, describe, expect, it, vi } from "vitest";
import { SALE_COUNTDOWN_MS, formatCountdownParts } from "./countdown";
import { createCountdownStore } from "./countdown-store";

describe("createCountdownStore (H-49 — the deadline is mount-cycle-relative)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function makeHarness() {
    vi.useFakeTimers();
    let nowMs = 1_000_000;
    const store = createCountdownStore({ now: () => nowMs, intervalMs: 1000 });
    // Advance the injected clock AND the fake interval in lockstep — the
    // tick fan-out (cache invalidation + notify) is part of the behavior.
    const advance = (ms: number) => {
      nowMs += ms;
      vi.advanceTimersByTime(ms);
    };
    return { store, advance };
  }

  // The store's client snapshot is the FORMATTED string ("HH:MM:SS").
  const fmt = (ms: number) => {
    const p = formatCountdownParts(ms);
    return `${p.hours}:${p.minutes}:${p.seconds}`;
  };

  it("stamps a fresh target on first access and renders the ~8h24m window", () => {
    const { store } = makeHarness();
    const off = store.subscribe(() => {});
    expect(store.getClientSnapshot()).toBe(fmt(SALE_COUNTDOWN_MS));
    off();
  });

  it("keeps ticking down within one mount (real seconds from the clock)", () => {
    const { store, advance } = makeHarness();
    const off = store.subscribe(() => {});
    const before = store.getClientSnapshot();
    advance(5_000);
    const after = store.getClientSnapshot();
    expect(before).not.toBe(after);
    expect(after).toBe(fmt(SALE_COUNTDOWN_MS - 5_000));
    off();
  });

  it("is identity-stable within one tick (sub-second clock movement between reads)", () => {
    const { store, advance } = makeHarness();
    const off = store.subscribe(() => {});
    const a = store.getClientSnapshot();
    advance(400);
    expect(store.getClientSnapshot()).toBe(a);
    off();
  });

  it("RE-ARMS a fresh target when the last listener leaves and a new mount cycle starts (H-49)", () => {
    const { store, advance } = makeHarness();
    // First mount cycle: consume 6 of the ~8.4 hours.
    const off1 = store.subscribe(() => {});
    advance(6 * 3_600_000);
    expect(store.getClientSnapshot()).toBe(fmt(SALE_COUNTDOWN_MS - 6 * 3_600_000));
    // Unmount (last listener leaves) — the deadline must be DISCARDED.
    off1();
    // Time keeps passing past the ORIGINAL deadline (7h later: the old
    // deadline is long gone).
    advance(7 * 3_600_000);
    // Second mount cycle: the reference recomputes per page load — the store
    // must hand back a FRESH ~8h24m target, not a frozen 00:00:00.
    const off2 = store.subscribe(() => {});
    expect(store.getClientSnapshot()).toBe(fmt(SALE_COUNTDOWN_MS));
    off2();
  });

  it("keeps the deadline while ANY listener remains (concurrent mounts share one target)", () => {
    const { store, advance } = makeHarness();
    const offA = store.subscribe(() => {});
    advance(1_000);
    const offB = store.subscribe(() => {});
    offA(); // one mount still active — the target must NOT re-arm
    advance(2_000);
    expect(store.getClientSnapshot()).toBe(fmt(SALE_COUNTDOWN_MS - 3_000));
    offB();
  });

  it("notifies listeners once per tick and stops the ticker at zero listeners", () => {
    const { store, advance } = makeHarness();
    let ticks = 0;
    const off = store.subscribe(() => {
      ticks += 1;
    });
    advance(3_500);
    expect(ticks).toBe(3);
    off();
    advance(10_000);
    expect(ticks).toBe(3); // the interval was cleared — no further fan-out
  });

  it("serves the stable server placeholder regardless of clock state", () => {
    const { store, advance } = makeHarness();
    expect(store.getServerSnapshot()).toBe("08:24:00");
    advance(99 * 3_600_000);
    expect(store.getServerSnapshot()).toBe("08:24:00");
  });
});
