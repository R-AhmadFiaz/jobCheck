// Next.js migration: the original took an Express `Response` and called
// `.status().json()` on it directly. Route Handlers build a `NextResponse`
// instead, so this now just returns the exact same `{success, data}` body —
// the wire format callers already depend on is unchanged.
export function successBody<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}
