'use client';

import type { VegetationType } from '@shared/types';
import { cn } from '@/lib/cn';

export interface VegetationTypeFilterProps {
  types: VegetationType[];
  selectedType?: string;
  onSelectType: (typeCode: string) => void;
  totalAllCount: number;
}

export function VegetationTypeFilter({
  types,
  selectedType = 'ALL',
  onSelectType,
  totalAllCount,
}: VegetationTypeFilterProps) {
  const allChips = [
    { code: 'ALL', label: 'Todos', count: totalAllCount },
    ...types,
  ];

  return (
    <div className="flex flex-col gap-2 mb-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Filtrar por tipo de vegetación
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 overflow-x-auto py-2 px-1" role="tablist" aria-label="Tipos de vegetación">
        {allChips.map((chip) => {
          const isSelected = selectedType === chip.code;

          return (
            <button
              key={chip.code}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectType(chip.code)}
              className={cn(
                'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs transition-all duration-150 select-none border focus:outline-none focus:ring-2 focus:ring-offset-2',
                isSelected
                  ? 'bg-forest-900 text-white border-forest-900 font-semibold shadow-sm ring-2 ring-forest-700 ring-offset-1 focus:ring-forest-700'
                  : 'bg-neutral-0 text-neutral-700 border-neutral-200 font-medium hover:bg-neutral-100 hover:text-neutral-900 hover:border-neutral-500 focus:ring-brand-600'
              )}
            >
              <span>{chip.label}</span>
              {typeof chip.count === 'number' && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px]',
                    isSelected
                      ? 'bg-forest-700 text-white font-bold'
                      : 'bg-neutral-100 text-neutral-700 font-semibold'
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
  );
}
