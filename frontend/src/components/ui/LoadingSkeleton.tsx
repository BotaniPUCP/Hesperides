export interface LoadingSkeletonProps {
  variant?: 'text' | 'card' | 'table-row' | 'avatar' | 'map';
  count?: number;
  className?: string;
}

const variantClasses: Record<NonNullable<LoadingSkeletonProps['variant']>, string> = {
  text: 'h-4 w-full',
  card: 'h-32 w-full rounded-lg',
  'table-row': 'h-12 w-full',
  avatar: 'h-12 w-12 rounded-full',
  map: 'h-64 w-full',
};

export function LoadingSkeleton({
  variant = 'text',
  count = 1,
  className = '',
}: LoadingSkeletonProps) {
  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Cargando">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`animate-pulse bg-slate-200 ${variantClasses[variant]} ${className}`}
        />
      ))}
      <span className="sr-only">Cargando…</span>
    </div>
  );
}