'use client';

import type { PlacePhoto } from '@shared/types';
import { SpeciesPhotoViewer } from '@/components/inventario-verde/SpeciesPhotoViewer';

export interface GalleryState {
  photos: PlacePhoto[];
  subject: string;
  startAt: number;
}

/**
 * La galería a pantalla completa del inventario, con las fotos de un lugar. El
 * crédito de una foto propia es solo su autor: no hay licencia ni fuente externa.
 */
export function PlaceGallery({ gallery, onClose }: { gallery: GalleryState; onClose: () => void }) {
  return (
    <SpeciesPhotoViewer
      photos={gallery.photos.map((p) => ({
        thumbnailUrl: p.thumbnailUrl,
        imageUrl: p.fullUrl,
        author: p.author,
        license: null,
        sourceUrl: null,
      }))}
      startAt={gallery.startAt}
      speciesName={gallery.subject}
      onClose={onClose}
    />
  );
}
