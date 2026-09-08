import { cn } from '@/lib/cn';

export interface StatusBadgeProps {
  code: string;
  label: string;
}

/**
 * El color lo resuelve este componente, nunca la feature que lo usa: así
 * "resuelta" es del mismo verde en toda la aplicación (SPEC-C01 §4.9).
 */
const STATUS_COLORS: Record<string, string> = {
  REPORTED: 'bg-status-reported-bg text-status-reported-fg',
  IN_REVIEW: 'bg-status-in-review-bg text-status-in-review-fg',
  IN_PROGRESS: 'bg-status-in-progress-bg text-status-in-progress-fg',
  RESOLVED: 'bg-status-resolved-bg text-status-resolved-fg',
};

const UNKNOWN_STATUS = 'bg-neutral-100 text-neutral-700';

export function StatusBadge({ code, label }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        // Un catálogo configurable puede crecer con codes que este spec no
        // contempla: se degrada a neutro legible en vez de quedar sin color.
        STATUS_COLORS[code] ?? UNKNOWN_STATUS,
      )}
    >
      {label}
    </span>
  );
}
