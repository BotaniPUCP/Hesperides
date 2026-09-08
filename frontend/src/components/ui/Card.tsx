'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface CardProps {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  padded?: boolean;
  onClick?: () => void;
}

export function Card({ title, actions, children, padded = true, onClick }: CardProps) {
  const interactive = Boolean(onClick);

  return (
    <div
      // Con onClick es un control real: rol, tabIndex y teclado. Un div
      // clicable sin esto es invisible para quien navega sin ratón.
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        'rounded-lg border border-neutral-200 bg-neutral-0 shadow-sm',
        padded && 'p-4',
        interactive &&
          'cursor-pointer transition-shadow hover:shadow-lg focus-visible:outline-none ' +
            'focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
      )}
    >
      {(title || actions) && (
        <div className={cn('flex items-center justify-between', padded ? 'mb-3' : 'p-4 pb-3')}>
          {title && <h3 className="text-base font-semibold text-neutral-900">{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(!padded && !title && 'p-4')}>{children}</div>
    </div>
  );
}
