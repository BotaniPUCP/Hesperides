'use client';

import { Select, Input } from '@/components/ui';

export interface SpecimenFiltersBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedLocation: string;
  onLocationChange: (loc: string) => void;
  availableLocations: { location: string; count: number }[];
  sortBy: 'reference' | 'code' | 'location';
  onSortByChange: (sort: 'reference' | 'code' | 'location') => void;
  sortDirection: 'asc' | 'desc';
  onSortDirectionChange: (dir: 'asc' | 'desc') => void;
  totalFilteredCount: number;
}

/**
 * Barra de herramientas de consulta y filtrado de ejemplares.
 * Diseñada con estética SaaS profesional para escaneo y filtrado rápido.
 */
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
}: SpecimenFiltersBarProps) {
  const locationOptions = [
    { id: 0, code: 'ALL', label: 'Todos los sectores' },
    ...availableLocations.map((l, index) => ({
      id: index + 1,
      code: l.location,
      label: `${l.location} (${l.count})`,
    })),
  ];

  const sortOptions = [
    { id: 1, code: 'reference:asc', label: 'Referencia (A - Z)' },
    { id: 2, code: 'reference:desc', label: 'Referencia (Z - A)' },
    { id: 3, code: 'code:asc', label: 'Código de inventario' },
    { id: 4, code: 'location:asc', label: 'Sector (A - Z)' },
  ];

  function handleSortSelect(val: string) {
    const [field, dir] = val.split(':');
    onSortByChange(field as 'reference' | 'code' | 'location');
    onSortDirectionChange((dir as 'asc' | 'desc') || 'asc');
  }

  return (
    <div className="flex flex-col gap-3 mb-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Campo de búsqueda */}
        <div className="flex-1 max-w-md">
          <Input
            id="specimen-search"
            label=""
            type="search"
            value={searchValue}
            onChange={onSearchChange}
            placeholder="Buscar por referencia (ej. p01), código o sector..."
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

        {/* Filtros selectores compactos */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de sector */}
          <div className="w-48 sm:w-52">
            <Select
              id="specimen-location-filter"
              label=""
              options={locationOptions}
              value={selectedLocation}
              onChange={(opt) => onLocationChange(opt?.code || 'ALL')}
            />
          </div>

          {/* Selector de ordenamiento */}
          <div className="w-52 sm:w-56">
            <Select
              id="specimen-sort-select"
              label=""
              options={sortOptions}
              value={`${sortBy}:${sortDirection}`}
              onChange={(opt) => handleSortSelect(opt?.code || 'reference:asc')}
            />
          </div>
        </div>
      </div>

      {/* Barra de estado con conteo de resultados */}
      <div className="flex items-center justify-between text-xs text-neutral-500 px-0.5">
        <span>
          Mostrando{' '}
          <strong className="text-neutral-900 font-semibold">{totalFilteredCount}</strong>{' '}
          {totalFilteredCount === 1 ? 'ejemplar coincidente' : 'ejemplares coincidentes'}
        </span>
        {selectedLocation !== 'ALL' && (
          <button
            type="button"
            onClick={() => onLocationChange('ALL')}
            className="text-xs text-brand-700 hover:text-brand-900 hover:underline font-medium"
          >
            Quitar filtro de sector
          </button>
        )}
      </div>
    </div>
  );
}
