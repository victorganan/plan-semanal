'use client';

import { useEffect, useState } from 'react';
import { text } from '@/i18n/es';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    setIsDark(next);
  }

  if (isDark === null) return <div className="h-9 w-9" />;

  return (
    <button
      onClick={toggle}
      aria-label={text.themeToggle.ariaLabel}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-base-border text-base-muted transition hover:text-base-text hover:bg-base-border/40"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
