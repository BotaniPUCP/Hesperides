'use client';

import type { RetiredSpecimen, Species } from '@shared/types';
import { EmptyState, LoadingSkeleton, Button } from '@/components/ui';
import { RetiredSpecimenCard } from './RetiredSpecimenCard';

export interface RetiredSpecimenGridProps {
  specimens: RetiredSpecimen[];
  speciesMap?: Record<string, Pick<Species, 'slug' | 'commonName' | 'vegetationTypeCode'> & { imageUrl?: string | null; vegetationTypeName?: string }>;
  loading?: boolean;
  page: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onClearFilters?: () => void;
}

export function RetiredSpecimenGrid({
  specimens,
  speciesMap,
  loading = false,
  page,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onClearFilters,
}: RetiredSpecimenGridProps) {
  if (loading && specimens.length === 0) {
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
        title="Sin ejemplares retirados"
        description="No se encontraron ejemplares retirados que coincidan con la búsqueda."
        action={
          onClearFilters
            ? {
                label: 'Limpiar búsqueda',
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
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 transition-opacity duration-200 ${
          loading ? 'opacity-60 pointer-events-none' : 'opacity-100'
        }`}
      >
        {specimens.map((specimen) => (
          <RetiredSpecimenCard
            key={specimen.code}
            specimen={specimen}
            species={speciesMap?.[specimen.speciesSlug]}
          />
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
