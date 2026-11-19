'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Toast } from './Toast';
import type { ToastData, ToastOptions } from './Toast';

export interface UseToastReturn {
  showToast: (options: ToastOptions) => void;
  dismissAll: () => void;
}

const DEFAULT_DURATION_MS = 5000;

const ToastContext = createContext<UseToastReturn | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (options: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((current) => [...current, { ...options, id }]);

      // durationMs 0 significa "no se autocierra": lo usan los errores que la
      // persona debe leer antes de seguir.
      const duration = options.durationMs ?? DEFAULT_DURATION_MS;
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const dismissAll = useCallback(() => setToasts([]), []);

  const value = useMemo(() => ({ showToast, dismissAll }), [showToast, dismissAll]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
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
