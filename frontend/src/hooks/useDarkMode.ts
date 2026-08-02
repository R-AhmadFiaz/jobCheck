import { useEffect, useState } from 'react';

const STORAGE_KEY = 'jobcheck-dark-mode';

function getInitialDark(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) return stored === 'true';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function useDarkMode(): [boolean, () => void] {
  const [dark, setDark] = useState(getInitialDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem(STORAGE_KEY, String(dark));
  }, [dark]);

  return [dark, () => setDark((d) => !d)];
}
