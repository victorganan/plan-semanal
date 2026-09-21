import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';

const LINKS = [
  { href: '/hoy', label: 'Hoy' },
  { href: '/semana', label: 'Semana' },
  { href: '/proyectos', label: 'Proyectos' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/ajustes', label: 'Ajustes' },
];

export function NavBar({ userName, userImage }: { userName?: string | null; userImage?: string | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-base-border bg-base-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/hoy" className="text-lg font-semibold tracking-tight">
          Nortvira
        </Link>
        <nav className="hidden gap-1 sm:flex">
          {LINKS.map((link) => (
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
      <nav className="flex gap-1 overflow-x-auto border-t border-base-border px-4 py-2 sm:hidden">
        {LINKS.map((link) => (
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
