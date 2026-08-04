'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'jobcheck-dark-mode';

// Next.js migration: the original read localStorage/matchMedia synchronously
// inside useState's initializer, which runs during Next.js's server-side
// render pass too (Client Components are still SSR'd for the initial HTML)
// — `localStorage`/`window` don't exist there, so that would crash. `false`
// is now the SSR-safe default, corrected on mount below. The actual visual
// theme never flashes wrong: app/layout.tsx sets the `dark` class via a
// blocking inline script before hydration/paint (same persisted-preference,
// system-preference-fallback behavior, just applied earlier) — this hook
// only needs to read that already-correct DOM state into React state, not
// recompute it.
export function useDarkMode(): [boolean, () => void] {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // document doesn't exist during SSR, so this can't run in the
    // initializer — see the module comment above for the full rationale.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem(STORAGE_KEY, String(dark));
  }, [dark]);

  return [dark, () => setDark((d) => !d)];
}
