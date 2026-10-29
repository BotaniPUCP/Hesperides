'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Species } from '@shared/types';
import { Badge, Card, ImagePlaceholder } from '@/components/ui';

export interface SpeciesCardProps {
  species: Species;
}

export function SpeciesCard({ species }: SpeciesCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Optimizar miniaturas de Drive de 1000px a 400px para tarjetas de ~250px
  const optimizedImageUrl = species.imageUrl ? species.imageUrl.replace(/sz=w\d+/, 'sz=w400') : null;

  return (
    <Link
      href={`/inventario-verde/especies/${species.slug}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 rounded-2xl transition-all duration-300 hover:-translate-y-1"
    >
      <div className="overflow-hidden border border-neutral-200/90 bg-neutral-0 shadow-xs transition-all duration-300 group-hover:shadow-lg group-hover:shadow-neutral-900/5 group-hover:border-neutral-300/90 flex flex-col h-full rounded-2xl">
        {/* Imagen a sangre (flush con los bordes superiores y laterales) */}
        <div className="relative h-44 w-full overflow-hidden bg-neutral-100 flex-shrink-0">
          {optimizedImageUrl && !imageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={(img) => {
                if (img?.complete && !imageLoaded) {
                  setImageLoaded(true);
                }
              }}
              src={optimizedImageUrl}
              alt={species.commonName}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={`h-full w-full object-cover transition-[opacity,transform] duration-300 ease-out group-hover:scale-105 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ) : (
            <ImagePlaceholder
              type={species.vegetationTypeCode}
              label={species.commonName}
              size="full"
              className="rounded-none border-none transition-transform duration-300 ease-out group-hover:scale-105"
            />
          )}

          {/* Badge de tipo de vegetación unificado */}
          <div className="absolute top-2.5 right-2.5 shadow-2xs">
            <Badge label={species.vegetationTypeName} color="brand" />
          </div>
        </div>

        {/* Información taxonómica con padding interno natural */}
        <div className="p-4 flex flex-col flex-1 justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="font-bold text-base text-neutral-900 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors duration-200 line-clamp-1 leading-snug">
              {species.commonName}
            </h3>
            <p className="text-xs italic text-neutral-500 font-serif line-clamp-1">
              {species.scientificName}
            </p>
            {species.family && (
              <span className="inline-block text-[11px] text-neutral-400 font-medium tracking-tight">
                Fam. {species.family}
              </span>
            )}
          </div>

          {/* Conteo de ejemplares limpio y directo */}
          <div className="pt-0.5 flex items-center justify-between text-xs">
            <span className="text-xs font-semibold text-neutral-800 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              {species.specimenCount} {species.specimenCount === 1 ? 'ejemplar' : 'ejemplares'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
