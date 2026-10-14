// Sale countdown seam (P-9, session-7).
//
// The reference's "SALE ENDS IN" block is a mount-relative rolling target
// ticking real seconds — measured live 2026-10-15: across page loads the
// target drifts forward (it is recomputed at mount), while within a mounted
// page it decremented exactly with wall time (65s elapsed → 65s dropped).
// The clone matches those semantics with a REAL ticking countdown: the
// deadline is captured at component mount + SALE_COUNTDOWN_MS.

export const SALE_COUNTDOWN_MS = (8 * 60 + 24) * 60_000; // ~8h24m, reference-measured

export interface CountdownParts {
  hours: string;
  minutes: string;
  seconds: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Pure formatter — zero-padded HH/MM/SS, clamped at zero (never negative). */
export function formatCountdownParts(remainingMs: number): CountdownParts {
  const total = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds) };
}
