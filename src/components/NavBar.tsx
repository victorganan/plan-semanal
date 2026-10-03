'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { signOut } from 'next-auth/react';
import clsx from 'clsx';
import { ThemeToggle } from '@/components/ThemeToggle';
import { openQuickCapture } from '@/components/QuickCapture';
import { text } from '@/i18n/es';

// Navegación en dos formas (auditoría UX §2.2 / §3.5):
// - Escritorio (md+): columna izquierda de 200px, plegable a 56px solo con
//   iconos. El estado se guarda en localStorage y lo aplica ThemeScript
//   antes de pintar (html[data-nav="collapsed"]), sin parpadeo.
// - Móvil: cabecera mínima (con "Más") + barra inferior fija Hoy · Semana · [+] ·
//   Tareas · Bandeja; "Más" en la cabecera.

const NAV_COLLAPSED_KEY = 'nortvira.navCollapsed';

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={clsx('h-5 w-5 shrink-0', className)}>
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  hoy: 'M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  semana: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6ZM4 10h16M8 2v4M16 2v4',
  tareas: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  bandeja: 'M4 13h4l1.5 3h5L16 13h4M4 13l2.5-8h11L20 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6Z',
  mas: 'M5 12h.01M12 12h.01M19 12h.01',
  plus: 'M12 5v14M5 12h14',
  collapse: 'M15 6l-6 6 6 6',
  expand: 'M9 6l6 6-6 6',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10',
};

// "Más" (Fase 2): lo secundario, para dejar solo Hoy · Semana · Bandeja
// como destinos principales. Los tres rituales están siempre aquí, además
// del botón contextual según la hora.
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

function MoreMenu({ placement, buttonClassName, children }: { placement: 'right' | 'down'; buttonClassName: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const active = MORE_ITEMS.some((i) => pathname.startsWith(i.href));

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item = 'block px-3 py-2.5 text-sm text-base-text hover:bg-base-border/40';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={clsx(buttonClassName, active && 'font-semibold text-base-text')}
      >
        {children}
      </button>
      {open ? (
        <div
          role="menu"
          className={clsx(
            'absolute z-50 w-60 rounded-lg border border-base-border bg-base-bg py-1 shadow-lg',
            placement === 'right' ? 'top-0 left-full ml-2' : 'top-full right-0 mt-2'
          )}
        >
          <p className="px-3 pb-1 pt-2 text-[13px] font-semibold text-base-muted">{text.nav.ritualsGroupLabel}</p>
          {MORE_RITUAL_ITEMS.map((i) => (
            <Link key={i.href} href={i.href} role="menuitem" onClick={() => setOpen(false)} className={item}>
              {i.label}
            </Link>
          ))}
          <div className="my-1 border-t border-base-border" />
          {MORE_ITEMS.map((i) => (
            <Link key={i.href} href={i.href} role="menuitem" onClick={() => setOpen(false)} className={item}>
              {i.label}
            </Link>
          ))}
          <div className="my-1 border-t border-base-border md:hidden" />
          <button role="menuitem" onClick={() => signOut({ callbackUrl: '/login' })} className={clsx(item, 'w-full text-left md:hidden')}>
            {text.logoutButton.label}
          </button>
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
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const [collapsed, setCollapsed] = useState(false);
  const count = pendingBandeja ?? 0;

  useEffect(() => {
    setCollapsed(document.documentElement.dataset.nav === 'collapsed');
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    if (next) document.documentElement.dataset.nav = 'collapsed';
    else delete document.documentElement.dataset.nav;
    try {
      localStorage.setItem(NAV_COLLAPSED_KEY, next ? '1' : '0');
    } catch {
      // Sin almacenamiento: se pliega solo en esta visita.
    }
  }

  const links = [
    { href: '/hoy', label: text.nav.hoy, icon: ICONS.hoy },
    { href: '/semana', label: text.nav.semana, icon: ICONS.semana },
    { href: '/tareas', label: text.nav.tareas, icon: ICONS.tareas },
    { href: '/bandeja', label: text.nav.bandeja, icon: ICONS.bandeja, count },
  ];

  // G1: sección activa con aria-current + texto en tinta y peso 600.
  const sideLink = (active: boolean) =>
    clsx(
      'flex min-h-[44px] items-center gap-3 rounded-lg px-2.5 text-sm transition',
      active ? 'bg-base-border/40 font-semibold text-base-text' : 'text-base-muted hover:bg-base-border/40 hover:text-base-text'
    );

  return (
    <>
      {/* Escritorio: columna izquierda plegable */}
      <aside
        aria-label={text.nav.mainAriaLabel}
        className="fixed inset-y-0 left-0 z-40 hidden w-[var(--nav-w)] flex-col border-r border-base-border bg-base-bg px-2 py-4 md:flex"
      >
        <Link href="/hoy" className="mb-4 flex min-h-[44px] items-center px-3 text-lg font-semibold tracking-tight">
          <span className="nav-label">Nortvira</span>
          <span className="nav-collapsed-only">N</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {links.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                aria-label={l.count ? text.inboxList.bandejaNavLabel(l.count) : l.label}
                title={l.label}
                className={clsx(sideLink(active), 'relative')}
              >
                <Icon d={l.icon} />
                <span className="nav-label flex-1">{l.label}</span>
                {l.count ? (
                  <>
                    <span className="nav-count text-[13px] tabular-nums text-base-muted">{l.count}</span>
                    <span className="nav-collapsed-only absolute right-0.5 top-0 text-[13px] tabular-nums text-base-muted">{l.count}</span>
                  </>
                ) : null}
              </Link>
            );
          })}
          <MoreMenu placement="right" buttonClassName={clsx(sideLink(false), 'w-full')}>
            <Icon d={ICONS.mas} />
            <span className="nav-label">{text.nav.more}</span>
          </MoreMenu>
        </nav>

        <div className="mt-auto flex flex-col gap-1">
          <div className="flex min-h-[44px] items-center gap-2 px-1.5">
            <ThemeToggle />
            {userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userImage} alt={userName ?? ''} className="nav-label h-8 w-8 rounded-full" />
            ) : null}
          </div>
          <button onClick={() => signOut({ callbackUrl: '/login' })} title={text.logoutButton.label} className={sideLink(false)}>
            <Icon d={ICONS.logout} />
            <span className="nav-label">{text.logoutButton.label}</span>
          </button>
          <button
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? text.nav.expand : text.nav.collapse}
            title={collapsed ? text.nav.expand : text.nav.collapse}
            className={sideLink(false)}
          >
            <Icon d={collapsed ? ICONS.expand : ICONS.collapse} />
            <span className="nav-label">{text.nav.collapse}</span>
          </button>
        </div>
      </aside>

      {/* Móvil: cabecera mínima */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-base-border bg-base-bg/90 px-4 py-2 backdrop-blur md:hidden">
        <Link href="/hoy" className="text-lg font-semibold tracking-tight">
          Nortvira
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userImage} alt={userName ?? ''} className="h-8 w-8 rounded-full" />
          ) : null}
          <MoreMenu placement="down" buttonClassName="flex min-h-[44px] items-center gap-1 rounded-full px-3 text-sm text-base-muted">
            <Icon d={ICONS.mas} />
            {text.nav.more}
          </MoreMenu>
        </div>
      </header>

      {/* Móvil: barra inferior */}
      <nav
        aria-label={text.nav.mainAriaLabel}
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-base-border bg-base-bg pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {links.slice(0, 2).map((l) => (
          <BottomLink key={l.href} href={l.href} label={l.label} icon={l.icon} active={isActive(l.href)} />
        ))}
        <div className="flex items-center justify-center">
          <button
            onClick={openQuickCapture}
            aria-label={text.quickCapture.buttonAriaLabel}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-base-text text-base-bg"
          >
            <Icon d={ICONS.plus} className="h-6 w-6" />
          </button>
        </div>
        <BottomLink href="/tareas" label={text.nav.tareas} icon={ICONS.tareas} active={isActive('/tareas')} />
        <BottomLink
          href="/bandeja"
          label={text.nav.bandeja}
          ariaLabel={text.inboxList.bandejaNavLabel(count)}
          icon={ICONS.bandeja}
          active={isActive('/bandeja')}
          count={count}
        />
      </nav>
    </>
  );
}

function BottomLink({
  href,
  label,
  ariaLabel,
  icon,
  active,
  count,
}: {
  href: string;
  label: string;
  ariaLabel?: string;
  icon: string;
  active: boolean;
  count?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      aria-label={ariaLabel}
      className={clsx(
        'relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[13px]',
        active ? 'font-semibold text-base-text' : 'text-base-muted'
      )}
    >
      <Icon d={icon} />
      {label}
      {count ? <span className="absolute right-[18%] top-1 text-[13px] tabular-nums text-base-muted">{count}</span> : null}
    </Link>
  );
}
