import { cn } from '@/lib/cn';

export interface StatusBadgeProps {
  code: string;
  label: string;
  showIcon?: boolean;
}

/**
 * El color lo resuelve este componente, nunca la feature que lo usa: así
 * "resuelta" es del mismo verde en toda la aplicación (SPEC-C01 §4.9).
 */
const STATUS_COLORS: Record<string, string> = {
  PLANNED: 'bg-neutral-100 text-neutral-700',
  OBSERVED: 'bg-alert-warning-bg text-alert-warning-fg',
  VALIDATED: 'bg-status-resolved-bg text-status-resolved-fg',
  CANCELLED: 'bg-alert-danger-bg text-alert-danger-fg',
  PENDING_APPROVAL: 'bg-status-in-review-bg text-status-in-review-fg',
  OPEN: 'bg-status-reported-bg text-status-reported-fg',
  ASSIGNED: 'bg-status-reported-bg text-status-reported-fg',
  COMPLETED: 'bg-status-resolved-bg text-status-resolved-fg',
  REPORTED: 'bg-status-reported-bg text-status-reported-fg',
  IN_REVIEW: 'bg-status-in-review-bg text-status-in-review-fg',
  IN_PROGRESS: 'bg-status-in-progress-bg text-status-in-progress-fg',
  RESOLVED: 'bg-status-resolved-bg text-status-resolved-fg',
};

const UNKNOWN_STATUS = 'bg-neutral-100 text-neutral-700';

const STATUS_ICONS: Record<string,string> = {
  PLANNED:'◷', ASSIGNED:'→', IN_PROGRESS:'▶', COMPLETED:'✓', VALIDATED:'✔', OBSERVED:'!', CANCELLED:'×',
};

export function StatusBadge({ code, label, showIcon = false }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        // Un catálogo configurable puede crecer con codes que este spec no
        // contempla: se degrada a neutro legible en vez de quedar sin color.
        STATUS_COLORS[code] ?? UNKNOWN_STATUS,
      )}
    >
      {showIcon && STATUS_ICONS[code] && <span aria-hidden="true">{STATUS_ICONS[code]}</span>}
      {label}
    </span>
  );
}
