'use client';

import { useState } from 'react';
import { EmptyState, LoadingSkeleton } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePlaces } from '@/hooks/usePlaces';
import { PlaceCard } from './PlaceCard';
import { PlaceFilters, type KindFilter } from './PlaceFilters';

/** El catálogo de lugares: tarjetas con buscador, categoría y tipo. */
export function LugaresScreen() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [kind, setKind] = useState<KindFilter>(null);
  const debounced = useDebouncedValue(search, 300);
  const { places, loading, errorMessage } = usePlaces({
    search: debounced || undefined,
    category: category ?? undefined,
    kind: kind ?? undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">Lugares del campus</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Edificios, jardines, estacionamientos y complejos, con fotos desde sus alrededores para ubicar un trabajo sin
          volver al sitio.
        </p>
      </header>

      <PlaceFilters
        search={search}
        onSearch={setSearch}
        category={category}
        onCategory={setCategory}
        kind={kind}
        onKind={setKind}
      />

      {errorMessage ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
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
