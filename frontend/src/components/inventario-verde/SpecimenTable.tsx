'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Species, Specimen } from '@shared/types';
import { EmptyState, ImagePlaceholder, type DataTableSort } from '@/components/ui';

export interface SpecimenTableProps {
  specimens: Specimen[];
  species: Pick<Species, 'slug' | 'commonName' | 'vegetationTypeCode'>;
  totalElements: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSortChange: (sort: DataTableSort) => void;
  onViewOnMap?: (specimen: Specimen) => void;
  loading?: boolean;
}

function SpecimenThumbnail({
  specimen,
  typeCode,
}: {
  specimen: Specimen;
  typeCode: string;
}) {
  const [error, setError] = useState(false);
  const thumbSrc = specimen.thumbnailUrl ? specimen.thumbnailUrl.replace(/sz=w\d+/, 'sz=w160') : null;

  return (
    <div
      aria-hidden="true"
      className="relative h-9 w-9 rounded-md overflow-hidden bg-neutral-100 flex-shrink-0 border border-neutral-200/90"
    >
      {thumbSrc && !error ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbSrc}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <ImagePlaceholder
          type={typeCode}
          size="sm"
          className="h-full w-full rounded-none border-none p-0.5"
          label=""
        />
      )}
    </div>
  );
}

export function SpecimenTable({
  specimens,
  species,
  totalElements,
  page,
  pageSize,
  onPageChange,
  onViewOnMap,
  loading = false,
}: SpecimenTableProps) {

  const desde = page * pageSize + 1;
  const hasta = Math.min((page + 1) * pageSize, totalElements);
  const esUltimaPagina = hasta >= totalElements;

  function handleMapAction(specimen: Specimen) {
    if (onViewOnMap) {
      onViewOnMap(specimen);
    }
  }

  if (loading && specimens.length === 0) {
    return (
      <div className="flex flex-col divide-y divide-neutral-200/80 rounded-lg border border-neutral-200 bg-neutral-0">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
            <div className="h-10 w-10 rounded-lg bg-neutral-200" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-4 w-40 bg-neutral-200 rounded" />
              <div className="h-3 w-64 bg-neutral-100 rounded" />
            </div>
            <div className="h-4 w-20 bg-neutral-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (specimens.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-0">
        <EmptyState
          title="Sin ejemplares coincidentes"
          description="Prueba cambiando los términos de búsqueda o quitando el filtro de ubicación."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Lista estructurada estilo GitHub / Linear con transición suave de carga */}
      <div className={`overflow-hidden rounded-xl border border-neutral-200 bg-neutral-0 shadow-2xs divide-y divide-neutral-200/80 transition-opacity duration-200 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {specimens.map((item) => {
          const detailUrl = `/inventario-verde/especies/${species.slug}/ejemplares/${item.code}`;

          return (
            <Link
              key={item.code}
              href={detailUrl}
              className="group relative flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-3 p-3.5 sm:px-4 sm:py-3 hover:bg-neutral-50/90 transition-colors"
            >
              {/* Columna 1 (Izquierda, 5 cols): Miniatura + Código + Badges */}
              <div className="flex items-center gap-3.5 min-w-0 sm:col-span-5">
                <SpecimenThumbnail
                  specimen={item}
                  typeCode={species.vegetationTypeCode}
                />

                <div className="flex flex-col gap-1 min-w-0">
                  {/* Línea 1: Código oficial + Badge de Referencia de campo + Badge de nota */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-neutral-900 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {item.code}
                    </span>

                    {item.sourceReference && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-neutral-100 text-[11px] font-mono font-medium text-neutral-600">
                        Ref: {item.sourceReference}
                      </span>
                    )}

                    {item.notes && (
                      <span
                        tabIndex={0}
                        role="note"
                        title={`Observación: ${item.notes}`}
                        aria-label={`Observación: ${item.notes}`}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border cursor-help transition-colors ${
                          item.notes.toLowerCase().includes('medid') ||
                          item.notes.toLowerCase().includes('medicion') ||
                          item.notes.toLowerCase().includes('forestal')
                            ? 'bg-brand-50 text-brand-900 border-brand-200/80 hover:bg-brand-100/80'
                            : 'bg-alert-warning-bg text-alert-warning-fg border-alert-warning-border hover:opacity-90'
                        }`}
                      >
                        <svg
                          className={`w-3 h-3 flex-shrink-0 ${
                            item.notes.toLowerCase().includes('medid') ||
                            item.notes.toLowerCase().includes('medicion') ||
                            item.notes.toLowerCase().includes('forestal')
                              ? 'text-brand-600'
                              : 'text-alert-warning-fg'
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                          />
                        </svg>
                        <span className="text-[10px] font-semibold tracking-tight">
                          {item.notes.toLowerCase().includes('medid') ||
                          item.notes.toLowerCase().includes('medicion') ||
                          item.notes.toLowerCase().includes('forestal')
                            ? 'Medido'
                            : 'Nota'}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* En móviles mostramos la ubicación debajo */}
                  <div className="flex sm:hidden items-center gap-1.5 text-xs text-neutral-600">
                    <svg className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium text-neutral-700 truncate">
                      {item.sourceLocation || 'Sin ubicación específica'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Columna 2 (Centro exacto, 4 cols): Ubicación / Referente */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-600 sm:col-span-4 min-w-0">
                <svg className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium text-neutral-700 truncate" title={item.sourceLocation || 'Sin ubicación específica'}>
                  {item.sourceLocation || 'Sin ubicación específica'}
                </span>
              </div>

              {/* Columna 3 (Derecha alineada, 3 cols): Botón Ver ficha */}
              <div className="flex items-center justify-end sm:col-span-3">
                <span className="inline-flex items-center text-xs h-8 px-3 font-medium rounded-lg border border-neutral-200 bg-neutral-0 text-neutral-800 shadow-2xs group-hover:border-neutral-400 group-hover:bg-neutral-100 group-hover:text-neutral-900 transition-all">
                  <span>Ver ficha</span>
                  <span aria-hidden="true" className="ml-1 text-neutral-400 group-hover:text-neutral-700 transition-transform group-hover:translate-x-0.5">→</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Paginación minimalista idéntica al estándar del sistema */}
      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <span className="text-xs text-neutral-500 font-medium">
          {`${desde}–${hasta} de ${totalElements} ejemplares`}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 bg-neutral-0 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={esUltimaPagina}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 bg-neutral-0 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
