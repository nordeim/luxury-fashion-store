// Unit pins for the cart-adjust planner (H-39/H-40, session-7).
//
// The cart action's ±1 stepper used to (a) fire its atomic increment BEFORE
// the sold-out guard — inflating a line on a product whose stock hit 0 — and
// (b) run its post-corrections against the action's own snapshot, letting a
// concurrent +1 be erased by the -1 caller's delete. Both decisions are now
// pure functions pinned here; the action executes the plan.
import { describe, expect, it } from "vitest";
import { planAdjustment, planCorrection } from "./adjust-plan";

describe("planAdjustment (H-39 — growth on a sold-out line is forbidden)", () => {
  it("skips a positive delta on a sold-out line (H-15: leave the line untouched)", () => {
    expect(planAdjustment(1, 0)).toEqual({ kind: "skip" });
    expect(planAdjustment(99, 0)).toEqual({ kind: "skip" });
  });

  it("never skips a zero delta on a sold-out line (nothing to write)", () => {
    expect(planAdjustment(0, 0)).toEqual({ kind: "skip" });
  });

  it("allows a decrement on a sold-out line (the user may still shed the line)", () => {
    expect(planAdjustment(-1, 0)).toEqual({ kind: "increment", delta: -1 });
  });

  it("increments any delta while stock exists", () => {
    expect(planAdjustment(1, 5)).toEqual({ kind: "increment", delta: 1 });
    expect(planAdjustment(-1, 5)).toEqual({ kind: "increment", delta: -1 });
  });

  it("treats negative stock as sold out (defensive — stock is never negative)", () => {
    expect(planAdjustment(1, -2)).toEqual({ kind: "skip" });
  });
});

describe("planCorrection (H-40 — post-corrections from the observed quantity)", () => {
  it("deletes when the observed quantity dropped to zero or below", () => {
    expect(planCorrection(0, 5)).toEqual({ kind: "delete" });
    expect(planCorrection(0, 0)).toEqual({ kind: "delete" });
    expect(planCorrection(-2, 5)).toEqual({ kind: "delete" });
  });

  it("clamps when the observed quantity exceeds in-stock availability", () => {
    expect(planCorrection(7, 5)).toEqual({ kind: "clamp" });
  });

  it("leaves an over-quantity line alone when stock is gone (H-15 — the checkout guard owns that talk)", () => {
    expect(planCorrection(7, 0)).toEqual({ kind: "none" });
  });

  it("leaves a quantity within stock alone", () => {
    expect(planCorrection(5, 5)).toEqual({ kind: "none" });
    expect(planCorrection(3, 5)).toEqual({ kind: "none" });
  });

  it("orders the delete decision before the stock checks (a ≤0 line goes away regardless)", () => {
    // quantity 0 with stock 0: the cleanup wins — the line is empty either way.
    expect(planCorrection(0, 0)).toEqual({ kind: "delete" });
  });
});
