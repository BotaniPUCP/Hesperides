'use client';

import Link from 'next/link';
import type { Species } from '@shared/types';
import { Badge } from '@/components/ui';
import { SpeciesCover } from './SpeciesCover';

export interface SpeciesInfoProps {
  species: Species;
  availableLocations?: { location: string; count: number }[];
}

/**
 * Cabecera compacta y profesional para el detalle de una especie botánica.
 * Diseñada para alta densidad informativa sin ocupar espacio vertical excesivo.
 */
export function SpeciesInfo({ species, availableLocations = [] }: SpeciesInfoProps) {
  const isNameIdentical = species.commonName.trim().toLowerCase() === species.scientificName.trim().toLowerCase();

  // Filtrar 'ALL' si viene en availableLocations y mostrar todos los sectores donde está presente
  const locations = availableLocations.filter((l) => l.location !== 'ALL' && l.count > 0);
  const speciesSearchTerm = species.commonName || species.scientificName;
  const hasNotesOrDescription = Boolean(species.description?.trim() || species.careNotes?.trim());

  return (
    <div className="rounded-2xl border border-neutral-200/90 bg-neutral-0 p-4 sm:p-5 shadow-xs mb-5 transition-shadow">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
        <SpeciesCover species={species} />

        {/* Información taxonómica estructurada */}
        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
          <div>
            {/* Barra superior de taxonomía y conteo */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge label={species.vegetationTypeName} color="brand" />
                {species.family && (
                  <Badge label={`Fam. ${species.family}`} color="neutral" />
                )}
                {species.originName && (
                  <Badge label={species.originName} color="neutral" />
                )}
              </div>

              {/* Indicador de ejemplares censados */}
              <Badge
                label={`${species.specimenCount} ${species.specimenCount === 1 ? 'ejemplar censado' : 'ejemplares censados'}`}
                color="brand"
              />
            </div>

            {/* Nombre común y científico */}
            <div className="flex flex-wrap items-baseline gap-2.5 mt-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                {species.commonName}
              </h1>
              {!isNameIdentical && (
                <span className="text-base italic text-neutral-500 font-serif">
                  ({species.scientificName})
                </span>
              )}
            </div>

            {/* Otros nombres / Sinónimos */}
            {species.otherNames && species.otherNames.length > 0 && (
              <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
                También conocida como:{' '}
                <span className="font-semibold text-neutral-800">{species.otherNames.join(', ')}</span>
              </p>
            )}

            {/* Descripción y notas de manejo si están registradas */}
            {hasNotesOrDescription && (
              <div className="mt-3 pt-2.5 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                {species.description?.trim() && (
                  <div className={!species.careNotes?.trim() ? 'sm:col-span-2' : ''}>
                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-0.5">
                      Descripción botánica
                    </span>
                    <p className="text-neutral-700 leading-relaxed whitespace-pre-line">
                      {species.description.trim()}
                    </p>
                  </div>
                )}
                {species.careNotes?.trim() && (
                  <div className={!species.description?.trim() ? 'sm:col-span-2' : ''}>
                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-0.5">
                      Cuidados y manejo
                    </span>
                    <p className="text-neutral-700 leading-relaxed whitespace-pre-line">
                      {species.careNotes.trim()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Distribución por sectores en campus */}
            {locations.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap mt-3 pt-2.5 border-t border-neutral-100 text-xs text-neutral-500">
                <span className="font-semibold text-neutral-700">Presencia en campus:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {locations.map((loc) => (
                    <Link
                      key={loc.location}
                      href={`/catastro/ejemplares?search=${encodeURIComponent(speciesSearchTerm)}&location=${encodeURIComponent(loc.location)}`}
                      title={`Ver ejemplares de ${species.commonName} en ${loc.location}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-100 hover:bg-brand-50 hover:text-brand-700 border border-transparent hover:border-brand-200 text-neutral-700 text-xs font-medium transition-colors"
                    >
                      <span>{loc.location}</span>
                      <span className="text-[10px] text-neutral-400 font-bold font-mono">({loc.count})</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
