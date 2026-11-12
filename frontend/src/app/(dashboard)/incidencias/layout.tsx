import { Suspense, type ReactNode } from 'react';
import { LoadingSkeleton } from '@/components/ui';
import { IncidentAccess } from '@/components/incidents/IncidentAccess';

export default function IncidentsLayout({ children }: { children: ReactNode }) {
  return (
    <IncidentAccess>
      <Suspense fallback={<LoadingSkeleton variant="card" count={3} />}>{children}</Suspense>
    </IncidentAccess>
  );
}
