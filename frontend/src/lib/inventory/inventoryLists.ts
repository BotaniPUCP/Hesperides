import type { Species, SpeciesFilters, SpecimenFilters, SpecimenListItem, SpecimenSortKey } from '@shared/types';
import { filterByText } from '@/lib/search/searchText';

/**
 * Filtros y orden del inventario sobre las listas precargadas (SPEC-119). Reproducen lo que hacían
 * las consultas del backend: «ALL» o un filtro sin valor no filtran.
 */

const ALL = 'ALL';
const chosen = (value?: string) => (value && value !== ALL ? value : undefined);

export interface SpecimenListFilters extends Omit<SpecimenFilters, 'sortBy' | 'sortDirection'> {
  /** Solo los de una especie: la ficha de la especie. */
  slug?: string | null;
}

export function specimensMatching(items: SpecimenListItem[], filters: SpecimenListFilters): SpecimenListItem[] {
  const location = chosen(filters.location);
  const type = chosen(filters.vegetationType);
  return filterByText(items, filters.search ?? '').filter((s) =>
    (!filters.slug || s.speciesSlug === filters.slug)
    && (!location || s.sourceLocation === location)
    && (!type || s.vegetationTypeCode === type)
    && (filters.critical === undefined || s.speciesCritical === filters.critical)
    && (filters.measured === undefined || s.measured === filters.measured));
}

/** El catálogo normal muestra las activas; «en proceso de retiro», las inactivas con ejemplares. */
export function speciesMatching(items: Species[], filters: SpeciesFilters): Species[] {
  const type = chosen(filters.vegetationType);
  const active = filters.retiring !== true;
  return filterByText(items, filters.search ?? '')
    .filter((s) => s.isActive === active && (!type || s.vegetationTypeCode === type));
}

type SortValue = string | number | null;

const LETTERS_FIRST = /^\D*/;
const FIRST_NUMBER = /\d+/;

/** «p2» antes que «p10»: primero el prefijo de letras, después el número (como SPECIMEN_ORDER). */
function referenceKey(s: SpecimenListItem): SortValue[] {
  const ref = s.sourceReference;
  if (ref === null || ref === undefined) return [null, null];
  const digits = ref.match(FIRST_NUMBER);
  return [(ref.match(LETTERS_FIRST)?.[0] ?? '').toLowerCase(), digits ? Number(digits[0]) : null];
}

const SORT_KEYS: Record<SpecimenSortKey, (s: SpecimenListItem) => SortValue[]> = {
  code: (s) => [s.code],
  location: (s) => [s.sourceLocation],
  reference: referenceKey,
};

/** Como PostgreSQL: los vacíos van al final al subir y al principio al bajar. */
function compareValue(a: SortValue, b: SortValue): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
}

function compareKeys(a: SortValue[], b: SortValue[]): number {
  for (let i = 0; i < a.length; i++) {
    const result = compareValue(a[i], b[i]);
    if (result !== 0) return result;
  }
  return 0;
}

/** Ordena una copia; a igualdad decide el código, siempre de menor a mayor. */
export function sortSpecimens(items: SpecimenListItem[], sortBy: SpecimenSortKey, direction: 'asc' | 'desc'): SpecimenListItem[] {
  const key = SORT_KEYS[sortBy];
  const sign = direction === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => sign * compareKeys(key(a), key(b)) || a.code.localeCompare(b.code));
}
