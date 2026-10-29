'use client';

import type { VegetationType } from '@shared/types';
import { cn } from '@/lib/cn';
import { Input } from '@/components/ui';

export interface VegetationTypeFilterProps {
  types: VegetationType[];
  selectedType?: string;
  onSelectType: (typeCode: string) => void;
  totalAllCount: number;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
}

export function VegetationTypeFilter({
  types,
  selectedType = 'ALL',
  onSelectType,
  totalAllCount,
  searchValue = '',
  onSearchChange,
}: VegetationTypeFilterProps) {
  const allChips = [
    { code: 'ALL', label: 'Todos', count: totalAllCount },
    ...types,
  ];

  return (
    <div className="flex flex-col gap-4 mb-5">
      {/* Buscador de especies botanicalmente enfocado, cargando directamente en el inventario */}
      {onSearchChange && (
        <div className="w-full">
          <Input
            id="species-search-input"
            label=""
            type="search"
            autoComplete="off"
            value={searchValue}
            onChange={onSearchChange}
            placeholder="Buscar por nombre común, científico, o familia (ej. Palmera real, Roystonea, Arecaceae)..."
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
      )}

      {/* Chips de tipo de vegetación */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
          Tipo de vegetación
        </label>

        <div className="flex flex-wrap items-center gap-2 overflow-visible p-1" role="tablist" aria-label="Tipos de vegetación">
          {allChips.map((chip) => {
            const isSelected = selectedType === chip.code;

            return (
              <button
                key={chip.code}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onSelectType(chip.code)}
                title={typeof chip.count === 'number' ? `${chip.label}: ${chip.count} ${chip.count === 1 ? 'ejemplar censado' : 'ejemplares censados'} en campus` : chip.label}
                className={cn(
                  'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs transition-all duration-150 select-none border focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2',
                  isSelected
                    ? 'bg-forest-800 text-white border-forest-800 font-semibold shadow-xs'
                    : 'bg-neutral-0 text-neutral-700 border-neutral-200 font-medium hover:bg-neutral-100 hover:text-neutral-900 hover:border-neutral-300'
                )}
              >
                <span>{chip.label}</span>
                {typeof chip.count === 'number' && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
                      isSelected
                        ? 'bg-forest-700 text-white'
                        : 'bg-neutral-100 text-neutral-600'
                    )}
                  >
                    {chip.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
