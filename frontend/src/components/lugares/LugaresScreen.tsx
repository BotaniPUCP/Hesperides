'use client';

import Link from 'next/link';
import type { PlaceKindCode } from '@shared/types';
import { EmptyState, LoadingSkeleton } from '@/components/ui';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import { useListUrlState } from '@/hooks/useListUrlState';
import { usePlaces } from '@/hooks/usePlaces';
import { useSearchDraft } from '@/hooks/useSearchDraft';
import { oneOf } from '@/lib/listUrl';
import { useCanEditPlaces } from './edit/useCanEditPlaces';
import { PlaceCard } from './PlaceCard';
import { PlaceFilters } from './PlaceFilters';
import { PageHeader } from '@/components/layouts/PageHeader';

const LIST_PATH = '/lugares';
const KIND_CODES: readonly (PlaceKindCode | '')[] = ['', 'OUTDOOR', 'INDOOR'];
const DEFAULTS = { search: '', category: '', kind: '' };

/**
 * El catálogo de lugares: tarjetas con buscador, categoría y tipo. Los filtros
 * viven en la URL para encontrarlos igual al regresar de una ficha.
 */
export function LugaresScreen() {
  const { values, setValues, query } = useListUrlState(LIST_PATH, DEFAULTS);
  const [search, setSearch] = useSearchDraft(values.search, (next) => setValues({ search: next }));
  const category = values.category || null;
  const kind = oneOf(values.kind, KIND_CODES, '') || null;
  const canEdit = useCanEditPlaces();
  const { places, loading, errorMessage } = usePlaces({
    search: values.search || undefined,
    category: category ?? undefined,
    kind: kind ?? undefined,
  });
  useListScrollRestoration(LIST_PATH, query, !loading);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo de lugares"
        description="Edificios, jardines, estacionamientos y complejos, con fotos desde sus alrededores para ubicar un trabajo sin volver al sitio."
        actions={canEdit && (<>
            <Link href="/lugares/migracion" className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
              Migrar referencias
            </Link>
            <Link href="/lugares/nuevo" className="rounded-md bg-forest-700 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-800">
              Nuevo lugar
            </Link>
          </>)}
      />

      <PlaceFilters
        search={search}
        onSearch={setSearch}
        category={category}
        onCategory={(next) => setValues({ category: next ?? '' })}
        kind={kind}
        onKind={(next) => setValues({ kind: next ?? '' })}
      />

      {errorMessage ? (
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
