'use client';

import { createContext, useCallback, useContext, useRef } from 'react';
import type { TaskWithProject } from '@/types';

type Listener = (task: TaskWithProject) => void;

interface InboxCaptureContextValue {
  // Lo llama QuickCapture (botón flotante/atajo global) justo tras crear la
  // tarea en el servidor.
  notifyCaptured: (task: TaskWithProject) => void;
  // Lo usan las pantallas que muestran la Bandeja (BandejaClient,
  // PlanWeekClient) para añadir la tarea a su propia lista al instante, sin
  // esperar a un recargado — QuickCapture vive en el layout, fuera de su
  // árbol, así que no hay una prop que se la pase directamente.
  subscribe: (listener: Listener) => () => void;
}

const InboxCaptureContext = createContext<InboxCaptureContextValue | null>(null);

export function InboxCaptureProvider({ children }: { children: React.ReactNode }) {
  const listenersRef = useRef<Set<Listener>>(new Set());

  const notifyCaptured = useCallback((task: TaskWithProject) => {
    listenersRef.current.forEach((listener) => listener(task));
  }, []);

  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  return <InboxCaptureContext.Provider value={{ notifyCaptured, subscribe }}>{children}</InboxCaptureContext.Provider>;
}

export function useInboxCapture() {
  const ctx = useContext(InboxCaptureContext);
  if (!ctx) throw new Error('useInboxCapture debe usarse dentro de InboxCaptureProvider');
  return ctx;
}
