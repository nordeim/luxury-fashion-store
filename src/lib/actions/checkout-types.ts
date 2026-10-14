// Types for the checkout action (a "use server" module may only export
// async functions, so shared action types live beside it in a plain module).

import type { ActionResult } from "@/lib/action-result";

export type { ActionResult };

export interface PlacedOrderResult {
  number: string;
  /** Guest-only HMAC capability token for /checkout/success?order=N&t=. */
  viewToken?: string;
}

export type PlacedOrderState = ActionResult<PlacedOrderResult> | null;
