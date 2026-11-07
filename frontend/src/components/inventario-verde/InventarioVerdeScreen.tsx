'use client';

import { useState } from 'react';
import { useInventarioVerdeSpecies, useInventarioVerdeStats } from '@/hooks/useInventarioVerde';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import { useListUrlState } from '@/hooks/useListUrlState';
import { useSearchDraft } from '@/hooks/useSearchDraft';
import { oneOf, pageFrom } from '@/lib/listUrl';
import { InventarioVerdeHero } from './InventarioVerdeHero';
import { VegetationTypeFilter } from './VegetationTypeFilter';
import { SpeciesGrid } from './SpeciesGrid';

const LIST_PATH = '/inventario-verde';
const SPECIES_SORTS = ['name:asc', 'name:desc', 'count:desc', 'count:asc'] as const;
const DEFAULTS = { search: '', type: 'ALL', sort: 'name:asc', page: '0' };

/** El catálogo de especies. Sus filtros viven en la URL para encontrarlos igual al regresar de una ficha. */
export function InventarioVerdeScreen() {
  const [reloadKey] = useState(0);

  const { values, setValues, query } = useListUrlState(LIST_PATH, DEFAULTS);
  const [searchInput, setSearchInput] = useSearchDraft(values.search, (search) => setValues({ search, page: '0' }));
  const selectedType = values.type;
  const speciesSort = oneOf(values.sort, SPECIES_SORTS, 'name:asc');
  const page = pageFrom(values.page);
  const pageSize = 16;

  const { totalSpecimens, vegetationTypes } = useInventarioVerdeStats(reloadKey);

  const {
    species,
    totalElements,
    totalPages,
    currentPage,
    loading,
  } = useInventarioVerdeSpecies({
    search: values.search,
    vegetationType: selectedType,
    page,
    pageSize,
    reloadKey,
  });
  useListScrollRestoration(LIST_PATH, query, !loading);

  function handleTypeSelect(typeCode: string) {
    const nextType = selectedType === typeCode && typeCode !== 'ALL' ? 'ALL' : typeCode;
    if (nextType === selectedType) return;
    setValues({ type: nextType, page: '0' });
  }

  function handleClearFilters() {
    setValues({ search: '', type: 'ALL', page: '0' });
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
          onSearchChange={setSearchInput}
        />

        <SpeciesGrid
          species={species}
          loading={loading}
          page={currentPage}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPageChange={(next) => setValues({ page: String(next) })}
          onClearFilters={handleClearFilters}
          sortBy={speciesSort}
          onSortByChange={(sort) => setValues({ sort })}
        />
      </div>
    </div>
  );
}
