import { Suspense, type ReactNode } from 'react';
import { LoadingSkeleton } from '@/components/ui';

/** The screen reads the tab from the URL with useSearchParams, which needs a Suspense boundary to build. */
export default function ReportsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl">
      <Suspense fallback={<LoadingSkeleton variant="card" count={3} />}>{children}</Suspense>
    </div>
  );
}
