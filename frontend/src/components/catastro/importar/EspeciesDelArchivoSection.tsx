'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SpeciesImportBinding } from '@shared/types';
import { Button } from '@/components/ui';
import { SelectorDeEspecieParaImportacion } from './SelectorDeEspecieParaImportacion';

export interface EspecieArchivoItem {
  sourceKey: string;
  sourceName: string;
  rows: number;
  isAssociated: boolean;
  scientificName?: string;
  speciesSlug?: string;
  resolution?: 'SCIENTIFIC_NAME' | 'ALTERNATIVE_NAME' | 'USER_SELECTED';
  reason?: string;
}

export interface EspeciesDelArchivoSectionProps {
  bindings: SpeciesImportBinding[];
  unknownSpecies: { name: string; rows: number; sourceKey?: string; reason?: string }[];
  disabled?: boolean;
  onVincular: (sourceKey: string, speciesSlug: string | null) => Promise<void>;
}

const ITEMS_POR_PAGINA = 5;

/**
 * Sección unificada de especies del archivo CSV para el flujo de importación de ejemplares.
 * Ordena mostrando primero las pendientes y luego las asociadas, con estructura homogénea y paginación única.
 */
export function EspeciesDelArchivoSection({
  bindings,
  unknownSpecies,
  disabled = false,
  onVincular,
}: EspeciesDelArchivoSectionProps) {
  const [paginaActual, setPaginaActual] = useState(1);

  const todasEspecies: EspecieArchivoItem[] = useMemo(() => {
    const map = new Map<string, EspecieArchivoItem>();

    // 1. Especies pendientes del archivo
    for (const u of unknownSpecies) {
      const key = u.sourceKey ?? u.name;
      map.set(key, {
        sourceKey: key,
        sourceName: u.name,
        rows: u.rows,
        isAssociated: false,
        reason: u.reason,
      });
    }

    // 2. Especies asociadas (en catálogo)
    for (const b of bindings) {
      map.set(b.sourceKey, {
        sourceKey: b.sourceKey,
        sourceName: b.sourceName,
        rows: b.rows,
        isAssociated: true,
        scientificName: b.scientificName,
        speciesSlug: b.speciesSlug,
        resolution: b.resolution,
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      // Pendientes de asociación primero
      if (!a.isAssociated && b.isAssociated) return -1;
      if (a.isAssociated && !b.isAssociated) return 1;
      // Mismo estado: orden alfabético por nombre científico de origen
      return a.sourceName.localeCompare(b.sourceName);
    });
  }, [bindings, unknownSpecies]);

  const totalCount = todasEspecies.length;
  const asociadasCount = useMemo(() => todasEspecies.filter((e) => e.isAssociated).length, [todasEspecies]);
  const pendientesCount = totalCount - asociadasCount;

  const totalPaginas = Math.ceil(totalCount / ITEMS_POR_PAGINA) || 1;
  const paginaValida = Math.min(Math.max(1, paginaActual), totalPaginas);

  if (totalCount === 0) return null;

  const indiceInicio = (paginaValida - 1) * ITEMS_POR_PAGINA;
  const indiceFin = Math.min(indiceInicio + ITEMS_POR_PAGINA, totalCount);
  const especiesPaginadas = todasEspecies.slice(indiceInicio, indiceFin);

  return (
    <section aria-labelledby="especies-del-archivo" className="space-y-3">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 id="especies-del-archivo" className="font-semibold text-neutral-900 text-base">
              Especies del archivo
            </h3>
            <span
              data-testid="total-especies-badge"
              className="inline-flex items-center justify-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700 min-w-5 text-center"
            >
              {totalCount}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200/60">
              {asociadasCount} {asociadasCount === 1 ? 'asociada' : 'asociadas'}
            </span>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 border border-amber-200/60">
              {pendientesCount} {pendientesCount === 1 ? 'pendiente' : 'pendientes'}
            </span>
          </div>
        </div>
      </div>

      {/* Lista homogénea de tarjetas */}
      <ul aria-label="Especies del archivo" className="space-y-3">
        {especiesPaginadas.map((especie) => (
          <li
            key={especie.sourceKey}
            className="rounded-xl border border-neutral-200 bg-neutral-0 p-4 transition-colors"
          >
            {/* Primera fila: Nombre original, cantidad de filas y etiqueta de estado */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold italic text-neutral-900">{especie.sourceName}</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {especie.rows} {especie.rows === 1 ? 'fila del archivo' : 'filas del archivo'}
                  {especie.reason === 'AMBIGUOUS' ? ' · Coincidencias ambiguas: selecciona una especie' : ''}
                  {especie.reason === 'USER_UNRESOLVED' ? ' · Asociación pendiente de seleccionar' : ''}
                </p>
              </div>
              <div>
                {especie.isAssociated ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200/60">
                    En catálogo de especies
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-800 border border-amber-200/60">
                    Pendiente
                  </span>
                )}
              </div>
            </div>

            {/* Segunda fila: Mapeo y acciones a la derecha */}
            <div className="mt-3 pt-3 border-t border-neutral-100">
              <SelectorDeEspecieParaImportacion
                sourceName={especie.sourceName}
                buttonLabel={especie.isAssociated ? 'Cambiar especie' : 'Seleccionar especie existente'}
                disabled={disabled}
                extraAction={
                  especie.isAssociated ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={disabled}
                      onClick={() => void onVincular(especie.sourceKey, null)}
                    >
                      Quitar asociación
                    </Button>
                  ) : undefined
                }
                leftContent={
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="italic text-neutral-700">{especie.sourceName}</span>
                    <span className="text-neutral-400" aria-label="asociada a">→</span>
                    {especie.isAssociated ? (
                      <span className="font-bold text-neutral-900">{especie.scientificName}</span>
                    ) : (
                      <span className="italic text-neutral-500">Sin asociar</span>
                    )}
                  </div>
                }
                onSelect={(selected) => void onVincular(especie.sourceKey, selected.slug)}
              />
            </div>
          </li>
        ))}
      </ul>

      {/* Paginación unificada */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <p className="text-sm text-neutral-500">
          Mostrando {indiceInicio + 1}–{indiceFin} de {totalCount} {totalCount === 1 ? 'especie' : 'especies'}
        </p>
        {totalPaginas > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={paginaValida <= 1}
              onClick={() => setPaginaActual((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={paginaValida >= totalPaginas}
              onClick={() => setPaginaActual((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
