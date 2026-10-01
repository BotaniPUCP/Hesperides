'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Species } from '@shared/types';
import { Card, Badge, ImagePlaceholder } from '@/components/ui';

export interface SpeciesCardProps {
  species: Species;
}

function getBadgeColor(typeCode: string): 'neutral' | 'brand' | 'success' | 'warning' | 'info' {
  switch (typeCode) {
    case 'PALM':
      return 'info';
    case 'SHRUB':
      return 'warning';
    case 'HERBACEOUS':
    case 'CLIMBER':
    case 'SUCCULENT':
      return 'neutral';
    case 'TREE':
    default:
      return 'success';
  }
}

export function SpeciesCard({ species }: SpeciesCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <Link
      href={`/inventario-verde/especies/${species.slug}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 rounded-xl transition-transform duration-200 hover:-translate-y-1"
    >
      <Card
        padded={false}
        className="overflow-hidden border-neutral-200 bg-neutral-0 shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:border-brand-600 flex flex-col h-full"
      >
        {/* Imagen del espécimen o placeholder */}
        <div className="relative h-44 w-full overflow-hidden bg-neutral-100 flex-shrink-0">
          {species.imageUrl && !imageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={species.imageUrl}
              alt={species.commonName}
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <ImagePlaceholder
              type={species.vegetationTypeCode}
              label={species.commonName}
              size="full"
              className="rounded-none border-none"
            />
          )}

          {/* Badge flotante de tipo de vegetación */}
          <div className="absolute top-2.5 right-2.5">
            <Badge
              label={species.vegetationTypeName}
              color={getBadgeColor(species.vegetationTypeCode)}
            />
          </div>

          {/* Indicador de fotografía provisional */}
          {species.imageUrl && !imageError && (
            <div className="absolute bottom-2 left-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-neutral-900/80 backdrop-blur-sm text-[11px] font-medium text-neutral-0">
                Foto de un ejemplar
              </span>
            </div>
          )}
        </div>

        {/* Información taxonómica */}
        <div className="p-4 flex flex-col flex-1 justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-neutral-900 group-hover:text-brand-700 transition-colors line-clamp-1">
              {species.commonName}
            </h3>
            <p className="text-xs italic text-neutral-500 font-serif line-clamp-1 mt-0.5">
              {species.scientificName}
            </p>
            {species.family && (
              <span className="inline-block mt-1 text-[11px] text-neutral-500 font-medium">
                Fam. {species.family}
              </span>
            )}
          </div>

          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-700">
            <div className="flex items-center gap-1.5 font-medium">
              <svg className="w-4 h-4 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span>{species.specimenCount} {species.specimenCount === 1 ? 'ejemplar' : 'ejemplares'}</span>
            </div>

            <span className="text-brand-700 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 text-xs">
              Ver detalle
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
