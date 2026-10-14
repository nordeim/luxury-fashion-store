// Cart-adjust planner (H-39/H-40, session-7) — the pure decision seam for the
// ±1 stepper writes. Extracted from `adjustCartItemAction` so both invariants
// are unit-pinnable without a database:
//
//   planAdjustment  — decides whether a requested delta may write at all.
//   planCorrection  — decides the post-increment correction from the OBSERVED
//                     quantity, never from a stale pre-read.
//
// The action in `src/lib/actions/cart.ts` executes these plans; conditional
// corrections (WHERE quantity = observed) are the executor's job.

export type AdjustPlan =
  | { kind: "skip" }
  | { kind: "increment"; delta: number };

/**
 * H-39: growth on a sold-out line is forbidden (H-15 semantics — the line
 * stays untouched; the checkout stock guard owns that conversation). The old
 * action fired its atomic increment BEFORE the sold-out branch, so a stale
 * UI's "+" inflated the persisted line with no clamp at all. A decrement is
 * always allowed — the user may still shed the line (cleanup path).
 */
export function planAdjustment(delta: number, stock: number): AdjustPlan {
  if (stock <= 0) {
    return delta < 0 ? { kind: "increment", delta } : { kind: "skip" };
  }
  return { kind: "increment", delta };
}

export type CorrectionPlan =
  | { kind: "none" }
  | { kind: "delete" }
  | { kind: "clamp" };

/**
 * H-40: corrections derive from the quantity the atomic increment OBSERVED,
 * and the executor must apply them conditionally (WHERE quantity = observed)
 * so a concurrent ±1 that landed after our write is never erased.
 *   delete — the observed quantity dropped to/below zero.
 *   clamp  — the observed quantity exceeds in-stock availability (the
 *            executor re-reads FRESH stock; fresh ≤ 0 → leave the line for
 *            the checkout guard, per H-15).
 */
export function planCorrection(observed: number, stock: number): CorrectionPlan {
  if (observed <= 0) return { kind: "delete" };
  if (stock > 0 && observed > stock) return { kind: "clamp" };
  return { kind: "none" };
}
