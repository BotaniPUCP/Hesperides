'use client';

import { useState } from 'react';
import type { SpecimenDetail } from '@shared/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useInventarioVerdeSpecies, useInventarioVerdeStats } from '@/hooks/useInventarioVerde';
import { InventarioVerdeHero } from './InventarioVerdeHero';
import { VegetationTypeFilter } from './VegetationTypeFilter';
import { SpeciesGrid } from './SpeciesGrid';

export function InventarioVerdeScreen() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [selectedType, setSelectedType] = useState('ALL');
  const [speciesSort, setSpeciesSort] = useState<'name:asc' | 'name:desc' | 'count:desc' | 'count:asc'>('name:asc');
  const [page, setPage] = useState(0);
  const pageSize = 16;

  const { totalSpecies, totalSpecimens, vegetationTypes } = useInventarioVerdeStats();

  const {
    species,
    totalElements,
    totalPages,
    currentPage,
    loading,
  } = useInventarioVerdeSpecies({
    search: debouncedSearch,
    vegetationType: selectedType,
    page,
    pageSize,
  });

  const [specimenMatch, setSpecimenMatch] = useState<SpecimenDetail | null>(null);

  // Si la búsqueda devuelve 0 especies pero encontramos un ejemplar por su código EV,
  // mostramos la especie a la que pertenece ese ejemplar en la cuadrícula en vez de un estado vacío engañoso.
  const displaySpecies =
    species.length === 0 && specimenMatch
      ? [specimenMatch.species]
      : species;
  const displayTotalElements =
    species.length === 0 && specimenMatch ? 1 : totalElements;

  function handleTypeSelect(typeCode: string) {
    const nextType = selectedType === typeCode && typeCode !== 'ALL' ? 'ALL' : typeCode;
    if (nextType === selectedType) return;
    setSelectedType(nextType);
    setPage(0);
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
    setPage(0);
  }

  function handleClearFilters() {
    setSearchInput('');
    setSpecimenMatch(null);
    setSelectedType('ALL');
    setPage(0);
  }

  return (
    <div className="flex flex-col">
      <InventarioVerdeHero
        totalSpecies={totalSpecies}
        totalSpecimens={totalSpecimens}
      />

      <div className="bg-neutral-0 rounded-2xl border border-neutral-200/90 p-5 sm:p-6 shadow-xs">
        <VegetationTypeFilter
          types={vegetationTypes}
          selectedType={selectedType}
          onSelectType={handleTypeSelect}
          totalAllCount={totalSpecimens}
          searchValue={searchInput}
          onSearchChange={handleSearchChange}
          onSpecimenMatch={setSpecimenMatch}
        />

        <SpeciesGrid
          species={displaySpecies}
          loading={loading}
          page={currentPage}
          totalPages={species.length === 0 && specimenMatch ? 1 : totalPages}
          totalElements={displayTotalElements}
          pageSize={pageSize}
          onPageChange={setPage}
          onClearFilters={handleClearFilters}
          sortBy={speciesSort}
          onSortByChange={setSpeciesSort}
        />
      </div>
    </div>
  );
}
