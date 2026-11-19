'use client';

import { useMemo } from 'react';
import type { PlaceKindCode } from '@shared/types';
import { EmptyState, LoadingSkeleton } from '@/components/ui';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import { useListUrlState } from '@/hooks/useListUrlState';
import { usePlaceList } from '@/hooks/usePlaces';
import { useSearchDraft } from '@/hooks/useSearchDraft';
import { oneOf } from '@/lib/listUrl';
import { filterByText } from '@/lib/search/searchText';
import { PlaceCard } from './PlaceCard';
import { PlaceFilters } from './PlaceFilters';
import { PageHeader } from '@/components/layouts/PageHeader';

const LIST_PATH = '/lugares';
const KIND_CODES: readonly (PlaceKindCode | '')[] = ['', 'OUTDOOR', 'INDOOR'];
const DEFAULTS = { search: '', category: '', kind: '' };

/**
 * El catálogo de lugares: tarjetas con buscador, categoría y tipo. Los filtros
 * viven en la URL para encontrarlos igual al regresar de una ficha. El catálogo se
 * carga una vez y se filtra en el navegador mientras se escribe (SPEC-119).
 */
export function LugaresScreen() {
  const { values, setValues, query } = useListUrlState(LIST_PATH, DEFAULTS);
  const [search, setSearch] = useSearchDraft(values.search, (next) => setValues({ search: next }));
  const category = values.category || null;
  const kind = oneOf(values.kind, KIND_CODES, '') || null;
  const { items, loaded, errorMessage } = usePlaceList();
  const loading = !loaded;
  const places = useMemo(() => filterByText(items, search)
    .filter((p) => (!category || p.category.code === category) && (!kind || p.kind.code === kind)),
  [items, search, category, kind]);
  useListScrollRestoration(LIST_PATH, query, !loading);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo de lugares"
        description="Edificios, jardines, estacionamientos y complejos, con fotos desde sus alrededores para ubicar un trabajo sin volver al sitio."
      />

      <PlaceFilters
        search={search}
        onSearch={setSearch}
        category={category}
        onCategory={(next) => setValues({ category: next ?? '' })}
        kind={kind}
        onKind={(next) => setValues({ kind: next ?? '' })}
      />

      {errorMessage && !loaded ? (
        <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">
          No se pudo cargar el catálogo. {errorMessage}
        </p>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <LoadingSkeleton key={i} variant="card" />
          ))}
        </div>
      ) : places.length === 0 ? (
        <EmptyState title="No hay lugares que coincidan" description="Prueba con otro nombre o quita los filtros." />
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {places.map((p) => (
            <li key={p.code}>
              <PlaceCard place={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
}
