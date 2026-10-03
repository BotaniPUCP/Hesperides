'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb, EmptyState, LoadingSkeleton } from '@/components/ui';
import { usePlace } from '@/hooks/usePlaces';
import { PerspectiveList } from './PerspectiveList';
import { PhotoStrip } from './PhotoStrip';
import { PlaceGallery, type GalleryState } from './PlaceGallery';
import { PlaceHeader } from './PlaceHeader';
import { PlaceMiniMap } from './PlaceMiniMap';

const CATALOG = { label: 'Lugares', href: '/lugares' };

/** La ficha de un lugar: foto principal, perspectivas en el mapa y fotos por vista. */
export function PlaceDetailScreen({ code }: { code: string }) {
  const router = useRouter();
  const { place, loading, errorMessage } = usePlace(code);
  const [focused, setFocused] = useState<number | null>(null);
  const [gallery, setGallery] = useState<GalleryState | null>(null);

  if (loading) return <LoadingSkeleton variant="card" count={3} />;
  if (!place) {
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb items={[CATALOG, { label: 'No encontrado' }]} />
        <EmptyState
          title={errorMessage ? 'No se pudo cargar el lugar' : 'Lugar no encontrado'}
          description={errorMessage ?? 'El lugar no está en el catálogo o fue dado de baja.'}
          action={{ label: 'Volver al catálogo', onClick: () => router.push('/lugares') }}
        />
      </div>
    );
  }

  const outdoor = place.kind.code === 'OUTDOOR';
  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb items={[CATALOG, ...(place.parent ? [{ label: place.parent.name, href: `/lugares/${place.parent.code}` }] : []), { label: place.name }]} />
      <PlaceHeader place={place} onOpenMain={(i) => setGallery({ photos: place.mainPhotos, subject: place.name, startAt: i })} />

      {outdoor && (
        <section className="grid gap-5 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-lg font-bold text-neutral-900">Perspectivas</h2>
            <PerspectiveList
              perspectives={place.perspectives}
              focused={focused}
              onFocus={setFocused}
              onOpenPhoto={(v, i) => setGallery({ photos: v.photos, subject: v.displayName, startAt: i })}
            />
          </div>
          <div className="lg:sticky lg:top-4 lg:self-start">
            <PlaceMiniMap place={place} focusedPerspective={focused} />
          </div>
        </section>
      )}

      {place.interior.map((g) => (
        <section key={g.view.code} className="rounded-xl border border-neutral-200 bg-neutral-0 p-4">
          <h2 className="mb-2 text-base font-semibold text-neutral-900">{g.view.label}</h2>
          <PhotoStrip
            photos={g.photos}
            subject={`${g.view.label} de ${place.name}`}
            onOpen={(i) => setGallery({ photos: g.photos, subject: `${g.view.label} de ${place.name}`, startAt: i })}
          />
        </section>
      ))}

      {gallery && <PlaceGallery gallery={gallery} onClose={() => setGallery(null)} />}
    </div>
  );
}
