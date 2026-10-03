'use client';

import type { PlacePhoto } from '@shared/types';

export interface PhotoStripProps {
  photos: PlacePhoto[];
  /** Nombre de lo que muestran, para el texto accesible de cada miniatura. */
  subject: string;
  onOpen: (index: number) => void;
  /** Solo para quien edita: muestra una × sobre cada miniatura. */
  onDelete?: (photo: PlacePhoto) => void;
}

/** Fila de miniaturas; cada una abre la galería en esa foto. */
export function PhotoStrip({ photos, subject, onOpen, onDelete }: PhotoStripProps) {
  if (photos.length === 0) {
    return <p className="text-xs italic text-neutral-500">Sin fotos todavía</p>;
  }
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {photos.map((p, i) => (
        <div key={p.id} className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => onOpen(i)}
            aria-label={`Abrir foto ${i + 1} de ${subject}`}
            className="block h-20 w-28 overflow-hidden rounded-md border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(p)}
              aria-label={`Eliminar foto ${i + 1} de ${subject}`}
              className="absolute right-1 top-1 rounded-full bg-neutral-900/70 px-1.5 text-xs text-neutral-0 hover:bg-red-700"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
