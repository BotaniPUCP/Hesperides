'use client';

import type { Species, Specimen } from '@shared/types';
import { EmptyState, LoadingSkeleton, Button } from '@/components/ui';
import { SpecimenCard } from './SpecimenCard';

export interface SpecimenGridProps {
  specimens: Specimen[];
  species: Pick<Species, 'slug' | 'commonName' | 'vegetationTypeCode'>;
  loading?: boolean;
  page: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onClearFilters?: () => void;
}

export function SpecimenGrid({
  specimens,
  species,
  loading = false,
  page,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onClearFilters,
}: SpecimenGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <LoadingSkeleton key={i} variant="card" />
        ))}
      </div>
    );
  }

  if (specimens.length === 0) {
    return (
      <EmptyState
        title="No se encontraron ejemplares"
        description="No hay registros de ejemplares que coincidan con la búsqueda o el sector seleccionado."
        action={
          onClearFilters
            ? {
                label: 'Limpiar búsqueda y filtros',
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
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {specimens.map((specimen) => (
          <SpecimenCard key={specimen.code} specimen={specimen} species={species} />
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
            Página {page + 1} de {totalPages} ({fromItem} - {toItem} de {totalElements})
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
