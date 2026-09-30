'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';
import { text } from '@/i18n/es';

// G1 (auditoría UX): el menú no marcaba la sección activa.
function navLinkClass(active: boolean, shrink = false) {
  return clsx(
    'rounded-full px-3 py-1.5 text-sm font-medium transition',
    shrink && 'shrink-0',
    active ? 'bg-base-border/40 font-semibold text-base-text' : 'text-base-muted hover:bg-base-border/40 hover:text-base-text'
  );
}

const LINKS_BEFORE = [
  { href: '/hoy', label: text.nav.hoy },
  { href: '/semana', label: text.nav.semana },
];

// "Más" (Fase 2, estructura de navegación): agrupa lo secundario para dejar
// solo Hoy · Semana · Bandeja + Más como destinos principales. Los tres
// rituales están siempre aquí, además del botón contextual según la hora.
const MORE_RITUAL_ITEMS = [
  { href: '/hoy?ritual=start', label: text.nav.ritualStartDay },
  { href: '/hoy?ritual=close', label: text.nav.ritualCloseDay },
  { href: '/semana?ritual=reflection', label: text.nav.ritualReflection },
];

const MORE_ITEMS = [
  { href: '/tu-espacio', label: text.nav.tuEspacio },
  { href: '/dashboard', label: text.nav.dashboard },
  { href: '/herramientas/matriz', label: text.nav.herramientasMatriz },
  { href: '/herramientas/tiempo', label: text.nav.herramientasTiempo },
  { href: '/ajustes', label: text.nav.ajustes },
];

function MoreMenu() {
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
        {text.nav.more}
        <span className={clsx('text-[9px] transition-transform', open && 'rotate-180')}>▼</span>
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-base-border bg-base-bg py-1 shadow-lg">
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-base-muted">
            {text.nav.ritualsGroupLabel}
          </p>
          {MORE_RITUAL_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-base-text hover:bg-base-border/40"
            >
              {item.label}
            </Link>
          ))}
          <div className="my-1 border-t border-base-border" />
          {MORE_ITEMS.map((item) => (
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

export function NavBar({
  userName,
  userImage,
  pendingBandeja,
}: {
  userName?: string | null;
  userImage?: string | null;
  pendingBandeja?: number;
}) {
  const bandejaLabel = text.inboxList.bandejaNavLabel(pendingBandeja ?? 0);
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  function renderLink(link: { href: string; label: string }, shrink = false) {
    const active = isActive(link.href);
    return (
      <Link key={link.href} href={link.href} aria-current={active ? 'page' : undefined} className={navLinkClass(active, shrink)}>
        {link.label}
      </Link>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-base-border bg-base-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/hoy" className="text-lg font-semibold tracking-tight">
          Nortvira
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          {LINKS_BEFORE.map((link) => renderLink(link))}
          {renderLink({ href: '/bandeja', label: bandejaLabel })}
          <MoreMenu />
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
        {LINKS_BEFORE.map((link) => renderLink(link, true))}
        {renderLink({ href: '/bandeja', label: bandejaLabel }, true)}
        <MoreMenu />
      </nav>
    </header>
  );
}
