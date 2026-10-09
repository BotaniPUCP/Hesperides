'use client';

import { useState } from 'react';
import type { Species } from '@shared/types';
import { ImagePlaceholder } from '@/components/ui';
import { SpeciesPhotoViewer } from './SpeciesPhotoViewer';

/** Cuántas fotos, en palabras, para el nombre accesible del botón. */
const verFotos = (n: number) => (n === 1 ? 'Ver la foto' : `Ver las ${n} fotos`);

/**
 * La foto principal de la ficha de especie (SPEC-104 §5.2). Con fotos genéricas
 * muestra «1/3» y abre la galería; sin ellas cae a la de un ejemplar y lo dice.
 */
export function SpeciesCover({ species }: { species: Species }) {
  const [imageError, setImageError] = useState(false);
  const [abierta, setAbierta] = useState(false);
  const fotos = species.photos ?? [];
  const conGaleria = fotos.length > 0;
  const visible = species.imageUrl && !imageError;

  const imagen = visible ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={species.imageUrl ?? undefined}
      alt={species.commonName}
      loading="lazy"
      onError={() => setImageError(true)}
      className="h-full w-full object-cover"
    />
  ) : (
    <ImagePlaceholder type={species.vegetationTypeCode} label={species.commonName} size="full" className="rounded-none border-none" />
  );

  return (
    <div className="relative h-28 w-28 sm:h-32 sm:w-36 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0 border border-neutral-200/90 shadow-2xs">
      {conGaleria ? (
        <button
          type="button"
          onClick={() => setAbierta(true)}
          aria-label={verFotos(fotos.length)}
          className="block h-full w-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-brand-600"
        >
          {imagen}
        </button>
      ) : (
        imagen
      )}

      {visible && species.imageSource === 'SPECIMEN' && (
        <div className="pointer-events-none absolute bottom-1.5 left-1.5 right-1.5">
          <span className="block text-center truncate px-1.5 py-0.5 rounded bg-ink/80 backdrop-blur-xs text-[10px] font-medium text-white">
            Foto de un ejemplar
          </span>
        </div>
      )}

      {fotos.length > 1 && (
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded bg-ink/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {`1/${fotos.length}`}
        </span>
      )}

      {abierta && (
        <SpeciesPhotoViewer photos={fotos} startAt={0} speciesName={species.commonName} onClose={() => setAbierta(false)} />
      )}
    </div>
  );
}
