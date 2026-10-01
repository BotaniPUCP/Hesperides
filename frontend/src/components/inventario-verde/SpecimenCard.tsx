'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Species, Specimen } from '@shared/types';
import { Card, ImagePlaceholder } from '@/components/ui';

export interface SpecimenCardProps {
  specimen: Specimen;
  species: Pick<Species, 'slug' | 'commonName' | 'vegetationTypeCode'>;
}

export function SpecimenCard({ specimen, species }: SpecimenCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <Link
      href={`/inventario-verde/especies/${species.slug}/ejemplares/${specimen.code}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded-xl transition-transform duration-150 hover:-translate-y-0.5"
    >
      <Card
        padded={false}
        className="overflow-hidden border-neutral-200/80 bg-neutral-0 shadow-sm transition-all duration-150 group-hover:shadow-md group-hover:border-primary-300 flex flex-col h-full"
      >
        {/* Foto o placeholder */}
        <div className="relative h-36 w-full overflow-hidden bg-neutral-100 flex-shrink-0">
          {specimen.thumbnailUrl && !imageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={specimen.thumbnailUrl}
              alt={`Ejemplar ${specimen.code}`}
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <ImagePlaceholder
              type={species.vegetationTypeCode}
              label={specimen.code}
              size="full"
              className="rounded-none border-none"
            />
          )}

          {/* Badge de referencia */}
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-900/80 backdrop-blur-sm text-neutral-0 text-xs font-mono font-bold tracking-tight">
              {specimen.code}
            </span>
          </div>

          {specimen.code && (
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/90 backdrop-blur-sm text-neutral-800 text-[10px] font-semibold">
                Cód: {specimen.code}
              </span>
            </div>
          )}

          {/* Indicador de fotografía provisional de especie */}
          {specimen.thumbnailUrl && !imageError && (
            <div className="absolute bottom-2 left-2">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[9px] font-medium text-white/90">
                Foto del ejemplar
              </span>
            </div>
          )}
        </div>

        {/* Datos del ejemplar */}
        <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
          <div>
            <div className="flex items-start gap-1.5 text-xs text-neutral-700 font-medium">
              <svg
                className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="line-clamp-1">{specimen.sourceLocation}</span>
            </div>

            {specimen.latitude !== null && specimen.longitude !== null && (
              <p className="text-[11px] font-mono text-neutral-400 mt-1 pl-5">
                {specimen.latitude.toFixed(5)}, {specimen.longitude.toFixed(5)}
              </p>
            )}

            {specimen.notes && (
              <p className="text-[11px] text-neutral-500 line-clamp-1 mt-1 pl-5 italic">
                {specimen.notes}
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-neutral-400">
              Cantidad: {specimen.quantity}
            </span>
            <span className="text-primary-700 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 text-xs">
              Ver ficha →
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
