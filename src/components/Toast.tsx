'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';

interface ToastAction {
  label: string;
  href: string;
}

interface ToastItem {
  id: string;
  message: string;
  variant: 'success' | 'error';
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (message: string, variant?: 'success' | 'error', action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, variant: 'success' | 'error' = 'success', action?: ToastAction) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, variant, action }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              'pointer-events-auto flex items-center gap-3 rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg',
              t.variant === 'success' ? 'bg-accent' : 'bg-priority-high'
            )}
          >
            <span>{t.message}</span>
            {t.action ? (
              <Link href={t.action.href} className="shrink-0 underline underline-offset-2">
                {t.action.label}
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
