import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeColor = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
  label: string;
  color?: BadgeColor;
  icon?: ReactNode;
  className?: string;
}

const COLORS: Record<BadgeColor, string> = {
  neutral: 'bg-neutral-100 text-neutral-700',
  brand: 'bg-brand-50 text-brand-900',
  success: 'bg-brand-100 text-success-600',
  warning: 'bg-status-in-review-bg text-status-in-review-fg',
  danger: 'bg-urgency-critical-bg text-action-danger',
  info: 'bg-status-in-progress-bg text-info-600',
};

/** Etiqueta genérica. Para estados de flujo o urgencia usar StatusBadge/UrgencyBadge. */
export function Badge({ label, color = 'neutral', icon, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        COLORS[color],
        className,
      )}
    >
      {icon}
      {label}
    </span>
  );
}
