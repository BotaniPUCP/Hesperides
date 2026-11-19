'use client';

import type { Species } from '@shared/types';
import { Badge } from '@/components/ui';
import { SpeciesCover } from './SpeciesCover';
import { SpeciesStatusBadge } from './SpeciesStatusBadge';
import { unidadCorta } from './medidasEspecie';
import type { ReactNode } from 'react';

export interface SpeciesInfoProps {
  species: Species;
  availableLocations?: { location: string; count: number }[];
  /** Lo que puede hacer quien edita, junto al encabezado de la especie. */
  actions?: ReactNode;
}

/**
 * Cabecera estructurada y profesional para la ficha de detalle de una especie botánica.
 * Jerarquía clara: Nombre común > Nombre científico > Taxonomía/Estado > Medidas botánicas.
 */
export function SpeciesInfo({ species, actions }: SpeciesInfoProps) {
  const isNameIdentical = Boolean(species.commonName) && species.commonName?.trim().toLowerCase() === species.scientificName?.trim().toLowerCase();
  const hasNotesOrDescription = Boolean(species.description?.trim() || species.careNotes?.trim());

  return (
    <div className="surface-card">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
        <SpeciesCover species={species} />

        {/* Información taxonómica y botánica estructurada */}
        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
          <div>
            {/* Encabezado: Título principal y acciones de gestión */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <h1 className="page-title">
                  {species.commonName || species.scientificName}
                </h1>
                {!isNameIdentical && species.commonName && (
                  <p className="text-sm sm:text-base italic text-neutral-500 font-serif mt-0.5">
                    ({species.scientificName})
                  </p>
                )}
              </div>

              {/* Acciones principales claramente agrupadas (Editar, Dar de baja) */}
              {actions && (
                <div className="shrink-0 flex items-center gap-2 pt-0.5">
                  {actions}
                </div>
              )}
            </div>

            {/* Etiquetas secundarias agrupadas: Tipo, Familia, Estado, Criticidad, Origen */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Badge label={species.vegetationTypeName} color="brand" />
              {species.family && (
                <Badge label={`Fam. ${species.family}`} color="neutral" />
              )}
              <SpeciesStatusBadge isActive={species.isActive} />
              <Badge label={species.critical ? 'Crítica' : 'No crítica'} color={species.critical ? 'warning' : 'neutral'} />
              {species.originName && (
                <Badge label={species.originName} color="neutral" />
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

            {/* Parámetros dendrométricos y medidas botánicas de referencia */}
            <div className="mt-4 pt-3 border-t border-neutral-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Medidas botánicas de referencia
                </span>
                <span className="text-[11px] text-neutral-400">
                  {species.critical ? 'Especie crítica' : 'Valores referenciales'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="block text-[11px] font-medium text-neutral-500">Altura promedio</span>
                  <span className="text-sm font-bold text-neutral-900 font-mono">
                    {species.referenceHeightM != null ? `${species.referenceHeightM} m` : '—'}
                  </span>
                  {species.referenceHeightSourceName ? (
                    <span className="block text-[10px] text-neutral-400 truncate mt-0.5" title={species.referenceHeightSourceName}>
                      {species.referenceHeightSourceName}
                    </span>
                  ) : (
                    <span className="block text-[10px] text-neutral-400 mt-0.5">Sin fuente</span>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="block text-[11px] font-medium text-neutral-500">Radio copa prom.</span>
                  <span className="text-sm font-bold text-neutral-900 font-mono">
                    {species.referenceCrownRadiusM != null ? `${species.referenceCrownRadiusM} m` : '—'}
                  </span>
                  {species.referenceCrownRadiusSourceName ? (
                    <span className="block text-[10px] text-neutral-400 truncate mt-0.5" title={species.referenceCrownRadiusSourceName}>
                      {species.referenceCrownRadiusSourceName}
                    </span>
                  ) : (
                    <span className="block text-[10px] text-neutral-400 mt-0.5">Sin fuente</span>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="block text-[11px] font-medium text-neutral-500">Medición de fuste</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-800 mt-1">
                    <span className={`w-2 h-2 rounded-full ${species.usesTrunkHeight ? 'bg-forest-600' : 'bg-neutral-300'}`} />
                    {species.usesTrunkHeight ? 'Aplica medición' : 'No aplica'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="block text-[11px] font-medium text-neutral-500">Medición de DAP</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-800 mt-1">
                    <span className={`w-2 h-2 rounded-full ${species.usesDbh ? 'bg-forest-600' : 'bg-neutral-300'}`} />
                    {species.usesDbh ? 'Aplica medición' : 'No aplica'}
                  </span>
                </div>
              </div>

              {/* Medidas adicionales configuradas */}
              {species.extraMeasures && species.extraMeasures.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-neutral-500 font-medium">Medidas adicionales:</span>
                  {species.extraMeasures.map((em) => (
                    <span
                      key={em.code}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-200/60 text-xs text-neutral-800 font-medium"
                    >
                      <span>{em.label}</span>
                      <span className="text-[10px] font-mono text-neutral-500 bg-white px-1 py-0.5 rounded border border-neutral-200">
                        {unidadCorta(em.unitCode)}
                      </span>
                      {em.referenceNote && (
                        <span className="text-[11px] text-neutral-500 italic">({em.referenceNote})</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
