'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';
import { text } from '@/i18n/es';

const LINKS_BEFORE = [
  { href: '/hoy', label: text.nav.hoy },
  { href: '/semana', label: text.nav.semana },
  { href: '/tu-espacio', label: text.nav.tuEspacio },
];

const LINKS_AFTER = [
  { href: '/dashboard', label: text.nav.dashboard },
  { href: '/ajustes', label: text.nav.ajustes },
];

const HERRAMIENTAS_ITEMS = [
  { href: '/herramientas', label: text.nav.herramientasViewAll },
  { href: '/herramientas/matriz', label: text.nav.herramientasMatriz },
  { href: '/herramientas/pomodoro', label: text.nav.herramientasPomodoro },
  { href: '/herramientas/tiempo', label: text.nav.herramientasTiempo },
];

function HerramientasMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-base-muted transition hover:bg-base-border/40 hover:text-base-text"
      >
        {text.nav.herramientas}
        <span className={clsx('text-[9px] transition-transform', open && 'rotate-180')}>▼</span>
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-lg border border-base-border bg-base-bg py-1 shadow-lg">
          {HERRAMIENTAS_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-base-text hover:bg-base-border/40"
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function NavBar({ userName, userImage }: { userName?: string | null; userImage?: string | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-base-border bg-base-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/hoy" className="text-lg font-semibold tracking-tight">
          Nortvira
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          {LINKS_BEFORE.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-base-muted transition hover:bg-base-border/40 hover:text-base-text"
            >
              {link.label}
            </Link>
          ))}
          <HerramientasMenu />
          {LINKS_AFTER.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-base-muted transition hover:bg-base-border/40 hover:text-base-text"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userImage} alt={userName ?? ''} className="h-8 w-8 rounded-full" />
          ) : null}
          <LogoutButton />
        </div>
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-base-border px-4 py-2 sm:hidden">
        {LINKS_BEFORE.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-base-muted transition hover:bg-base-border/40 hover:text-base-text"
          >
            {link.label}
          </Link>
        ))}
        <HerramientasMenu />
        {LINKS_AFTER.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-base-muted transition hover:bg-base-border/40 hover:text-base-text"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
