'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { RetiredSpecimen, Species } from '@shared/types';
import { Badge, ImagePlaceholder } from '@/components/ui';

export interface RetiredSpecimenCardProps {
  specimen: RetiredSpecimen;
  species?: Pick<Species, 'slug' | 'commonName' | 'vegetationTypeCode'> & {
    imageUrl?: string | null;
    vegetationTypeName?: string;
  };
}

export function RetiredSpecimenCard({ specimen, species }: RetiredSpecimenCardProps) {
  const [speciesError, setSpeciesError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const fallbackSrc = species?.imageUrl && !speciesError ? species.imageUrl : null;
  const itemTypeCode = species?.vegetationTypeCode || 'TREE';
  const detailUrl = `/catastro/ejemplares/${specimen.code}`;

  const formattedDate = specimen.retiredAt
    ? new Date(specimen.retiredAt).toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Link
      href={detailUrl}
      className="group block focus:outline-hidden focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 rounded-2xl transition-all duration-300 hover:-translate-y-1"
    >
      <div className="overflow-hidden border border-neutral-200/90 bg-neutral-0 shadow-xs transition-all duration-300 group-hover:shadow-lg group-hover:shadow-neutral-900/5 group-hover:border-neutral-300/90 flex flex-col h-full rounded-2xl">
        {/* Cabecera con foto/placeholder e insignia de retiro */}
        <div className="relative h-40 w-full overflow-hidden bg-neutral-100 shrink-0">
          {fallbackSrc ? (
            <>
              {!imageLoaded && <div className="absolute inset-0 bg-neutral-200/70 animate-pulse" />}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fallbackSrc}
                alt={`Ejemplar retirado ${specimen.code}`}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onLoad={() => setImageLoaded(true)}
                onError={() => setSpeciesError(true)}
                className={`h-full w-full object-cover transition-[opacity,transform] duration-300 ease-out group-hover:scale-105 filter grayscale-[30%] ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
              <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-neutral-900/75 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-2xs">
                Foto referencial
              </span>
            </>
          ) : (
            <div className="h-full w-full bg-neutral-100 flex flex-col items-center justify-center gap-1 text-neutral-400">
              <svg className="w-8 h-8 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-medium text-neutral-400">Sin fotografía</span>
            </div>
          )}

          {/* Badge superior de tipo */}
          <div className="absolute top-2.5 right-2.5 shadow-2xs">
            <Badge label={specimen.vegetationType || 'Ejemplar'} color="neutral" />
          </div>
        </div>

        {/* Información del ejemplar retirado */}
        <div className="p-4 flex flex-col flex-1 justify-between gap-3">
          <div className="space-y-1.5">
            {/* Código oficial */}
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-mono font-bold text-base text-neutral-900 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors duration-200 whitespace-nowrap shrink-0 leading-snug">
                {specimen.code}
              </h3>
              {specimen.interventionsCount > 0 && (
                <span className="text-[11px] font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full shrink-0">
                  {specimen.interventionsCount} {specimen.interventionsCount === 1 ? 'intervención' : 'intervenciones'}
                </span>
              )}
            </div>

            {/* Nombre común */}
            <p className="text-sm font-semibold text-neutral-800 line-clamp-1">
              {specimen.commonName || 'Ejemplar botánico'}
            </p>

            {/* Nombre científico */}
            {specimen.scientificName && (
              <p className="text-xs italic text-neutral-500 font-serif line-clamp-1">
                {specimen.scientificName}
              </p>
            )}

            {/* Datos de retiro */}
            <div className="mt-2 pt-2 border-t border-neutral-100 text-xs space-y-1">
              {formattedDate && (
                <div className="text-neutral-600 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-500 font-medium shrink-0">Fecha de retiro:</span>
                    <span className="font-medium whitespace-nowrap text-neutral-800">{formattedDate}</span>
                  </div>
                  {specimen.retiredByName && (
                    <div className="flex items-center gap-1 text-neutral-600 min-w-0" title={`Registrado por: ${specimen.retiredByName}`}>
                      <span className="text-neutral-500 font-medium shrink-0">Registrado por:</span>
                      <span className="font-medium text-neutral-800 truncate">{specimen.retiredByName}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Pie de tarjeta: Ubicación y Referencia de campo original */}
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
