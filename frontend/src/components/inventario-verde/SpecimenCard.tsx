'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Species, Specimen } from '@shared/types';
import { Badge, ImagePlaceholder } from '@/components/ui';

export interface SpecimenCardProps {
  specimen: Specimen;
  species?: Pick<Species, 'slug' | 'commonName' | 'vegetationTypeCode'> & {
    imageUrl?: string | null;
    vegetationTypeName?: string;
  };
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (code: string) => void;
}

const VEGETATION_TYPE_FALLBACK: Record<string, string> = {
  TREE: 'Árbol',
  PALM: 'Palmera',
  SHRUB: 'Arbusto',
  HERB: 'Herbácea',
  HERBACEOUS: 'Herbácea',
  BAMBOO: 'Bambú',
  CACTUS: 'Cactus',
  SUCCULENT: 'Suculenta',
  FERN: 'Helecho',
  VINE: 'Enredadera',
  OTHER: 'Vegetación',
};

export function SpecimenCard({
  specimen,
  species,
  selectable = false,
  isSelected = false,
  onToggleSelect,
}: SpecimenCardProps) {
  const [imageError, setImageError] = useState(false);
  const [speciesError, setSpeciesError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const thumbSrc = specimen.thumbnailUrl ? specimen.thumbnailUrl.replace(/sz=w\d+/, 'sz=w400') : null;
  const fallbackSrc = species?.imageUrl && !speciesError ? species.imageUrl : null;
  const isUsingFallback = (!thumbSrc || imageError) && Boolean(fallbackSrc);
  const displaySrc = thumbSrc && !imageError ? thumbSrc : fallbackSrc;
  const itemSlug = specimen.speciesSlug || species?.slug;
  const itemTypeCode = species?.vegetationTypeCode || 'TREE';
  const typeBadgeLabel =
    species?.vegetationTypeName || VEGETATION_TYPE_FALLBACK[itemTypeCode] || 'Ejemplar';

  const detailUrl = `/catastro/ejemplares/${specimen.code}`;

  return (
    <Link
      href={detailUrl}
      className="group block focus:outline-hidden focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 rounded-2xl transition-all duration-300 hover:-translate-y-1"
    >
      <div
        className={`overflow-hidden border bg-neutral-0 shadow-xs transition-all duration-300 group-hover:shadow-lg group-hover:shadow-neutral-900/5 flex flex-col h-full rounded-2xl ${
          isSelected
            ? 'border-forest-600 ring-2 ring-forest-500/25 shadow-md bg-forest-50/10'
            : 'border-neutral-200/90 group-hover:border-neutral-300/90'
        }`}
      >
        {/* Foto a sangre con altura equilibrada de 176px (h-44), idéntica a SpeciesCard */}
        <div className="relative h-44 w-full overflow-hidden bg-neutral-100 shrink-0">
          {/* Checkbox de selección múltiple (para roles autorizados como ADMIN / COORDINADOR) */}
          {selectable && (
            <div
              className={`absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-md flex items-center justify-center transition-all duration-150 cursor-pointer ${
                isSelected
                  ? 'bg-forest-600 border-2 border-white ring-1 ring-forest-700 shadow-xs'
                  : 'bg-white border-2 border-neutral-400 hover:border-neutral-600 shadow-xs'
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSelect?.(specimen.code);
              }}
            >
              <input
                type="checkbox"
                aria-label={`Seleccionar ejemplar ${specimen.code}`}
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleSelect?.(specimen.code);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="sr-only"
              />
              {isSelected && (
                <svg
                  className="w-3.5 h-3.5 text-white stroke-[3] pointer-events-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          )}
          {displaySrc ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 bg-neutral-200/70 animate-pulse" />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displaySrc}
                alt={`Ejemplar ${specimen.code}`}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  if (thumbSrc && !imageError) {
                    setImageError(true);
                  } else {
                    setSpeciesError(true);
                  }
                }}
                className={`h-full w-full object-cover transition-[opacity,transform] duration-300 ease-out group-hover:scale-105 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
              {isUsingFallback && (
                <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-neutral-900/75 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-2xs">
                  Foto referencial
                </span>
              )}
            </>
          ) : (
            <ImagePlaceholder
              type={itemTypeCode}
              label={specimen.code}
              size="full"
              className="rounded-none border-none transition-transform duration-300 ease-out group-hover:scale-105"
            />
          )}

          {/* Badge de tipo de vegetación en la esquina superior derecha, consistente con SpeciesCard */}
          <div className="absolute top-2.5 right-2.5">
            <Badge
              label={typeBadgeLabel}
              className="bg-neutral-0/95 text-neutral-800 border border-neutral-200/90 backdrop-blur-xs shadow-2xs font-medium"
            />
          </div>
        </div>

        {/* Información del ejemplar con jerarquía limpia */}
        <div className="p-4 flex flex-col flex-1 justify-between gap-3">
          <div className="space-y-1">
            {/* Código oficial como título principal del ejemplar */}
            <h3 className="font-mono font-bold text-base text-neutral-900 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors duration-200 line-clamp-1 leading-snug">
              {specimen.code}
            </h3>

            {/* Nombre común de la especie */}
            <p className="text-sm font-semibold text-neutral-800 line-clamp-1">
              {specimen.speciesCommonName || species?.commonName || 'Ejemplar botánico'}
            </p>

            {/* Nombre científico en cursiva */}
            {specimen.speciesScientificName && (
              <p className="text-xs italic text-neutral-500 font-serif line-clamp-1">
                {specimen.speciesScientificName}
              </p>
            )}
          </div>

          {/* Pie de tarjeta: Ubicación y Referencia de campo */}
          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <div className="flex items-center gap-1.5 truncate min-w-0" title={specimen.sourceLocation || 'Campus PUCP'}>
              <span aria-hidden="true" className="text-neutral-400 shrink-0">📍</span>
              <span className="truncate text-neutral-600 font-medium">
                {specimen.sourceLocation || 'Campus PUCP'}
              </span>
            </div>
            {specimen.sourceReference && (
              <span className="shrink-0 text-neutral-400 font-mono text-[11px] ml-2">
                Ref: {specimen.sourceReference}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
