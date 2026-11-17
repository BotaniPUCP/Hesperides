'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PlacePerspective } from '@shared/types';
import { usePageTrail } from '@/components/layouts/PageTrailContext';
import { Button, EmptyState, LoadingSkeleton } from '@/components/ui';
import { usePlace } from '@/hooks/usePlaces';
import { useRememberedHref } from '@/hooks/useRememberedHref';
import { PerspectiveEditor } from './edit/PerspectiveEditor';
import { PhotoUploader } from './edit/PhotoUploader';
import { useCanEditPlaces } from './edit/useCanEditPlaces';
import { usePlaceActions } from './edit/usePlaceActions';
import { PerspectivesSection } from './perspectives/PerspectivesSection';
import { PhotoStrip } from './PhotoStrip';
import { PlaceGallery, type GalleryState } from './PlaceGallery';
import { PlaceHeader } from './PlaceHeader';
import { usePlaceMap } from './map/PlaceMapContext';

const LIST_PATH = '/lugares';
const NEW = 'new';

/** La ficha de un lugar: foto principal, perspectivas en el mapa y fotos por vista. Quien edita, edita aquí. */
export function PlaceDetailScreen({ code, readOnly = false }: { code: string; readOnly?: boolean }) {
  const router = useRouter();
  const listHref = useRememberedHref(LIST_PATH);
  const { place, loading, errorMessage, reload } = usePlace(code);
  const canEdit = useCanEditPlaces() && !readOnly;
  const actions = usePlaceActions(place, reload);
  const [focused, setFocused] = useState<number | null>(null);
  const [gallery, setGallery] = useState<GalleryState | null>(null);
  const [editing, setEditing] = useState<PlacePerspective | typeof NEW | null>(null);
  const map = usePlaceMap();
  usePageTrail(place ? {
    labels: { [place.code]: place.name },
    parents: place.parent
      ? [{ label: place.parent.name, href: `/lugares/${place.parent.code}${readOnly ? '?soloLectura=1' : ''}` }]
      : [],
  } : {});

  // El mapa vive en el layout de /lugares: se le dice qué lugar mostrar y qué perspectiva resaltar.
  useEffect(() => {
    if (place) map.show(place, reload, readOnly);
  }, [map, place, reload, readOnly]);
  // Al abrir otro lugar no queda ninguna perspectiva resaltada.
  useEffect(() => map.focusPerspective(null), [map, code]);
  const focusOnMap = (id: number) => {
    setFocused(id);
    map.focusPerspective(id);
  };

  if (loading) return <LoadingSkeleton variant="card" count={3} />;
  if (!place) {
    return (
      <div className="space-y-6">
        <EmptyState
          title={errorMessage ? 'No se pudo cargar el lugar' : 'Lugar no encontrado'}
          description={errorMessage ?? 'El lugar no está en el catálogo o fue dado de baja.'}
          action={{ label: 'Volver al catálogo', onClick: () => router.push(listHref) }}
        />
      </div>
    );
  }

  const outdoor = place.kind.code === 'OUTDOOR';
  const onDeletePhoto = canEdit ? actions.deletePhoto : undefined;
  const open = (photos: GalleryState['photos'], subject: string) => (startAt: number) => setGallery({ photos, subject, startAt });
  const headerActions = canEdit ? (
    <>
      <Link href={`/lugares/${place.code}/editar`} className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
        Editar
      </Link>
      <Button size="sm" variant="danger" onClick={actions.deletePlace}>Eliminar</Button>
    </>
  ) : undefined;

  return (
    <div className="space-y-6">
      <PlaceHeader place={place} onOpenMain={open(place.mainPhotos, place.name)} actions={headerActions} />

      {canEdit && (
        <section className="surface-card flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900">Fotos principales</h2>
          <PhotoStrip photos={place.mainPhotos} subject={`la foto principal de ${place.name}`} onOpen={open(place.mainPhotos, place.name)} onDelete={onDeletePhoto} />
          <PhotoUploader placeCode={place.code} target={{}} label="Subir foto principal" onDone={reload} />
        </section>
      )}

      {outdoor && (
        <PerspectivesSection
          placeCode={place.code}
          perspectives={place.perspectives}
          focused={focused}
          onFocus={focusOnMap}
          onOpenPhoto={(v, i) => open(v.photos, v.displayName)(i)}
          onAdd={canEdit ? () => setEditing(NEW) : undefined}
          editing={canEdit ? {
            onEdit: setEditing,
            onDelete: actions.deletePerspective,
            onDeletePhoto: actions.deletePhoto,
            uploader: (v) => <PhotoUploader placeCode={place.code} target={{ perspectiveId: v.id }} label={`Subir fotos a ${v.displayName}`} onDone={reload} />,
          } : undefined}
        />
      )}

      {place.interior.map((g) => (
        <section key={g.view.code} className="surface-card">
          <h2 className="mb-2 text-base font-semibold text-neutral-900">{g.view.label}</h2>
          <PhotoStrip photos={g.photos} subject={`${g.view.label} de ${place.name}`} onOpen={open(g.photos, `${g.view.label} de ${place.name}`)} onDelete={onDeletePhoto} />
        </section>
      ))}
      {!outdoor && canEdit && <PhotoUploader placeCode={place.code} target={{}} askInteriorView label="Subir fotos del interior" onDone={reload} />}

      {editing !== null && (
        <PerspectiveEditor
          place={place}
          perspective={editing === NEW ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      {gallery && <PlaceGallery gallery={gallery} onClose={() => setGallery(null)} />}
      {actions.dialog}
    </div>
  );
}
