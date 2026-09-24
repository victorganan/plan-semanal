'use client';

import { signOut } from 'next-auth/react';
import { text } from '@/i18n/es';

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="text-sm text-base-muted transition hover:text-base-text"
    >
      {text.logoutButton.label}
    </button>
  );
}
