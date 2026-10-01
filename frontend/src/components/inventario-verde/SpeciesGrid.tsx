'use client';

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
}: SpeciesGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <LoadingSkeleton key={i} variant="card" />
        ))}
      </div>
    );
  }

  if (species.length === 0) {
    return (
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
    );
  }

  const fromItem = page * pageSize + 1;
  const toItem = Math.min((page + 1) * pageSize, totalElements);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>
          Mostrando <strong className="text-neutral-800">{fromItem}</strong> -{' '}
          <strong className="text-neutral-800">{toItem}</strong> de{' '}
          <strong className="text-neutral-800">{totalElements}</strong> especies
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {species.map((sp) => (
          <SpeciesCard key={sp.id} species={sp} />
        ))}
      </div>

      {totalPages > 1 && (
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
