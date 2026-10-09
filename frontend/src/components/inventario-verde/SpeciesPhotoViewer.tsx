'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SpeciesPhoto } from '@shared/types';

export interface SpeciesPhotoViewerProps {
  photos: SpeciesPhoto[];
  startAt: number;
  speciesName: string;
  onClose: () => void;
}

/** «Foto: autor · licencia», con lo que exista. Null si la foto no trae crédito. */
function credito(photo: SpeciesPhoto): string | null {
  const partes = [photo.author, photo.license].filter(Boolean);
  return partes.length > 0 ? `Foto: ${partes.join(' · ')}` : null;
}

function Flecha({ direccion, onClick }: { direccion: 'anterior' | 'siguiente'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direccion === 'anterior' ? 'Foto anterior' : 'Foto siguiente'}
      className="rounded-full bg-neutral-0/90 p-2 text-neutral-800 shadow-sm hover:bg-neutral-0 focus:outline-none focus:ring-2 focus:ring-brand-600"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d={direccion === 'anterior' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
        />
      </svg>
    </button>
  );
}

/**
 * Galería a pantalla completa de las fotos genéricas de una especie (SPEC-104 §5.2).
 * Muestra la versión reducida (1600 px) y, debajo, el crédito que exigen las
 * licencias CC BY y CC BY-SA (D-04).
 */
export function SpeciesPhotoViewer({ photos, startAt, speciesName, onClose }: SpeciesPhotoViewerProps) {
  const [actual, setActual] = useState(startAt);
  const varias = photos.length > 1;
  const mover = useCallback(
    (paso: number) => setActual((i) => (i + paso + photos.length) % photos.length),
    [photos.length],
  );

  useEffect(() => {
    const teclas = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (varias && e.key === 'ArrowRight') mover(1);
      if (varias && e.key === 'ArrowLeft') mover(-1);
    };
    window.addEventListener('keydown', teclas);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', teclas);
      document.body.style.overflow = '';
    };
  }, [onClose, mover, varias]);

  const foto = photos[actual];
  const textoCredito = credito(foto);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Fotos de ${speciesName}`}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-ink/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar galería"
        className="absolute right-4 top-4 rounded-lg p-1.5 text-white/90 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-600"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="relative flex w-full max-w-5xl items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={foto.imageUrl}
          alt={`${speciesName}, foto ${actual + 1} de ${photos.length}`}
          className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
        />
        {varias && (
          <>
            <div className="absolute left-2 top-1/2 -translate-y-1/2">
              <Flecha direccion="anterior" onClick={() => mover(-1)} />
            </div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Flecha direccion="siguiente" onClick={() => mover(1)} />
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col items-center gap-1 text-center" onClick={(e) => e.stopPropagation()}>
        {varias && <span className="text-xs font-medium text-white/80">{`${actual + 1} / ${photos.length}`}</span>}
        {(textoCredito || foto.sourceUrl) && (
          <p className="text-xs text-white/90">
            {textoCredito}
            {textoCredito && foto.sourceUrl && ' · '}
            {foto.sourceUrl && (
              <a href={foto.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                Ver fuente
              </a>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
