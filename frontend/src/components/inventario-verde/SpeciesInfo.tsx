'use client';

import type { Species } from '@shared/types';
import { Badge } from '@/components/ui';
import { SpeciesCover } from './SpeciesCover';

export interface SpeciesInfoProps {
  species: Species;
}

/**
 * Cabecera compacta y profesional para el detalle de una especie botánica.
 * Diseñada para alta densidad informativa sin ocupar espacio vertical excesivo.
 */
export function SpeciesInfo({ species }: SpeciesInfoProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-0 p-4 sm:p-5 shadow-xs mb-5 transition-shadow">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
        <SpeciesCover species={species} />

        {/* Información taxonómica estructurada */}
        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
          <div>
            {/* Barra superior de taxonomía y conteo */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <Badge label={species.vegetationTypeName} color="brand" />
                {species.family && (
                  <span className="text-xs font-medium text-neutral-500">
                    Familia: <span className="font-semibold text-neutral-700">{species.family}</span>
                  </span>
                )}
              </div>

              {/* Indicador de ejemplares censados discreto pero relevante */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-900 text-xs font-semibold border border-brand-200/60">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                <span>
                  {species.specimenCount} {species.specimenCount === 1 ? 'ejemplar censado' : 'ejemplares censados'}
                </span>
              </div>
            </div>

            {/* Nombre común y científico */}
            <div className="flex flex-wrap items-baseline gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                {species.commonName}
              </h1>
              <span className="text-sm italic text-neutral-500 font-serif">
                ({species.scientificName})
              </span>
            </div>

            {species.otherNames.length > 0 && (
              <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed">
                También se le dice: <span className="font-medium">{species.otherNames.join(', ')}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
