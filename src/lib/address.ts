// Safe parse for the JSON-encoded shippingAddress column (F-8, session-3).
// Three render paths used to call JSON.parse directly — a corrupted row took
// the whole page down. Every field is coerced to a display string; anything
// missing or wrong-typed becomes an em-dash placeholder instead of a 500.

export interface ShippingAddressView {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

const PLACEHOLDER = "—";

function str(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0 ? value : PLACEHOLDER;
}

export function parseShippingAddress(raw: unknown): ShippingAddressView {
  let obj: unknown = null;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      obj = null;
    }
  } else {
    obj = raw;
  }
  const record = typeof obj === "object" && obj !== null ? (obj as Record<string, unknown>) : {};
  return {
    fullName: str(record.fullName),
    street: str(record.street),
    city: str(record.city),
    state: str(record.state),
    zip: str(record.zip),
    country: str(record.country),
  };
}
