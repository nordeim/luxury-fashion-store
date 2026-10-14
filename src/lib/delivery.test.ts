// Unit pins for the delivery-window estimator (business-day math).
import { describe, expect, it } from "vitest";
import { estimateDelivery } from "./delivery";

/** Monday, 2026-01-05, local time. */
const MONDAY = new Date(2026, 0, 5, 12, 0, 0);

describe("estimateDelivery", () => {
  it("spans 2-4 business days from a weekday order", () => {
    const win = estimateDelivery(MONDAY);
    // Wed (Jan 7) – Fri (Jan 9) in the same week.
    expect(win.from.getDay()).toBe(3);
    expect(win.to.getDay()).toBe(5);
    expect(win.from.getMonth()).toBe(0);
  });

  it("skips the weekend", () => {
    // Thursday Jan 8 + 2 business days → Monday Jan 12 (weekend skipped).
    const thursday = new Date(2026, 0, 8, 12, 0, 0);
    const win = estimateDelivery(thursday);
    expect(win.from.getDay()).toBe(1); // Monday
    expect(win.from.getDate()).toBe(12);
  });

  it("renders a human label in en-US short form", () => {
    const win = estimateDelivery(MONDAY);
    expect(win.label).toMatch(/^[A-Z][a-z]{2} \d{1,2} – [A-Z][a-z]{2} \d{1,2}$/);
    expect(win.label).toBe("Jan 7 – Jan 9");
  });

  it("defaults to now when called without arguments", () => {
    const win = estimateDelivery();
    expect(win.from.getTime()).toBeGreaterThan(Date.now());
    expect(win.to.getTime()).toBeGreaterThan(win.from.getTime());
  });
});
