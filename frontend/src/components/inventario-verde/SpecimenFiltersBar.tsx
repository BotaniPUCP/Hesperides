'use client';

import type { SpecimenSortKey, SpecimenViewMode } from '@shared/types';
import { Input } from '@/components/ui';
import { SpecimenViewToggle } from './SpecimenViewToggle';

export interface SpecimenFiltersBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedLocation: string;
  onLocationChange: (loc: string) => void;
  availableLocations: { location: string; count: number }[];
  sortBy: SpecimenSortKey;
  onSortByChange: (sort: SpecimenSortKey) => void;
  sortDirection: 'asc' | 'desc';
  onSortDirectionChange: (dir: 'asc' | 'desc') => void;
  totalFilteredCount: number;
  fromItem?: number;
  toItem?: number;
  loading?: boolean;
  onReset?: () => void;
  viewMode?: SpecimenViewMode;
  onViewModeChange?: (mode: SpecimenViewMode) => void;
}

export function SpecimenFiltersBar({
  searchValue,
  onSearchChange,
  selectedLocation,
  onLocationChange,
  availableLocations,
  sortBy,
  onSortByChange,
  sortDirection,
  onSortDirectionChange,
  totalFilteredCount,
  fromItem = 1,
  toItem = totalFilteredCount,
  loading = false,
  onReset,
  viewMode = 'cards',
  onViewModeChange,
}: SpecimenFiltersBarProps) {
  const hasActiveFilters =
    Boolean(searchValue.trim()) ||
    selectedLocation !== 'ALL' ||
    sortBy !== 'code' ||
    sortDirection !== 'asc';

  function handleSortSelect(val: string) {
    const [field, dir] = val.split(':');
    onSortByChange(field as SpecimenSortKey);
    onSortDirectionChange((dir as 'asc' | 'desc') || 'asc');
  }

  return (
    <div className="flex flex-col gap-4 mb-4">
      {/* Fila superior: Buscador de ejemplares y Selector de ubicación alineados */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1">
          <Input
            id="specimen-search"
            label=""
            type="search"
            autoComplete="off"
            value={searchValue}
            onChange={onSearchChange}
            placeholder="Buscar por código, referencia (ej. p01), especie o notas..."
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
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
          />
        </div>

        <div className="sm:w-60 shrink-0">
          <select
            id="specimen-location-filter"
            value={selectedLocation}
            onChange={(e) => onLocationChange(e.target.value)}
            className="w-full h-10 text-xs font-semibold text-neutral-800 bg-neutral-0 border border-neutral-200/90 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-forest-600 cursor-pointer shadow-2xs hover:border-neutral-300 transition-colors"
          >
            <option value="ALL">Todas las ubicaciones</option>
            {availableLocations.map((loc) => (
              <option key={loc.location} value={loc.location}>
                {loc.location} ({loc.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Fila inferior: Estado a la izquierda y controles a la derecha en una sola línea */}
      <div className="flex items-center justify-between gap-3 text-xs text-neutral-500 pt-1 border-b border-neutral-100 pb-3 min-h-[42px]">
        {/* Lado izquierdo: Cantidad de ejemplares coincidentes / estado de carga */}
        <div className="flex items-center gap-3 whitespace-nowrap">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-neutral-500 py-0.5" role="status">
              <span
                className="h-3.5 w-3.5 rounded-full border-2 border-forest-600 border-t-transparent animate-spin"
                aria-hidden="true"
              />
              <span>Actualizando catálogo...</span>
            </div>
          ) : (
            <span>
              Mostrando{' '}
              <strong className="text-neutral-800 font-semibold">{fromItem}</strong>–
              <strong className="text-neutral-800 font-semibold">{toItem}</strong> de{' '}
              <strong className="text-neutral-900 font-semibold">{totalFilteredCount}</strong>{' '}
              {totalFilteredCount === 1 ? 'ejemplar' : 'ejemplares'}
            </span>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-brand-700 hover:text-brand-900 hover:underline font-medium"
            >
              Restablecer filtros
            </button>
          )}
        </div>

        {/* Lado derecho: Ordenamiento y modo de vista en una sola línea */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <label htmlFor="specimen-sort-select" className="text-neutral-500 font-medium shrink-0">
              Ordenar por:
            </label>
            <select
              id="specimen-sort-select"
              value={`${sortBy}:${sortDirection}`}
              onChange={(e) => handleSortSelect(e.target.value)}
              className="text-xs font-semibold text-neutral-800 bg-neutral-0 border border-neutral-200/90 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-forest-600 cursor-pointer shadow-2xs hover:border-neutral-300 transition-colors"
            >
              <option value="code:asc">Código (EV)</option>
              <option value="reference:asc">Referencia (A - Z)</option>
              <option value="reference:desc">Referencia (Z - A)</option>
              <option value="location:asc">Ubicación (A - Z)</option>
            </select>
          </div>

          {onViewModeChange && (
            <SpecimenViewToggle
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
