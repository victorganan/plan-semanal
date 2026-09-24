import Link from 'next/link';
import { text } from '@/i18n/es';

const LINKS = [
  { href: '/hoy', label: text.nav.hoy },
  { href: '/semana', label: text.nav.semana },
  { href: '/tu-espacio', label: text.nav.tuEspacio },
  { href: '/dashboard', label: text.nav.dashboard },
  { href: '/ajustes', label: text.nav.ajustes },
];

export function Footer() {
  return (
    <footer className="mt-12 border-t border-base-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-base-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-base-text">
              {link.label}
            </Link>
          ))}
        </nav>
        <p>
          <span className="font-medium text-base-text">Nortvira</span> · {text.footer.tagline}
        </p>
      </div>
    </footer>
  );
}
