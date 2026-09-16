'use client';

import { signOut } from 'next-auth/react';

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="text-sm text-base-muted transition hover:text-base-text"
    >
      Cerrar sesión
    </button>
  );
}
