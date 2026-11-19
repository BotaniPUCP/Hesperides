'use client';

import { PageHeader } from '@/components/layouts/PageHeader';
import { usePageTrail } from '@/components/layouts/PageTrailContext';
import { EmptyState, LoadingSkeleton } from '@/components/ui';
import { usePlace } from '@/hooks/usePlaces';
import { PlaceForm } from './PlaceForm';
import { useCanEditPlaces } from './useCanEditPlaces';

/** Alta (sin `code`) o edición de un lugar. Solo para quien puede editar el catálogo. */
export function PlaceFormScreen({ code, defaultName, returnTo }: { code?: string; defaultName?: string; returnTo?: string }) {
  const canEdit = useCanEditPlaces();
  const { place, loading } = usePlace(code);
  usePageTrail(place ? { labels: { [place.code]: place.name } } : {});

  if (!canEdit) {
    return <EmptyState title="Sin permiso" description="Solo administración y coordinación editan el catálogo de lugares." />;
  }
  if (code && loading) return <LoadingSkeleton variant="card" count={2} />;
  if (code && !place) return <EmptyState title="Lugar no encontrado" description="El lugar no está en el catálogo." />;

  return (
    <div className="space-y-6">
      <PageHeader title={place ? `Editar ${place.name}` : 'Nuevo lugar'} />
      <PlaceForm place={place ?? undefined} defaultName={defaultName} returnTo={returnTo} />
    </div>
  );
}
