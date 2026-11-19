'use client';

import Link from 'next/link';
import type { RetiredSpecimen, Species } from '@shared/types';
import { Badge, EmptyState } from '@/components/ui';

export interface RetiredSpecimenTableProps {
  specimens: RetiredSpecimen[];
  speciesMap?: Record<string, Pick<Species, 'slug' | 'commonName' | 'vegetationTypeCode'> & { imageUrl?: string | null }>;
  totalElements: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export function RetiredSpecimenTable({
  specimens,
  totalElements,
  page,
  pageSize,
  onPageChange,
  loading = false,
}: RetiredSpecimenTableProps) {
  const desde = page * pageSize + 1;
  const hasta = Math.min((page + 1) * pageSize, totalElements);
  const esUltimaPagina = hasta >= totalElements;

  if (loading && specimens.length === 0) {
    return (
      <div className="flex flex-col divide-y divide-neutral-200/80 rounded-xl border border-neutral-200 bg-neutral-0">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
            <div className="h-9 w-24 bg-neutral-200 rounded" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-4 w-40 bg-neutral-200 rounded" />
              <div className="h-3 w-64 bg-neutral-100 rounded" />
            </div>
            <div className="h-4 w-28 bg-neutral-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (specimens.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-0">
        <EmptyState
          title="Sin ejemplares retirados"
          description="No se encontraron ejemplares retirados que coincidan con la búsqueda."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`overflow-hidden rounded-xl border border-neutral-200 bg-neutral-0 shadow-2xs divide-y divide-neutral-200/80 transition-opacity duration-200 ${
          loading ? 'opacity-50 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Cabecera */}
        <div className="hidden md:grid md:grid-cols-12 gap-3 px-4 py-2.5 bg-neutral-50/80 border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          <div className="md:col-span-3">Código</div>
          <div className="md:col-span-3">Especie</div>
          <div className="md:col-span-2">Ubicación histórica</div>
          <div className="md:col-span-2">Fecha y Motivo de baja</div>
          <div className="md:col-span-2 text-right">Trazabilidad</div>
        </div>

        {specimens.map((item) => {
          const detailUrl = `/catastro/ejemplares/${item.code}`;
          const formattedDate = item.retiredAt
            ? new Date(item.retiredAt).toLocaleDateString('es-PE', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : '—';

          return (
            <Link
              key={item.code}
              href={detailUrl}
              className="group relative flex flex-col md:grid md:grid-cols-12 md:items-center gap-2.5 md:gap-3 p-3.5 md:px-4 md:py-3 cursor-pointer hover:bg-brand-50/40 transition-all duration-150"
            >
              {/* Columna 1: Código */}
              <div className="flex items-center gap-2.5 md:col-span-3 min-w-0">
                <span className="font-mono text-sm font-bold text-neutral-900 group-hover:text-brand-600 transition-colors">
                  {item.code}
                </span>
              </div>

              {/* Columna 2: Especie */}
              <div className="flex flex-col min-w-0 md:col-span-3">
                <span className="text-xs font-semibold text-neutral-800 truncate">
                  {item.commonName || 'Ejemplar botánico'}
                </span>
                {item.scientificName && (
                  <span className="text-[11px] italic text-neutral-500 font-serif truncate">
                    {item.scientificName}
                  </span>
                )}
              </div>

              {/* Columna 3: Ubicación */}
              <div className="flex flex-col min-w-0 md:col-span-2 text-xs text-neutral-700">
                <div className="flex items-center gap-1 truncate" title={item.sourceLocation || 'Campus PUCP'}>
                  <span aria-hidden="true" className="text-neutral-400 shrink-0">📍</span>
                  <span className="font-medium truncate">{item.sourceLocation || 'Campus PUCP'}</span>
                </div>
                {item.sourceReference && (
                  <span className="text-[11px] font-mono text-neutral-400 truncate">
                    Ref: {item.sourceReference}
                  </span>
                )}
              </div>

              {/* Columna 4: Fecha y Motivo de baja */}
              <div className="flex flex-col min-w-0 md:col-span-2 text-xs">
                <span className="font-medium text-neutral-800">{formattedDate}</span>
                {item.reason ? (
                  <span className="text-[11px] text-neutral-500 truncate" title={item.reason}>
                    {item.reason}
                  </span>
                ) : (
                  <span className="text-[11px] text-neutral-400 italic">Sin motivo especificado</span>
                )}
              </div>

              {/* Columna 5: Intervenciones + flecha */}
              <div className="flex items-center justify-between md:justify-end gap-2.5 md:col-span-2 text-xs">
                <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                  {item.interventionsCount} {item.interventionsCount === 1 ? 'intervención' : 'intervenciones'}
                </span>

                <span
                  aria-hidden="true"
                  className="text-neutral-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-all duration-200 shrink-0 ml-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
          {`${desde}–${hasta} de ${totalElements} ejemplares retirados`}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page === 0 || loading}
            onClick={() => onPageChange(page - 1)}
            className="px-2.5 py-1 text-xs font-semibold rounded-md border border-neutral-200 bg-neutral-0 text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Anterior
          </button>
          <span className="text-xs text-neutral-400 px-1">
            Pág. {page + 1}
          </span>
          <button
            type="button"
            disabled={esUltimaPagina || loading}
            onClick={() => onPageChange(page + 1)}
            className="px-2.5 py-1 text-xs font-semibold rounded-md border border-neutral-200 bg-neutral-0 text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
