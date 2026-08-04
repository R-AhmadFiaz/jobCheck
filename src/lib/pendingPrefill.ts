'use client';

// Next.js migration: replaces React Router's `navigate(url, { state })`,
// which has no equivalent in Next.js's URL-based router — `router.push()`
// cannot carry arbitrary in-memory data to the destination page. This is a
// currently-unused capability in the source app (no call site actually
// passes `prefill` today — see useGoToAnalyzer.ts), but it's preserved
// faithfully rather than silently dropped. sessionStorage (not a query
// param) keeps the same "transient, this browser tab only" semantics
// React Router's nav state had, without exposing the prefill text in the URL.
const STORAGE_KEY = 'jobcheck-pending-prefill';

export function setPendingPrefill(text: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, text);
  } catch {
    // sessionStorage unavailable (e.g. disabled) — prefill is a convenience,
    // not required for the analyzer to function.
  }
}

/** Reads and clears the pending prefill — one-time use, same as nav state. */
export function consumePendingPrefill(): string | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    if (value !== null) sessionStorage.removeItem(STORAGE_KEY);
    return value;
  } catch {
    return null;
  }
}
