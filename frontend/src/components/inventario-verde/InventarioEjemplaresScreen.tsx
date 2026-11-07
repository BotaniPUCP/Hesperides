'use client';

import { useMemo } from 'react';
import type { Species, SpecimenSortKey, SpecimenViewMode } from '@shared/types';
import { useInventarioVerdeSpecimens, useInventarioVerdeStats } from '@/hooks/useInventarioVerde';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import { useListUrlState } from '@/hooks/useListUrlState';
import { useRequest } from '@/hooks/useRequest';
import { useSearchDraft } from '@/hooks/useSearchDraft';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { oneOf, pageFrom } from '@/lib/listUrl';
import { InventarioVerdeHero } from './InventarioVerdeHero';
import { SpecimenFiltersBar } from './SpecimenFiltersBar';
import { SpecimenTable } from './SpecimenTable';
import { SpecimenGrid } from './SpecimenGrid';

const LIST_PATH = '/catastro/ejemplares';
const PAGE_SIZE = 16;
const SORT_KEYS: readonly SpecimenSortKey[] = ['code', 'reference', 'location'];
const DIRECTIONS = ['asc', 'desc'] as const;
const VIEW_MODES: readonly SpecimenViewMode[] = ['cards', 'table'];
const DEFAULTS = {
  search: '', location: 'ALL', type: 'ALL', critical: 'ALL', measured: 'ALL', sort: 'code', dir: 'asc', view: 'cards', page: '0',
};

/** «ALL» o un valor raro en la dirección no filtran. */
const booleanFilter = (value: string) => (value === 'true' ? true : value === 'false' ? false : undefined);

/**
 * Pantalla principal del Inventario de Ejemplares (Catastro Verde georreferenciado).
 * Muestra el catálogo de individuos botánicos en el campus con filtros por código,
 * referencia, ubicación, tipo y nombre de especie. Filtros, orden, vista y página
 * viven en la URL para encontrarlos igual al regresar de una ficha.
 */
export function InventarioEjemplaresScreen() {
  const { values, setValues, query } = useListUrlState(LIST_PATH, DEFAULTS);
  const [searchInput, setSearchInput] = useSearchDraft(values.search, (search) => setValues({ search, page: '0' }));
  const sortBy = oneOf(values.sort, SORT_KEYS, 'code');
  const sortDirection = oneOf(values.dir, DIRECTIONS, 'asc');
  const viewMode = oneOf(values.view, VIEW_MODES, 'cards');
  const page = pageFrom(values.page);

  const { totalSpecimens, vegetationTypes } = useInventarioVerdeStats();

  const {
    specimens,
    totalElements,
    totalPages,
    currentPage,
    availableLocations,
    loading,
  } = useInventarioVerdeSpecimens(null, {
    search: values.search,
    location: values.location,
    vegetationType: values.type,
    critical: booleanFilter(values.critical),
    measured: booleanFilter(values.measured),
    sortBy,
    sortDirection,
    page,
    pageSize: PAGE_SIZE,
  });
  useListScrollRestoration(LIST_PATH, query, !loading);

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

  const handlePageChange = (next: number) => setValues({ page: String(next) });
  const handleResetFilters = () => setValues(DEFAULTS);

  return (
    <div className="space-y-6">
      <InventarioVerdeHero
        title="Catastro de Ejemplares"
        totalSpecimens={totalSpecimens}
      />

      <div className="surface-card">
        <SpecimenFiltersBar
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          selectedType={values.type}
          onTypeChange={(type) => setValues({ type, page: '0' })}
          availableTypes={vegetationTypes}
          selectedCritical={values.critical}
          onCriticalChange={(critical) => setValues({ critical, page: '0' })}
          selectedMeasured={values.measured}
          onMeasuredChange={(measured) => setValues({ measured, page: '0' })}
          selectedLocation={values.location}
          onLocationChange={(location) => setValues({ location, page: '0' })}
          availableLocations={availableLocations}
          sortBy={sortBy}
          onSortByChange={(sort) => setValues({ sort, page: '0' })}
          sortDirection={sortDirection}
          onSortDirectionChange={(dir) => setValues({ dir, page: '0' })}
          totalFilteredCount={totalElements}
          fromItem={totalElements === 0 ? 0 : page * PAGE_SIZE + 1}
          toItem={Math.min((page + 1) * PAGE_SIZE, totalElements)}
          loading={loading}
          onReset={handleResetFilters}
          viewMode={viewMode}
          onViewModeChange={(view) => setValues({ view })}
        />

        {viewMode === 'table' ? (
          <SpecimenTable
            specimens={specimens}
            speciesMap={speciesMap}
            totalElements={totalElements}
            page={currentPage}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={(sort) => {
              if (sort.key === 'code' || sort.key === 'location' || sort.key === 'reference') {
                setValues({ sort: sort.key, dir: sort.direction, page: '0' });
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
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
            onClearFilters={handleResetFilters}
          />
        )}
      </div>
    </div>
  );
}
