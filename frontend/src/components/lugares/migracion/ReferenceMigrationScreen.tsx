'use client';

import { useState } from 'react';
import { Breadcrumb, Button, EmptyState, Input, LoadingSkeleton } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useRequest } from '@/hooks/useRequest';
import { placesApi } from '@/lib/places-api';
import { useCanEditPlaces } from '../edit/useCanEditPlaces';
import { MigrationGroupCard } from './MigrationGroupCard';

const PAGE_SIZE = 20;

/**
 * La cola de migración de las referencias antiguas al catálogo. Cada grupo
 * (mismo nombre) se enlaza a un lugar, y quizás a una de sus perspectivas, o se
 * descarta. Lo no decidido sigue funcionando como hoy.
 */
export function ReferenceMigrationScreen() {
  const canEdit = useCanEditPlaces();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [version, setVersion] = useState(0);
  const debounced = useDebouncedValue(search, 300);
  const queue = useRequest(canEdit ? `${debounced}:${page}:${version}` : null, () =>
    placesApi.referenceQueue(debounced, page, PAGE_SIZE),
  );
  const progress = useRequest(canEdit ? `progress:${version}` : null, () => placesApi.migrationProgress());
  const refresh = () => setVersion((v) => v + 1);

  if (!canEdit) {
    return <EmptyState title="Sin permiso" description="Solo administración y coordinación migran las referencias." />;
  }

  const p = progress.data;
  const totalPages = Math.max(1, Math.ceil((queue.data?.totalGroups ?? 0) / PAGE_SIZE));
  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb items={[{ label: 'Lugares', href: '/lugares' }, { label: 'Migración de referencias' }]} />
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">Migración de referencias</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Cada referencia antigua se enlaza a un lugar del catálogo (su nombre queda como alias) o se descarta. Las
          sugerencias miran el nombre y la cercanía en el mapa; nada se enlaza sin tu clic.
        </p>
      </header>

      {p && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-0 p-4">
          <p className="text-sm font-semibold text-neutral-800">{`${p.linked + p.discarded} de ${p.total} referencias decididas`}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100" aria-hidden="true">
            <div className="h-full bg-brand-600" style={{ width: `${p.total ? ((p.linked + p.discarded) / p.total) * 100 : 0}%` }} />
          </div>
          <p className="mt-1 text-xs text-neutral-500">{`${p.linked} enlazadas · ${p.discarded} descartadas · ${p.pending} pendientes`}</p>
        </div>
      )}

      <Input id="migracion-buscar" label="Buscar" type="search" value={search} onChange={(v) => { setSearch(v); setPage(0); }}
        placeholder="Parte del nombre: gelarti, pabellón, espalda…" />

      {queue.errorMessage && <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{queue.errorMessage}</p>}
      {queue.loading ? (
        <LoadingSkeleton variant="card" count={3} />
      ) : queue.data && queue.data.groups.length === 0 ? (
        <EmptyState title="No quedan referencias pendientes" description={search ? 'Ninguna pendiente coincide con la búsqueda.' : 'La migración terminó.'} />
      ) : (
        <ul className="flex flex-col gap-3">
          {queue.data?.groups.map((g) => (
            <li key={g.referenceCodes.join(',')}>
              <MigrationGroupCard group={g} onDecided={refresh} />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>← Anterior</Button>
          <span className="text-xs text-neutral-600">{`Página ${page + 1} de ${totalPages}`}</span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Siguiente →</Button>
        </div>
      )}
    </div>
  );
}
