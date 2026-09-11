import { cn } from '@/lib/cn';

export type UrgencyCode = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface UrgencyBadgeProps {
  code: UrgencyCode;
  label: string;
}

const URGENCY_COLORS: Record<UrgencyCode, string> = {
  LOW: 'bg-urgency-low-bg text-urgency-low-fg',
  MEDIUM: 'bg-urgency-medium-bg text-urgency-medium-fg',
  HIGH: 'bg-urgency-high-bg text-urgency-high-fg',
  CRITICAL: 'bg-urgency-critical-bg text-urgency-critical-fg',
};

export function UrgencyBadge({ code, label }: UrgencyBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        URGENCY_COLORS[code],
      )}
    >
      {/* CRITICAL añade ícono: el color solo no basta para quien no lo distingue. */}
      {code === 'CRITICAL' && (
        <svg
          data-testid="urgency-critical-icon"
          className="h-3 w-3"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M8.257 3.1c.765-1.36 2.72-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM10 6a1 1 0 00-1 1v3a1 1 0 002 0V7a1 1 0 00-1-1zm0 8a1 1 0 100-2 1 1 0 000 2z"
          />
        </svg>
      )}
      {label}
    </span>
  );
}
