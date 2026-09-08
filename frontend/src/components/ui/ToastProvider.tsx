'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ToastView } from './Toast';
import type { ToastInstance, ToastOptions, UseToastReturn } from './Toast';

const ToastContext = createContext<UseToastReturn | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastInstance[]>([]);
  const nextKey = useRef(0);

  const showToast = useCallback((options: ToastOptions) => {
    const key = String(nextKey.current++);
    setToasts((current) => [...current, { ...options, key }]);

    const duration = options.durationMs ?? 5000;
    if (duration > 0) {
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.key !== key));
      }, duration);
    }
  }, []);

  const dismissAll = useCallback(() => setToasts([]), []);

  const value = useMemo(() => ({ showToast, dismissAll }), [showToast, dismissAll]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      >
        {toasts.map((toast) => (
          <ToastView key={toast.key} toast={toast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): UseToastReturn {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error('useToast debe usarse dentro de un ToastProvider');
  }
  return context;
}