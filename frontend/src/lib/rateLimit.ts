import "server-only";

// Fixed-window limiter for the public (QR token) endpoints. In-memory, so it's per server process: enough
// to stop a stuck button or a script from hammering one table; run behind a gateway limiter at scale.

const windows = new Map<string, { start: number; count: number }>();

/** True when the call is allowed; false once `key` has made `max` calls within `windowMs`. */
export function allow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const w = windows.get(key);
  if (!w || now - w.start >= windowMs) {
    if (windows.size > 10_000) windows.clear();
    windows.set(key, { start: now, count: 1 });
    return true;
  }
  return ++w.count <= max;
}

export const tooMany = () => Response.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429, headers: { "Retry-After": "60" } });
