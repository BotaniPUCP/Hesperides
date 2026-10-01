'use client';

import { useEffect, useState } from 'react';
import type { Species, Specimen } from '@shared/types';
import { ImagePlaceholder } from '@/components/ui';

export interface SpecimenPhotoModalProps {
  specimen: Specimen | null;
  species: Pick<Species, 'slug' | 'commonName' | 'vegetationTypeCode'>;
  onClose: () => void;
}

/**
 * Visor Lightbox enfocado exclusivamente en la visualización de la fotografía del ejemplar.
 * No repite la ficha técnica ni los datos que ya están en la tabla.
 */
export function SpecimenPhotoModal({ specimen, species, onClose }: SpecimenPhotoModalProps) {
  const [imgError, setImgError] = useState(false);

  // Cerrar al presionar Escape
  useEffect(() => {
    if (!specimen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [specimen, onClose]);

  // Bloquear scroll del fondo
  useEffect(() => {
    if (specimen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [specimen]);

  if (!specimen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-neutral-900/40 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full bg-neutral-0 rounded-2xl overflow-hidden shadow-xl border border-neutral-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera integrada: únicamente "Referencia · Nombre común" y botón cerrar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 bg-neutral-50/60">
          <h3
            className="font-medium text-sm sm:text-base text-neutral-900 truncate pr-3"
            id="lightbox-title"
          >
            <span className="font-mono font-bold text-neutral-900">{specimen.code}</span>
            {species.commonName && (
              <>
                <span className="text-neutral-400 mx-2 select-none">·</span>
                <span className="text-neutral-700">{species.commonName}</span>
              </>
            )}
          </h3>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar vista previa"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-600 flex-shrink-0"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Contenedor principal de la fotografía: centrada, márgenes cómodos, object-contain, fondo claro */}
        <div className="relative bg-neutral-50/50 flex items-center justify-center min-h-[260px] max-h-[65vh] p-4 sm:p-6">
          {specimen.thumbnailUrl && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={specimen.thumbnailUrl}
              alt={`${specimen.code}${species.commonName ? ` · ${species.commonName}` : ''}`}
              onError={() => setImgError(true)}
              className="max-h-[56vh] w-auto max-w-full object-contain mx-auto rounded-lg shadow-xs"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-neutral-500 text-center">
              <ImagePlaceholder
                type={species.vegetationTypeCode}
                size="lg"
                label=""
              />
              <p className="text-xs text-neutral-700 font-medium mt-3">Fotografía no disponible</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                No se dispone de una fotografía de referencia para este ejemplar.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
