'use client';

import type { PlaceKindCode } from '@shared/types';
import { Input, Select } from '@/components/ui';
import { useCatalog } from '@/hooks/useCatalog';
import { cn } from '@/lib/cn';

export type KindFilter = PlaceKindCode | null;

/** Mismo catálogo que las referencias: una sola lista de categorías para ambos. */
const CATEGORY_CATALOG = 'REFERENCE_CATEGORY';

const KINDS: { value: KindFilter; label: string }[] = [
  { value: null, label: 'Todos' },
  { value: 'OUTDOOR', label: 'Exterior' },
  { value: 'INDOOR', label: 'Interior' },
];

export interface PlaceFiltersProps {
  search: string;
  onSearch: (value: string) => void;
  category: string | null;
  onCategory: (code: string | null) => void;
  kind: KindFilter;
  onKind: (kind: KindFilter) => void;
}

export function PlaceFilters({ search, onSearch, category, onCategory, kind, onKind }: PlaceFiltersProps) {
  const { items, isLoading } = useCatalog(CATEGORY_CATALOG);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-0 p-4 shadow-xs md:flex-row md:items-end">
      <div className="md:flex-1">
        <Input
          id="lugares-buscar"
          label="Buscar"
          type="search"
          value={search}
          onChange={onSearch}
          placeholder="Nombre, alias o perspectiva: «espalda de civil», «lmed»…"
        />
      </div>
      <div className="md:w-60">
        <Select
          id="lugares-categoria"
          label="Categoría"
          value={category}
          onChange={(o) => onCategory(o?.code ?? null)}
          options={items.map((i, indice) => ({ id: indice + 1, code: i.code, label: i.label }))}
          placeholder="Todas"
          loading={isLoading}
          clearable
        />
      </div>
      <div role="group" aria-label="Tipo de lugar" className="flex gap-1">
        {KINDS.map((k) => (
          <button
            key={k.label}
            type="button"
            aria-pressed={kind === k.value}
            onClick={() => onKind(k.value)}
            className={cn(
              'h-10 rounded-md border px-3 text-sm',
              kind === k.value
                ? 'border-brand-600 bg-brand-50 font-semibold text-brand-800'
                : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50',
            )}
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  );
}
