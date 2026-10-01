'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Specimen, Species } from '@shared/types';
import { Badge, Card, ImagePlaceholder } from '@/components/ui';

export interface SpecimenInfoProps {
  specimen: Specimen;
  species: Species | null;
}

export function SpecimenInfo({ specimen, species }: SpecimenInfoProps) {
  const [imageError, setImageError] = useState(false);

  const hasCoords = specimen.latitude !== null && specimen.longitude !== null;

  return (
    <div className="flex flex-col gap-6">
      <Card padded className="border-neutral-200 bg-neutral-0 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Fotografía principal */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="h-80 w-full rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 relative shadow-inner">
              {specimen.photoUrl && !imageError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={specimen.photoUrl}
                  alt={`Ejemplar ${specimen.reference}`}
                  loading="lazy"
                  onError={() => setImageError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImagePlaceholder
                  type={specimen.vegetationTypeCode}
                  label={`Ejemplar ${specimen.reference}`}
                  size="full"
                  className="rounded-none border-none"
                />
              )}

              <div className="absolute top-3 left-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-neutral-900/90 backdrop-blur-md text-neutral-0 text-xs font-mono font-bold">
                  {specimen.reference}
                </span>
              </div>

              {specimen.photoUrl && !imageError && (
                <div className="absolute bottom-3 left-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-neutral-900/80 backdrop-blur-md text-neutral-0 text-[11px] font-medium">
                    Fotografía referencial
                  </span>
                </div>
              )}
            </div>

            {specimen.photoUrl && (
              <div className="flex flex-col gap-1.5 text-center px-2">
                <p className="text-[11px] text-neutral-500 leading-snug">
                  Fotografía botánica referencial provisional. Las fotografías individuales del ejemplar se integrarán tras el censo en campo.
                </p>
                <a
                  href={specimen.photoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-700 hover:text-brand-900 hover:underline inline-flex items-center justify-center gap-1 font-medium"
                >
                  Ver imagen de referencia en tamaño completo
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>

          {/* Ficha técnica del ejemplar */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Badge
                    label={specimen.vegetationTypeName || species?.vegetationTypeName || 'Vegetación'}
                    color="brand"
                  />
                  {specimen.code ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-xs font-mono font-medium">
                      Código Oficial: {specimen.code}
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-500 italic">
                      Sin código oficial asignado
                    </span>
                  )}
                </div>
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight">
                Ejemplar {specimen.reference}
              </h1>

              {species && (
                <div className="mt-1 flex items-baseline gap-2">
                  <Link
                    href={`/inventario-verde/especies/${species.id}`}
                    className="text-base font-semibold text-brand-700 hover:text-brand-900 hover:underline"
                  >
                    {species.commonName}
                  </Link>
                  <span className="text-sm italic text-neutral-500 font-serif">
                    ({species.scientificName})
                  </span>
                </div>
              )}

              {/* Atributos en cuadrícula */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-neutral-100">
                <div className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-200">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                    Ubicación / Sector
                  </p>
                  <div className="flex items-center gap-1.5 text-neutral-900 font-semibold text-sm">
                    <svg className="w-4 h-4 text-brand-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{specimen.location}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-200">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                    Cantidad Censada
                  </p>
                  <p className="text-neutral-900 font-semibold text-sm">
                    {specimen.quantity} {specimen.quantity === 1 ? 'individuo' : 'individuos'}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-200 sm:col-span-2">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                    Coordenadas Geográficas (GPS)
                  </p>
                  {hasCoords ? (
                    <p className="text-neutral-900 font-mono text-sm">
                      Lat: <span className="font-semibold">{specimen.latitude}</span>, Lon: <span className="font-semibold">{specimen.longitude}</span>
                    </p>
                  ) : (
                    <p className="text-neutral-500 text-sm italic">Coordenadas no registradas</p>
                  )}
                </div>

                <div className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-200 sm:col-span-2">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                    Observaciones de Campo / Fenología (FEN)
                  </p>
                  <p className="text-neutral-700 text-sm leading-relaxed">
                    {specimen.observations || (
                      <span className="text-neutral-500 italic">Sin observaciones registradas para este ejemplar.</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
