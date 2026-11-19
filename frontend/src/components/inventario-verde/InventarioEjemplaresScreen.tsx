'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Species, Specimen, SpecimenSortKey, SpecimenViewMode } from '@shared/types';
import { useAuth } from '@/hooks/useAuth';
import {
  useInventarioVerdeRetiredSpecimens,
  useInventarioVerdeSpecimens,
  useInventarioVerdeStats,
} from '@/hooks/useInventarioVerde';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import { useListUrlState } from '@/hooks/useListUrlState';
import { useRequest } from '@/hooks/useRequest';
import { useSearchDraft } from '@/hooks/useSearchDraft';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { oneOf, pageFrom } from '@/lib/listUrl';
import { cn } from '@/lib/cn';
import { Button, Input, Modal, useToast } from '@/components/ui';
import { InventarioVerdeHero } from './InventarioVerdeHero';
import { SpecimenFiltersBar } from './SpecimenFiltersBar';
import { SpecimenTable } from './SpecimenTable';
import { SpecimenGrid } from './SpecimenGrid';
import { RetiredSpecimenGrid } from './RetiredSpecimenGrid';
import { RetiredSpecimenTable } from './RetiredSpecimenTable';
import { SpecimenViewToggle } from './SpecimenViewToggle';
import { BulkActionsBar } from './BulkActionsBar';
import { BulkDeactivationModal } from './BulkDeactivationModal';

const LIST_PATH = '/catastro/ejemplares';
const PAGE_SIZE = 16;
const TABS = ['vigentes', 'retirados'] as const;
type EjemplaresTab = (typeof TABS)[number];
const SORT_KEYS: readonly SpecimenSortKey[] = ['code', 'reference', 'location'];
const DIRECTIONS = ['asc', 'desc'] as const;
const VIEW_MODES: readonly SpecimenViewMode[] = ['cards', 'table'];
const DEFAULTS = {
  tab: 'vigentes',
  search: '',
  location: 'ALL',
  type: 'ALL',
  critical: 'ALL',
  measured: 'ALL',
  sort: 'code',
  dir: 'asc',
  view: 'cards',
  page: '0',
};

/** «ALL» o un valor raro en la dirección no filtran. */
const booleanFilter = (value: string) => (value === 'true' ? true : value === 'false' ? false : undefined);

/**
 * Pantalla principal del Inventario de Ejemplares (Catastro Verde georreferenciado).
 * Muestra el catálogo de individuos botánicos en el campus con filtros por código,
 * referencia, ubicación, tipo y nombre de especie. Pestaña de retirados disponible
 * exclusivamente para Administradores y Coordinadores.
 */
export function InventarioEjemplaresScreen() {
  const { user } = useAuth();
  const canViewRetired = user?.role.code === 'ADMIN' || user?.role.code === 'COORDINADOR';

  const [reloadKey, setReloadKey] = useState(0);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [selectedSpecimensMap, setSelectedSpecimensMap] = useState<Map<string, Specimen>>(new Map());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isFilterConfirmOpen, setIsFilterConfirmOpen] = useState(false);
  const [pendingFilterAction, setPendingFilterAction] = useState<(() => void) | null>(null);
  const { showToast } = useToast();

  const { values, setValues, query } = useListUrlState(LIST_PATH, DEFAULTS);

  const executeOrConfirmFilterChange = (action: () => void) => {
    if (selectedCodes.size > 0) {
      setPendingFilterAction(() => action);
      setIsFilterConfirmOpen(true);
    } else {
      action();
    }
  };

  const handleConfirmFilterChange = () => {
    handleClearSelection();
    if (pendingFilterAction) {
      pendingFilterAction();
    }
    setIsFilterConfirmOpen(false);
    setPendingFilterAction(null);
  };

  const handleCancelFilterChange = () => {
    setIsFilterConfirmOpen(false);
    setPendingFilterAction(null);
    setSearchInput(values.search);
  };

  const [searchInput, setSearchInput] = useSearchDraft(values.search, (search) => {
    if (search === values.search) return;
    executeOrConfirmFilterChange(() => setValues({ search, page: '0' }));
  });

  // Control de acceso y redirección preventiva si un rol no autorizado intenta entrar a tab=retirados
  useEffect(() => {
    if (!canViewRetired && values.tab === 'retirados') {
      setValues({ tab: 'vigentes', page: '0' });
    }
  }, [canViewRetired, values.tab, setValues]);

  const rawTab = oneOf(values.tab, TABS, 'vigentes');
  const currentTab: EjemplaresTab = canViewRetired && rawTab === 'retirados' ? 'retirados' : 'vigentes';

  const sortBy = oneOf(values.sort, SORT_KEYS, 'code');
  const sortDirection = oneOf(values.dir, DIRECTIONS, 'asc');
  const viewMode = oneOf(values.view, VIEW_MODES, 'cards');
  const page = pageFrom(values.page);

  const { totalSpecimens, vegetationTypes } = useInventarioVerdeStats(reloadKey);

  const {
    specimens,
    totalElements,
    totalPages,
    currentPage,
    availableLocations,
    loading: loadingActive,
  } = useInventarioVerdeSpecimens(null, {
    search: currentTab === 'vigentes' ? values.search : '',
    location: values.location,
    vegetationType: values.type,
    critical: booleanFilter(values.critical),
    measured: booleanFilter(values.measured),
    sortBy,
    sortDirection,
    page: currentTab === 'vigentes' ? page : 0,
    pageSize: PAGE_SIZE,
    reloadKey,
  });

  const retiredQuery = useInventarioVerdeRetiredSpecimens(
    {
      search: currentTab === 'retirados' ? values.search : '',
      page: currentTab === 'retirados' ? page : 0,
      pageSize: PAGE_SIZE,
      reloadKey,
    },
    canViewRetired,
  );

  const isCurrentLoading = currentTab === 'vigentes' ? loadingActive : retiredQuery.loading;
  useListScrollRestoration(LIST_PATH, query, !isCurrentLoading);

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
  const handleResetFilters = () => {
    executeOrConfirmFilterChange(() => setValues({ ...DEFAULTS, tab: currentTab }));
  };
  const handleTypeChange = (type: string) => {
    if (type === values.type) return;
    executeOrConfirmFilterChange(() => setValues({ type, page: '0' }));
  };
  const handleLocationChange = (location: string) => {
    if (location === values.location) return;
    executeOrConfirmFilterChange(() => setValues({ location, page: '0' }));
  };
  const handleCriticalChange = (critical: string) => {
    if (critical === values.critical) return;
    executeOrConfirmFilterChange(() => setValues({ critical, page: '0' }));
  };
  const handleMeasuredChange = (measured: string) => {
    if (measured === values.measured) return;
    executeOrConfirmFilterChange(() => setValues({ measured, page: '0' }));
  };
  const handleTabChange = (nextTab: EjemplaresTab) => {
    if (nextTab === currentTab) return;
    handleClearSelection();
    setValues({ tab: nextTab, page: '0', search: '' });
  };

  const isAllCurrentPageSelected =
    specimens.length > 0 && specimens.every((s) => selectedCodes.has(s.code));

  const handleToggleSelect = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
        setSelectedSpecimensMap((prevMap) => {
          const m = new Map(prevMap);
          m.delete(code);
          return m;
        });
      } else {
        next.add(code);
        const item = specimens.find((s) => s.code === code);
        if (item) {
          setSelectedSpecimensMap((prevMap) => new Map(prevMap).set(code, item));
        }
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      setSelectedCodes((prev) => {
        const next = new Set(prev);
        specimens.forEach((s) => next.delete(s.code));
        return next;
      });
      setSelectedSpecimensMap((prevMap) => {
        const m = new Map(prevMap);
        specimens.forEach((s) => m.delete(s.code));
        return m;
      });
    } else {
      setSelectedCodes((prev) => {
        const next = new Set(prev);
        specimens.forEach((s) => next.add(s.code));
        return next;
      });
      setSelectedSpecimensMap((prevMap) => {
        const m = new Map(prevMap);
        specimens.forEach((s) => m.set(s.code, s));
        return m;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedCodes(new Set());
    setSelectedSpecimensMap(new Map());
  };

  const selectedSpecimensList = useMemo(() => {
    return Array.from(selectedCodes).map((code) => {
      return (
        selectedSpecimensMap.get(code) ||
        specimens.find((s) => s.code === code) ||
        ({
          code,
          speciesSlug: null,
          sourceLocation: 'Campus PUCP',
          sourceReference: null,
          latitude: null,
          longitude: null,
          photoUrl: null,
          imageUrl: null,
          thumbnailUrl: null,
          quantity: 1,
          notes: null,
        } satisfies Specimen)
      );
    });
  }, [selectedCodes, selectedSpecimensMap, specimens]);

  const handleConfirmBulkDeactivate = async (reason: string) => {
    const codes = Array.from(selectedCodes);
    if (codes.length === 0) return;
    await inventarioVerdeApi.deactivateSpecimensBatch(codes, reason);
    const count = codes.length;
    handleClearSelection();
    setIsBulkModalOpen(false);
    setReloadKey((prev) => prev + 1);
    showToast({
      variant: 'success',
      title: 'Baja masiva completada',
      description:
        count === 1
          ? 'Se ha dado de baja 1 ejemplar correctamente.'
          : `Se han dado de baja ${count} ejemplares correctamente.`,
    });
  };

  return (
    <div className="space-y-6">
      <InventarioVerdeHero
        title="Catastro de Ejemplares"
        totalSpecimens={totalSpecimens}
        currentTab={currentTab}
        retiredCount={retiredQuery.totalElements}
      />

      <div className="surface-card">
        {/* Selector de pestañas para roles autorizados (ADMIN y COORDINADOR) */}
        {canViewRetired && (
          <div
            role="tablist"
            aria-label="Pestañas de catastro de ejemplares"
            className="flex items-center gap-2 border-b border-neutral-200/90 pb-px mb-5"
          >
            <button
              type="button"
              role="tab"
              id="tab-vigentes"
              aria-selected={currentTab === 'vigentes'}
              aria-controls="panel-vigentes"
              onClick={() => handleTabChange('vigentes')}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer',
                currentTab === 'vigentes'
                  ? 'border-brand-600 text-brand-700 bg-brand-50/20'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
              )}
            >
              <span>Ejemplares vigentes</span>
            </button>

            <button
              type="button"
              role="tab"
              id="tab-retirados"
              aria-selected={currentTab === 'retirados'}
              aria-controls="panel-retirados"
              onClick={() => handleTabChange('retirados')}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer',
                currentTab === 'retirados'
                  ? 'border-brand-600 text-brand-700 bg-brand-50/20'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
              )}
            >
              <span>Ejemplares retirados</span>
            </button>
          </div>
        )}

        {/* Panel de Ejemplares Vigentes */}
        {currentTab === 'vigentes' && (
          <div id="panel-vigentes" role="tabpanel" aria-labelledby="tab-vigentes">
            <SpecimenFiltersBar
              searchValue={searchInput}
              onSearchChange={setSearchInput}
              selectedType={values.type}
              onTypeChange={handleTypeChange}
              availableTypes={vegetationTypes}
              selectedCritical={values.critical}
              onCriticalChange={handleCriticalChange}
              selectedMeasured={values.measured}
              onMeasuredChange={handleMeasuredChange}
              selectedLocation={values.location}
              onLocationChange={handleLocationChange}
              availableLocations={availableLocations}
              sortBy={sortBy}
              onSortByChange={(sort) => setValues({ sort, page: '0' })}
              sortDirection={sortDirection}
              onSortDirectionChange={(dir) => setValues({ dir, page: '0' })}
              totalFilteredCount={totalElements}
              fromItem={totalElements === 0 ? 0 : page * PAGE_SIZE + 1}
              toItem={Math.min((page + 1) * PAGE_SIZE, totalElements)}
              loading={loadingActive}
              onReset={handleResetFilters}
              viewMode={viewMode}
              onViewModeChange={(view) => setValues({ view })}
              selectable={canViewRetired}
              isAllSelected={isAllCurrentPageSelected}
              onToggleSelectAll={handleToggleSelectAll}
              pageItemCount={specimens.length}
            />

            {/* Barra contextual integrada cuando hay ejemplares seleccionados (no flotante) */}
            {canViewRetired && (
              <BulkActionsBar
                selectedCount={selectedCodes.size}
                onClearSelection={handleClearSelection}
                onDeactivate={() => setIsBulkModalOpen(true)}
              />
            )}

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
                loading={loadingActive}
                selectable={canViewRetired}
                selectedCodes={selectedCodes}
                onToggleSelect={handleToggleSelect}
                onToggleSelectAll={handleToggleSelectAll}
                isAllSelected={isAllCurrentPageSelected}
              />
            ) : (
              <SpecimenGrid
                specimens={specimens}
                speciesMap={speciesMap}
                loading={loadingActive}
                page={currentPage}
                totalPages={totalPages}
                totalElements={totalElements}
                pageSize={PAGE_SIZE}
                onPageChange={handlePageChange}
                onClearFilters={handleResetFilters}
                selectable={canViewRetired}
                selectedCodes={selectedCodes}
                onToggleSelect={handleToggleSelect}
              />
            )}
          </div>
        )}

        {/* Panel de Ejemplares Retirados */}
        {currentTab === 'retirados' && (
          <div id="panel-retirados" role="tabpanel" aria-labelledby="tab-retirados" className="space-y-4">
            {/* Barra de búsqueda y selector de vista para retirados */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
              <div className="flex-1">
                <Input
                  id="retired-specimen-search"
                  label=""
                  type="search"
                  autoComplete="off"
                  placeholder="Buscar por código, referencia, especie, motivo o ubicación..."
                  value={searchInput}
                  onChange={setSearchInput}
                  leadingIcon={
                    <svg
                      className="h-4 w-4 text-neutral-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  }
                />
              </div>

              <div className="flex items-center justify-end gap-3 text-xs text-neutral-500 shrink-0">
                {Boolean(searchInput.trim()) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchInput('');
                      setValues({ search: '', page: '0' });
                    }}
                  >
                    Limpiar búsqueda
                  </Button>
                )}

                <SpecimenViewToggle
                  viewMode={viewMode}
                  onViewModeChange={(view) => setValues({ view })}
                />
              </div>
            </div>

            {viewMode === 'table' ? (
              <RetiredSpecimenTable
                specimens={retiredQuery.specimens}
                speciesMap={speciesMap}
                totalElements={retiredQuery.totalElements}
                page={retiredQuery.currentPage}
                pageSize={PAGE_SIZE}
                onPageChange={handlePageChange}
                loading={retiredQuery.loading}
              />
            ) : (
              <RetiredSpecimenGrid
                specimens={retiredQuery.specimens}
                speciesMap={speciesMap}
                loading={retiredQuery.loading}
                page={retiredQuery.currentPage}
                totalPages={retiredQuery.totalPages}
                totalElements={retiredQuery.totalElements}
                pageSize={PAGE_SIZE}
                onPageChange={handlePageChange}
                onClearFilters={() => {
                  setSearchInput('');
                  setValues({ search: '', page: '0' });
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Modal de confirmación de baja masiva para administradores y coordinadores */}
      {canViewRetired && currentTab === 'vigentes' && (
        <BulkDeactivationModal
          isOpen={isBulkModalOpen}
          specimens={selectedSpecimensList}
          speciesMap={speciesMap}
          onClose={() => setIsBulkModalOpen(false)}
          onConfirm={handleConfirmBulkDeactivate}
        />
      )}

      {/* Modal preventivo de confirmación al cambiar filtros con selección activa */}
      <Modal
        isOpen={isFilterConfirmOpen}
        onClose={handleCancelFilterChange}
        title="Cambiar filtros"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="secondary" onClick={handleCancelFilterChange}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleConfirmFilterChange}>
              Continuar y deseleccionar
            </Button>
          </div>
        }
      >
        <p className="text-sm text-neutral-600">
          Has seleccionado{' '}
          <strong className="text-neutral-900 font-semibold">
            {selectedCodes.size} {selectedCodes.size === 1 ? 'ejemplar' : 'ejemplares'}
          </strong>
          . Si cambias los filtros o la búsqueda, se perderá esta selección. ¿Deseas continuar?
        </p>
      </Modal>
    </div>
  );
}

