'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Species, Specimen } from '@shared/types';
import { EmptyState, ImagePlaceholder, type DataTableSort } from '@/components/ui';

export interface SpecimenTableProps {
  specimens: Specimen[];
  species?: Pick<Species, 'slug' | 'commonName' | 'vegetationTypeCode'> & { imageUrl?: string | null };
  speciesMap?: Record<string, Pick<Species, 'slug' | 'commonName' | 'vegetationTypeCode'> & { imageUrl?: string | null }>;
  totalElements: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (sort: DataTableSort) => void;
  onViewOnMap?: (specimen: Specimen) => void;
  loading?: boolean;
}

function SpecimenThumbnail({
  specimen,
  fallbackUrl,
}: {
  specimen: Specimen;
  fallbackUrl?: string | null;
}) {
  const [error, setError] = useState(false);
  const [speciesError, setSpeciesError] = useState(false);
  const rawThumb = specimen.thumbnailUrl || specimen.imageUrl;
  const thumbSrc = rawThumb ? rawThumb.replace(/sz=w\d+/, 'sz=w160') : null;
  const displaySrc = thumbSrc && !error ? thumbSrc : fallbackUrl && !speciesError ? fallbackUrl : null;

  return (
    <div
      aria-hidden="true"
      className="relative h-10 w-10 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0 border border-neutral-200/90 shadow-2xs"
    >
      {displaySrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displaySrc}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => {
            if (thumbSrc && !error) {
              setError(true);
            } else {
              setSpeciesError(true);
            }
          }}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-neutral-100 to-primary-50/50 text-primary-700">
          <svg className="w-5 h-5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22v-6" />
            <path d="M7 16l5-12 5 12" />
            <path d="M9 13h6" />
            <path d="M6 19c-2 0-3-1-3-3a4 4 0 0 1 4-4c.5-2 2.5-4 5-4s4.5 2 5 4a4 4 0 0 1 4 4c0 2-1 3-3 3H6Z" />
          </svg>
        </div>
      )}
    </div>
  );
}

export function SpecimenTable({
  specimens,
  species,
  speciesMap,
  totalElements,
  page,
  pageSize,
  onPageChange,
  loading = false,
}: SpecimenTableProps) {
  const desde = page * pageSize + 1;
  const hasta = Math.min((page + 1) * pageSize, totalElements);
  const esUltimaPagina = hasta >= totalElements;

  if (loading && specimens.length === 0) {
    return (
      <div className="flex flex-col divide-y divide-neutral-200/80 rounded-xl border border-neutral-200 bg-neutral-0">
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
      <div className="rounded-xl border border-neutral-200 bg-neutral-0">
        <EmptyState
          title="Sin ejemplares coincidentes"
          description="Prueba cambiando los términos de búsqueda o quitando el filtro de ubicación."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Tabla estructurada con cabecera y filas alineadas */}
      <div className={`overflow-hidden rounded-xl border border-neutral-200 bg-neutral-0 shadow-2xs divide-y divide-neutral-200/80 transition-opacity duration-200 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {/* Cabecera de columnas en pantallas medianas y grandes */}
        <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-4 py-2.5 bg-neutral-50/80 border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          <div className="sm:col-span-5">Código</div>
          <div className="sm:col-span-4">Ubicación</div>
          <div className="sm:col-span-3 text-right">Referencia</div>
        </div>

        {specimens.map((item) => {
          const specSpecies = speciesMap?.[item.speciesSlug ?? ''] || species;
          const itemSlug = item.speciesSlug || specSpecies?.slug;
          const detailUrl = itemSlug
            ? `/inventario-verde/especies/${itemSlug}/ejemplares/${item.code}`
            : `/catastro/registrar`;

          const hasNotes = Boolean(item.notes);

          return (
            <Link
              key={item.code}
              href={detailUrl}
              className="group relative flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-2.5 sm:gap-3 p-3.5 sm:px-4 sm:py-3 cursor-pointer hover:bg-brand-50/40 transition-all duration-150"
            >
              {/* Columna 1 (5 cols): Miniatura + Código */}
              <div className="flex items-center gap-3.5 min-w-0 sm:col-span-5">
                <SpecimenThumbnail
                  specimen={item}
                  fallbackUrl={specSpecies?.imageUrl}
                />

                <span className="font-mono text-sm font-bold text-neutral-900 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                  {item.code}
                </span>
              </div>

              {/* Columna 2 (4 cols): Ubicación */}
              <div className="flex items-center gap-1.5 text-xs text-neutral-700 sm:col-span-4 min-w-0">
                <span aria-hidden="true" className="text-neutral-400 shrink-0">📍</span>
                <span className="font-medium truncate" title={item.sourceLocation || 'Campus PUCP'}>
                  {item.sourceLocation || 'Campus PUCP'}
                </span>
              </div>

              {/* Columna 3 (3 cols): Referencia + Nota + Indicador de acción */}
              <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:col-span-3 text-xs">
                {item.sourceReference ? (
                  <span className="font-mono text-neutral-600 text-xs">Ref: {item.sourceReference}</span>
                ) : (
                  <span className="text-neutral-300 font-mono text-xs">—</span>
                )}

                {hasNotes && (
                  <span
                    role="note"
                    tabIndex={0}
                    title={`Observación: ${item.notes}`}
                    aria-label={`Observación: ${item.notes}`}
                    className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-neutral-100 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200 transition-colors shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </span>
                )}

                <span
                  aria-hidden="true"
                  className="text-neutral-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-all duration-200 shrink-0 ml-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Paginación */}
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
