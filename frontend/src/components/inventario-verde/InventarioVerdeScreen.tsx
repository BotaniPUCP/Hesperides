'use client';

import { useState } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useInventarioVerdeSpecies, useInventarioVerdeStats } from '@/hooks/useInventarioVerde';
import { InventarioVerdeHero } from './InventarioVerdeHero';
import { VegetationTypeFilter } from './VegetationTypeFilter';
import { SpeciesGrid } from './SpeciesGrid';

export function InventarioVerdeScreen() {
  const [reloadKey] = useState(0);

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [selectedType, setSelectedType] = useState('ALL');
  const [speciesSort, setSpeciesSort] = useState<'name:asc' | 'name:desc' | 'count:desc' | 'count:asc'>('name:asc');
  const [page, setPage] = useState(0);
  const pageSize = 16;

  const { totalSpecimens, vegetationTypes } = useInventarioVerdeStats(reloadKey);

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
    reloadKey,
  });

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
    setSelectedType('ALL');
    setPage(0);
  }

  return (
    <div className="flex flex-col">
      <InventarioVerdeHero />

      <div className="bg-neutral-0 rounded-2xl border border-neutral-200/90 p-5 sm:p-6 shadow-xs">
        <VegetationTypeFilter
          types={vegetationTypes}
          selectedType={selectedType}
          onSelectType={handleTypeSelect}
          totalAllCount={totalSpecimens}
          searchValue={searchInput}
          onSearchChange={handleSearchChange}
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
          sortBy={speciesSort}
          onSortByChange={setSpeciesSort}
        />
      </div>
    </div>
  );
}
