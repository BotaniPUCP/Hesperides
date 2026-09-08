import { cn } from '@/lib/cn';

export interface LoadingSkeletonProps {
  variant?: 'text' | 'card' | 'table-row' | 'avatar' | 'map';
  count?: number;
  className?: string;
}

const VARIANTS: Record<NonNullable<LoadingSkeletonProps['variant']>, string> = {
  text: 'h-4 w-full rounded',
  card: 'h-32 w-full rounded-lg',
  'table-row': 'h-12 w-full rounded',
  avatar: 'h-10 w-10 rounded-full',
  map: 'h-96 w-full rounded-lg',
};

export function LoadingSkeleton({ variant = 'text', count = 1, className }: LoadingSkeletonProps) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="flex flex-col gap-2">
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          data-testid="skeleton-item"
          className={cn('animate-pulse bg-neutral-200', VARIANTS[variant], className)}
        />
      ))}
    </div>
  );
}
