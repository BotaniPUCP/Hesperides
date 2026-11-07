'use client';

import { Breadcrumb, EmptyState, LoadingSkeleton } from '@/components/ui';
import { usePlace } from '@/hooks/usePlaces';
import { useRememberedHref } from '@/hooks/useRememberedHref';
import { PlaceForm } from './PlaceForm';
import { useCanEditPlaces } from './useCanEditPlaces';

/** Alta (sin `code`) o edición de un lugar. Solo para quien puede editar el catálogo. */
export function PlaceFormScreen({ code, defaultName }: { code?: string; defaultName?: string }) {
  const canEdit = useCanEditPlaces();
  const { place, loading } = usePlace(code);
  const catalog = { label: 'Lugares', href: useRememberedHref('/lugares') };

  if (!canEdit) {
    return <EmptyState title="Sin permiso" description="Solo administración y coordinación editan el catálogo de lugares." />;
  }
  if (code && loading) return <LoadingSkeleton variant="card" count={2} />;
  if (code && !place) return <EmptyState title="Lugar no encontrado" description="El lugar no está en el catálogo." />;

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        items={place ? [catalog, { label: place.name, href: `/lugares/${place.code}` }, { label: 'Editar' }] : [catalog, { label: 'Nuevo lugar' }]}
      />
      <h1 className="surface-card text-2xl font-extrabold tracking-tight text-neutral-900">{place ? `Editar ${place.name}` : 'Nuevo lugar'}</h1>
      <PlaceForm place={place ?? undefined} defaultName={defaultName} />
    </div>
  );
}
