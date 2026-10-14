// Unit pins for the sale-countdown formatter (P-9, session-7).
//
// The reference's "SALE ENDS IN" countdown is a mount-relative rolling target
// (~8h24m) ticking real seconds — measured live 2026-10-15 (target drifted
// forward per page load; within a mount it decremented exactly with wall
// time). `formatCountdownParts` is the pure seam the component renders.
import { describe, expect, it } from "vitest";
import { SALE_COUNTDOWN_MS, formatCountdownParts } from "./countdown";

describe("formatCountdownParts (P-9)", () => {
  it("splits a remaining duration into zero-padded HH/MM/S", () => {
    expect(formatCountdownParts(8 * 3_600_000 + 24 * 60_000 + 5_000)).toEqual({
      hours: "08",
      minutes: "24",
      seconds: "05",
    });
  });

  it("renders single-digit seconds padded (3h + 2m + 700s = 03:13:40)", () => {
    expect(formatCountdownParts(3 * 3_600_000 + 2 * 60_000 + 700_000)).toEqual({
      hours: "03",
      minutes: "13",
      seconds: "40",
    });
  });

  it("clamps at zero — an expired sale never shows negative digits", () => {
    expect(formatCountdownParts(0)).toEqual({ hours: "00", minutes: "00", seconds: "00" });
    expect(formatCountdownParts(-5_000)).toEqual({ hours: "00", minutes: "00", seconds: "00" });
  });

  it("pins the mount-relative window the reference exhibits (~8h24m)", () => {
    expect(SALE_COUNTDOWN_MS).toBe((8 * 60 + 24) * 60_000);
  });
});
