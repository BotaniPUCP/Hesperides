'use client';

import { useMemo, useState } from 'react';
import { Button, EmptyState, Input, LoadingSkeleton } from '@/components/ui';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import { useListUrlState } from '@/hooks/useListUrlState';
import { usePreloadedList } from '@/hooks/usePreloadedList';
import { useRequest } from '@/hooks/useRequest';
import { useSearchDraft } from '@/hooks/useSearchDraft';
import { pageFrom } from '@/lib/listUrl';
import { placesApi } from '@/lib/places-api';
import { referenceQueueList } from '@/lib/preload/placeLists';
import { pageOf } from '@/lib/search/pageOf';
import { filterByText } from '@/lib/search/searchText';
import { useCanEditPlaces } from '../edit/useCanEditPlaces';
import { MIGRATION_PATH } from '../edit/returnPath';
import { MigrationGroupCard } from './MigrationGroupCard';
import { PageHeader } from '@/components/layouts/PageHeader';

const PAGE_SIZE = 20;
const DEFAULTS = { search: '', page: '' };

/**
 * La cola de migración de las referencias antiguas al catálogo. Cada grupo
 * (mismo nombre) se enlaza a un lugar, y quizás a una de sus perspectivas, o se
 * descarta. Lo no decidido sigue funcionando como hoy. La cola se carga una vez y se busca
 * y pagina en el navegador; enlazar o descartar la vuelve a pedir (SPEC-119).
 */
export function ReferenceMigrationScreen() {
  const canEdit = useCanEditPlaces();
  // En la URL: al volver de crear un lugar, la cola sigue en la misma búsqueda y página.
  const { values, setValues, query } = useListUrlState(MIGRATION_PATH, DEFAULTS);
  const [search, setSearch] = useSearchDraft(values.search, (next) => setValues({ search: next, page: '' }));
  const page = pageFrom(values.page);
  const setPage = (next: number) => setValues({ page: next === 0 ? '' : String(next) });
  const [version, setVersion] = useState(0);
  const queue = usePreloadedList(referenceQueueList, canEdit);
  const matching = useMemo(() => filterByText(queue.items, search), [queue.items, search]);
  const shown = pageOf(matching, page, PAGE_SIZE);
  useListScrollRestoration(MIGRATION_PATH, query, queue.loaded);
  const progress = useRequest(canEdit ? `progress:${version}` : null, () => placesApi.migrationProgress());
  const refresh = () => setVersion((v) => v + 1);

  if (!canEdit) {
    return <EmptyState title="Sin permiso" description="Solo administración y coordinación migran las referencias." />;
  }

  const p = progress.data;
  const totalPages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  return (
    <div className="space-y-6">
      <PageHeader title="Migrar referencias" description="Cada referencia antigua se enlaza a un lugar del catálogo (su nombre queda como alias) o se descarta. Las sugerencias miran el nombre y la cercanía en el mapa; nada se enlaza sin tu clic." />

      {p && (
        <div className="surface-card">
          <p className="text-sm font-semibold text-neutral-800">{`${p.linked + p.discarded} de ${p.total} referencias decididas`}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100" aria-hidden="true">
            <div className="h-full bg-brand-600" style={{ width: `${p.total ? ((p.linked + p.discarded) / p.total) * 100 : 0}%` }} />
          </div>
          <p className="mt-1 text-xs text-neutral-500">{`${p.linked} enlazadas · ${p.discarded} descartadas · ${p.pending} pendientes`}</p>
        </div>
      )}

      <div className="surface-card">
        <Input id="migracion-buscar" label="Buscar" type="search" value={search} onChange={setSearch}
        placeholder="Parte del nombre: gelarti, pabellón, espalda…" />
      </div>

      {queue.errorMessage && !queue.loaded && <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{queue.errorMessage}</p>}
      {!queue.loaded ? (
        !queue.errorMessage && <LoadingSkeleton variant="card" count={3} />
      ) : matching.length === 0 ? (
        <EmptyState title="No quedan referencias pendientes" description={search ? 'Ninguna pendiente coincide con la búsqueda.' : 'La migración terminó.'} />
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.rows.map((g) => (
            <li key={g.referenceCodes.join(',')}>
              <MigrationGroupCard group={g} onDecided={refresh} />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="surface-card flex items-center justify-between">
          <Button variant="secondary" size="sm" disabled={shown.page === 0} onClick={() => setPage(shown.page - 1)}>← Anterior</Button>
          <span className="text-xs text-neutral-600">{`Página ${shown.page + 1} de ${totalPages}`}</span>
          <Button variant="secondary" size="sm" disabled={shown.page >= totalPages - 1} onClick={() => setPage(shown.page + 1)}>Siguiente →</Button>
        </div>
      )}
    </div>
  );
}
