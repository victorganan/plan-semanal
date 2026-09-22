import Link from 'next/link';

const LINKS = [
  { href: '/hoy', label: 'Hoy' },
  { href: '/semana', label: 'Semana' },
  { href: '/proyectos', label: 'Proyectos' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/ajustes', label: 'Ajustes' },
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
          <span className="font-medium text-base-text">Nortvira</span> · tu semana, con rumbo
        </p>
      </div>
    </footer>
  );
}
