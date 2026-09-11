'use client';

import { cn } from '@/lib/cn';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  variant: ToastVariant;
  title: string;
  description?: string;
  durationMs?: number;
}

export interface ToastData extends ToastOptions {
  id: string;
}

const STYLES: Record<ToastVariant, string> = {
  success: 'border-success-600 bg-brand-50',
  error: 'border-action-danger bg-urgency-critical-bg',
  warning: 'border-warning-600 bg-status-in-review-bg',
  info: 'border-info-600 bg-status-in-progress-bg',
};

const ICONS: Record<ToastVariant, string> = {
  success:
    'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
  error:
    'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z',
  warning:
    'M8.257 3.1c.765-1.36 2.72-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM10 6a1 1 0 00-1 1v3a1 1 0 002 0V7a1 1 0 00-1-1zm0 8a1 1 0 100-2 1 1 0 000 2z',
  info: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z',
};

export function Toast({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  // error y warning usan alert: el lector de pantalla los anuncia de inmediato,
  // sin esperar a que el foco llegue. success e info no interrumpen.
  const role = toast.variant === 'error' || toast.variant === 'warning' ? 'alert' : 'status';

  return (
    <div
      role={role}
      className={cn(
        'flex w-80 items-start gap-3 rounded-lg border-l-4 bg-neutral-0 p-4 shadow-lg',
        STYLES[toast.variant],
      )}
    >
      <svg
        className="mt-0.5 h-5 w-5 shrink-0 text-neutral-700"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path fillRule="evenodd" clipRule="evenodd" d={ICONS[toast.variant]} />
      </svg>

      <div className="flex-1">
        <p className="text-sm font-semibold text-neutral-900">{toast.title}</p>
        {toast.description && <p className="mt-1 text-sm text-neutral-700">{toast.description}</p>}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Cerrar notificación"
        className="shrink-0 rounded p-0.5 text-neutral-500 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" clipRule="evenodd" d={ICONS.error} />
        </svg>
      </button>
    </div>
  );
}
