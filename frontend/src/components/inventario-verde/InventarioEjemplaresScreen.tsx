'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Species, SpecimenSortKey, SpecimenViewMode } from '@shared/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useInventarioVerdeSpecimens, useInventarioVerdeStats } from '@/hooks/useInventarioVerde';
import { useRequest } from '@/hooks/useRequest';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { InventarioVerdeHero } from './InventarioVerdeHero';
import { SpecimenFiltersBar } from './SpecimenFiltersBar';
import { SpecimenTable } from './SpecimenTable';
import { SpecimenGrid } from './SpecimenGrid';

/**
 * Pantalla principal del Inventario de Ejemplares (Catastro Verde georreferenciado).
 * Muestra el catálogo de individuos botánicos en el campus con filtros por código,
 * referencia, ubicación y nombre de especie, así como acceso directo al registro de ejemplares.
 */
export function InventarioEjemplaresScreen() {
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(() => {
    const fromHook = searchParams?.get('search');
    if (fromHook !== null && fromHook !== undefined) return fromHook;
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('search') ?? '';
    }
    return '';
  });
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [selectedLocation, setSelectedLocation] = useState(() => {
    const fromHook = searchParams?.get('location');
    if (fromHook) return fromHook;
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('location') || 'ALL';
    }
    return 'ALL';
  });
  const [sortBy, setSortBy] = useState<SpecimenSortKey>('code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<SpecimenViewMode>('cards');
  const [page, setPage] = useState(0);
  const pageSize = 16;

  const { totalSpecimens, totalSpecies } = useInventarioVerdeStats();

  const {
    specimens,
    totalElements,
    totalPages,
    currentPage,
    availableLocations,
    loading,
  } = useInventarioVerdeSpecimens(null, {
    search: debouncedSearch,
    location: selectedLocation,
    sortBy,
    sortDirection,
    page,
    pageSize,
  });

  const allSpeciesReq = useRequest('all-species-catalog', () =>
    typeof inventarioVerdeApi.species === 'function'
      ? inventarioVerdeApi.species({ page: 0, size: 100 }).catch(() => null)
      : Promise.resolve(null),
  );

  const speciesMap = useMemo(() => {
    const map: Record<string, Species> = {};
    allSpeciesReq.data?.content?.forEach((s) => {
      map[s.slug] = s;
    });
    return map;
  }, [allSpeciesReq.data]);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    setPage(0);
  }

  function handleLocationChange(loc: string) {
    setSelectedLocation(loc);
    setPage(0);
  }

  function handleResetFilters() {
    setSearchInput('');
    setSelectedLocation('ALL');
    setSortBy('code');
    setSortDirection('asc');
    setPage(0);
  }

  return (
    <div className="flex flex-col">
      <InventarioVerdeHero
        title="Catastro de Ejemplares"
        totalSpecimens={totalSpecimens}
      />

      <div className="bg-neutral-0 rounded-2xl border border-neutral-200/90 p-5 sm:p-6 shadow-xs">
        <SpecimenFiltersBar
          searchValue={searchInput}
          onSearchChange={handleSearchChange}
          selectedLocation={selectedLocation}
          onLocationChange={handleLocationChange}
          availableLocations={availableLocations}
          sortBy={sortBy}
          onSortByChange={(s) => {
            setSortBy(s);
            setPage(0);
          }}
          sortDirection={sortDirection}
          onSortDirectionChange={(d) => {
            setSortDirection(d);
            setPage(0);
          }}
          totalFilteredCount={totalElements}
          fromItem={totalElements === 0 ? 0 : page * pageSize + 1}
          toItem={Math.min((page + 1) * pageSize, totalElements)}
          loading={loading}
          onReset={handleResetFilters}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {viewMode === 'table' ? (
          <SpecimenTable
            specimens={specimens}
            speciesMap={speciesMap}
            totalElements={totalElements}
            page={currentPage}
            pageSize={pageSize}
            onPageChange={setPage}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={(sort) => {
              if (sort.key === 'code' || sort.key === 'location' || sort.key === 'reference') {
                setSortBy(sort.key);
                setSortDirection(sort.direction);
                setPage(0);
              }
            }}
            loading={loading}
          />
        ) : (
          <SpecimenGrid
            specimens={specimens}
            speciesMap={speciesMap}
            loading={loading}
            page={currentPage}
            totalPages={totalPages}
            totalElements={totalElements}
            pageSize={pageSize}
            onPageChange={setPage}
            onClearFilters={handleResetFilters}
          />
        )}
      </div>
    </div>
  );
}
