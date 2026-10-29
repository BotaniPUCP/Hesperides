'use client';

import { useMemo } from 'react';
import type { Species } from '@shared/types';
import { EmptyState, LoadingSkeleton, Button } from '@/components/ui';
import { SpeciesCard } from './SpeciesCard';

export interface SpeciesGridProps {
  species: Species[];
  loading?: boolean;
  page: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onClearFilters?: () => void;
  sortBy?: 'name:asc' | 'name:desc' | 'count:desc' | 'count:asc';
  onSortByChange?: (sort: 'name:asc' | 'name:desc' | 'count:desc' | 'count:asc') => void;
}

export function SpeciesGrid({
  species,
  loading = false,
  page,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onClearFilters,
  sortBy = 'name:asc',
  onSortByChange,
}: SpeciesGridProps) {
  const fromItem = page * pageSize + 1;
  const toItem = Math.min((page + 1) * pageSize, totalElements);

  // Ordenamiento en cliente memorizado
  const sortedSpecies = useMemo(() => {
    return [...species].sort((a, b) => {
      if (sortBy === 'name:asc') return a.commonName.localeCompare(b.commonName, 'es');
      if (sortBy === 'name:desc') return b.commonName.localeCompare(a.commonName, 'es');
      if (sortBy === 'count:desc') return b.specimenCount - a.specimenCount;
      if (sortBy === 'count:asc') return a.specimenCount - b.specimenCount;
      return 0;
    });
  }, [species, sortBy]);

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de estado y ordenamiento de especies con altura estable para evitar saltos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-500 pt-1 border-b border-neutral-100 pb-3 min-h-[41px]">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-neutral-500 py-0.5" role="status">
            <span className="h-3.5 w-3.5 rounded-full border-2 border-forest-600 border-t-transparent animate-spin" aria-hidden="true" />
            <span>Actualizando catálogo botánico...</span>
          </div>
        ) : (
          <span>
            Mostrando <strong className="text-neutral-800 font-semibold">{fromItem}</strong>–<strong className="text-neutral-800 font-semibold">{toItem}</strong> de{' '}
            <strong className="text-neutral-900 font-semibold">{totalElements}</strong>{' '}
            {totalElements === 1 ? 'especie botánica' : 'especies botánicas'}
          </span>
        )}

        {onSortByChange && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <label htmlFor="species-sort-select" className="text-neutral-500 font-medium">
              Ordenar por:
            </label>
            <select
              id="species-sort-select"
              value={sortBy}
              disabled={loading}
              onChange={(e) => onSortByChange(e.target.value as 'name:asc' | 'name:desc' | 'count:desc' | 'count:asc')}
              className="text-xs font-semibold text-neutral-800 bg-neutral-0 border border-neutral-200/90 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-forest-600 cursor-pointer shadow-2xs hover:border-neutral-300 transition-colors disabled:opacity-50"
            >
              <option value="name:asc">Nombre común (A - Z)</option>
              <option value="name:desc">Nombre común (Z - A)</option>
              <option value="count:desc">Más censadas (Mayor a menor)</option>
              <option value="count:asc">Menos censadas (Menor a mayor)</option>
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 content-start min-h-[440px]"
          aria-busy="true"
          aria-label="Cargando especies botánicas"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <LoadingSkeleton key={i} variant="card" />
          ))}
        </div>
      ) : species.length === 0 ? (
        <EmptyState
          title="No se encontraron especies"
          description="No hay especies botánicas que coincidan con los criterios de búsqueda o filtros seleccionados."
          action={
            onClearFilters
              ? {
                  label: 'Restablecer filtros',
                  onClick: onClearFilters,
                }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 content-start min-h-[440px] transition-opacity duration-150">
          {sortedSpecies.map((sp) => (
            <SpeciesCard key={sp.slug} species={sp} />
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-neutral-200/80 pt-4 mt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 0}
          >
            ← Anterior
          </Button>

          <span className="text-xs text-neutral-600 font-medium">
            Página {page + 1} de {totalPages}
          </span>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
          >
            Siguiente →
          </Button>
        </div>
      )}
    </div>
  );
}
