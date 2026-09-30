'use client';

import { useState } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useInventarioVerdeSpecies, useInventarioVerdeStats } from '@/hooks/useInventarioVerde';
import { InventarioVerdeHero } from './InventarioVerdeHero';
import { InventarioVerdeStats } from './InventarioVerdeStats';
import { VegetationTypeFilter } from './VegetationTypeFilter';
import { SpeciesGrid } from './SpeciesGrid';

export function InventarioVerdeScreen() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [selectedType, setSelectedType] = useState('ALL');
  const [page, setPage] = useState(0);
  const pageSize = 24;

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

  function handleTypeSelect(typeCode: string) {
    setSelectedType(typeCode);
    setPage(0);
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
    setPage(0);
  }

  function handleClearFilters() {
    setSearchInput('');
    setSelectedType('ALL');
    setPage(0);
  }

  return (
    <div className="flex flex-col">
      <InventarioVerdeHero
        searchValue={searchInput}
        onSearchChange={handleSearchChange}
      />

      <InventarioVerdeStats
        totalSpecies={totalSpecies}
        totalSpecimens={totalSpecimens}
        totalTypes={vegetationTypes.length}
      />

      <div className="bg-neutral-0 rounded-xl border border-neutral-200 p-4 sm:p-5 shadow-xs">
        <VegetationTypeFilter
          types={vegetationTypes}
          selectedType={selectedType}
          onSelectType={handleTypeSelect}
          totalAllCount={totalSpecimens}
        />

        <SpeciesGrid
          species={species}
          loading={loading}
          page={currentPage}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPageChange={setPage}
          onClearFilters={handleClearFilters}
        />
      </div>
    </div>
  );
}
