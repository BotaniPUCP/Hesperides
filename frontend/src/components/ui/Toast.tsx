'use client';

import { useId } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  variant: ToastVariant;
  title: string;
  description?: string;
  durationMs?: number;
}

export interface ToastInstance extends ToastOptions {
  key: string;
}

export interface UseToastReturn {
  showToast: (options: ToastOptions) => void;
  dismissAll: () => void;
}

const variantStyles: Record<ToastVariant, { border: string; color: string }> = {
  success: { border: 'border-green-600', color: 'text-green-600' },
  error: { border: 'border-red-600', color: 'text-red-600' },
  warning: { border: 'border-amber-500', color: 'text-amber-500' },
  info: { border: 'border-sky-600', color: 'text-sky-600' },
};

function ToastIcon({ variant }: { variant: ToastVariant }) {
  const className = 'h-5 w-5 shrink-0';
  const color = { color: variantStyles[variant].color, className };
  switch (variant) {
    case 'success':
      return (
        <svg {...color} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'error':
      return (
        <svg {...color} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'warning':
      return (
        <svg {...color} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625l6.28-10.875ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'info':
      return (
        <svg {...color} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm.75 5.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.25 9.5a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-1.5 0V9.5Z" />
        </svg>
      );
  }
}

export function ToastView({ toast }: { toast: ToastInstance }) {
  const titleId = useId();
  return (
    <div
      role="status"
      aria-labelledby={titleId}
      className={`pointer-events-auto flex max-w-sm items-start gap-3 rounded-lg border-l-4 bg-white p-4 shadow-lg
        ${variantStyles[toast.variant].border}`}
    >
      <ToastIcon variant={toast.variant} />
      <div className="min-w-0">
        <p id={titleId} className="text-sm font-semibold text-slate-900">
          {toast.title}
        </p>
        {toast.description && (
          <p className="mt-0.5 text-sm text-slate-500">{toast.description}</p>
        )}
      </div>
    </div>
  );
}