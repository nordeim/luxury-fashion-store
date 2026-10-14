// The one mutation-result envelope. Actions return data, never throw across
// the seam: { ok: true, data } | { ok: false, error: { message, fieldErrors? } }.

export interface ActionError {
  message: string;
  fieldErrors?: Record<string, string>;
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(message: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, error: { message, fieldErrors } };
}

/** Map a ZodError to field-level messages for inline form errors. */
export function fieldErrorsFrom(zodError: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of zodError.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
