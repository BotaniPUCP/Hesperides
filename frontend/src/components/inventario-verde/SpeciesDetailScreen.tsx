'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb, EmptyState, LoadingSkeleton } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useInventarioVerdeSpeciesBySlug, useInventarioVerdeSpecimens } from '@/hooks/useInventarioVerde';
import { SpeciesInfo } from './SpeciesInfo';
import { SpecimenFiltersBar } from './SpecimenFiltersBar';
import { SpecimenTable } from './SpecimenTable';

export interface SpeciesDetailScreenProps {
  slug: string;
}

export function SpeciesDetailScreen({ slug }: SpeciesDetailScreenProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [sortBy, setSortBy] = useState<'reference' | 'code' | 'location'>('reference');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  // Consulta de ejemplares: paginación de 20 ejemplares por página
  const pageSize = 20;

  const { species, loading: speciesLoading, errorMessage } = useInventarioVerdeSpeciesBySlug(slug);

  const {
    specimens,
    allFilteredCount,
    totalElements,
    currentPage,
    availableLocations,
    loading: specimensLoading,
  } = useInventarioVerdeSpecimens(slug, {
    search: debouncedSearch,
    location: selectedLocation,
    sortBy,
    sortDirection,
    page,
    pageSize,
  });

  function handleSearchChange(val: string) {
    setSearchInput(val);
    setPage(0);
  }

  function handleLocationChange(loc: string) {
    setSelectedLocation(loc);
    setPage(0);
  }

  if (speciesLoading) {
    return (
      <div className="flex flex-col gap-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="table-row" count={4} />
      </div>
    );
  }

  if (!species) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumb
          items={[
            { label: 'Inventario de Especies', href: '/inventario-verde' },
            { label: 'No encontrada' },
          ]}
        />
        <EmptyState
          title={errorMessage ? 'No se pudo cargar la especie' : 'Especie no encontrada'}
          description={errorMessage ?? 'La especie solicitada no está registrada en el inventario.'}
          action={{
            label: 'Volver al catálogo',
            onClick: () => router.push('/inventario-verde'),
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-5xl mx-auto w-full">
      <div className="mb-4">
        <Breadcrumb
          items={[
            { label: 'Inventario de Especies', href: '/inventario-verde' },
            { label: species.commonName },
          ]}
        />
      </div>

      <SpeciesInfo species={species} />

      <div className="bg-neutral-0 rounded-xl border border-neutral-200 p-4 sm:p-5 shadow-xs">
        <SpecimenFiltersBar
          searchValue={searchInput}
          onSearchChange={handleSearchChange}
          selectedLocation={selectedLocation}
          onLocationChange={handleLocationChange}
          availableLocations={availableLocations}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortDirection={sortDirection}
          onSortDirectionChange={setSortDirection}
          totalFilteredCount={allFilteredCount}
        />

        <SpecimenTable
          specimens={specimens}
          species={species}
          totalElements={totalElements}
          page={currentPage}
          pageSize={pageSize}
          onPageChange={setPage}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={(sort) => {
            setSortBy(sort.key as 'reference' | 'code' | 'location');
            setSortDirection(sort.direction);
          }}
          loading={specimensLoading}
        />
      </div>
    </div>
  );
}
