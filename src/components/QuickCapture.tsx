'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/Toast';
import { text } from '@/i18n/es';

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

// Atajo global de captura (M6.1): disponible en cualquier pantalla, incluida
// la Guardia de foco. No usa el estado de ninguna pantalla en concreto — solo
// guarda directo en la Bandeja y confirma con un toast, sin refrescar nada.
export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      setOpen(true);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await api.post('/api/tasks', { kind: 'BACKLOG', text: trimmed });
      showToast(text.quickCapture.captured);
      setValue('');
      setOpen(false);
    } catch {
      showToast(text.quickCapture.error, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={text.quickCapture.buttonAriaLabel}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl font-semibold text-white shadow-lg hover:brightness-110 sm:bottom-6"
      >
        +
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setOpen(false)}>
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-card bg-base-surface p-4 shadow-xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">{text.quickCapture.buttonAriaLabel}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={text.quickCapture.cancelAriaLabel}
                className="rounded-full p-1 text-base-muted hover:bg-base-border/40"
              >
                ✕
              </button>
            </div>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={text.quickCapture.placeholder}
              className="w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm outline-none"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="hidden text-xs text-base-muted sm:inline">{text.quickCapture.shortcutHint}</span>
              <button
                type="submit"
                disabled={!value.trim() || busy}
                className="ml-auto rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {text.quickCapture.submit}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
