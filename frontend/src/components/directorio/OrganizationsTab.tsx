'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { OrganizationSummary } from '@shared/types';
import { Button, DataTable, EmptyState, type DataTableColumn } from '@/components/ui';
import { useOrganizationList } from '@/hooks/useDirectory';
import { useSearchDraft } from '@/hooks/useSearchDraft';
import { DIRECTORY_PAGE_SIZE } from '@/lib/directory-api';
import { pageOf } from '@/lib/search/pageOf';
import { filterByText } from '@/lib/search/searchText';

interface OrganizationsTabProps {
  search: string;
  typeCode: string;
  page: number;
  onChange: (patch: { search?: string; type?: string; page?: string }) => void;
}

const TYPE_FILTERS = [
  { code: '', label: 'Todas' },
  { code: 'PUCP_UNIT', label: 'Unidades PUCP' },
  { code: 'EXTERNAL_COMPANY', label: 'Empresas externas' },
];

const COLUMNS: DataTableColumn<OrganizationSummary>[] = [
  { key: 'name', header: 'Nombre', render: (o) => (
    <Link href={`/directorio/${o.code}`} className="font-medium text-forest-800 hover:underline">{o.name}</Link>
  ) },
  { key: 'type', header: 'Tipo', render: (o) => o.type.label },
  { key: 'phone', header: 'Teléfono', render: (o) => o.phone ?? '—', hideOnMobile: true },
  { key: 'contacts', header: 'Contactos', render: (o) => String(o.contactCount) },
];

/**
 * Organizaciones vigentes, con buscador por nombre, RUC o alias y filtro por tipo. La lista se
 * carga una vez y se filtra en el navegador mientras se escribe (SPEC-119).
 */
export function OrganizationsTab({ search, typeCode, page, onChange }: OrganizationsTabProps) {
  const [draft, setDraft] = useSearchDraft(search, (next) => onChange({ search: next }));
  const { items, loaded, errorMessage } = useOrganizationList();
  const matching = useMemo(() => filterByText(items, draft).filter((o) => !typeCode || o.type.code === typeCode),
    [items, draft, typeCode]);
  const shown = pageOf(matching, page, DIRECTORY_PAGE_SIZE);

  return (
    <div className="surface-card space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-neutral-700">Tipo</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de organización">
          {TYPE_FILTERS.map((t) => (
            <Button key={t.code} size="sm" variant={typeCode === t.code ? 'primary' : 'secondary'}
              onClick={() => onChange({ type: t.code })}>{t.label}</Button>
          ))}
        </div>
      </div>
      {errorMessage && !loaded ? (
        <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">
          No se pudo cargar el directorio. {errorMessage}
        </p>
      ) : (
        <DataTable columns={COLUMNS} rows={shown.rows} rowKey={(o) => o.code} totalElements={matching.length}
          page={shown.page} pageSize={DIRECTORY_PAGE_SIZE} onPageChange={(p) => onChange({ page: String(p) })}
          searchValue={draft} onSearchChange={setDraft} loading={!loaded}
          emptyState={<EmptyState title={draft || typeCode ? 'No hay organizaciones que coincidan' : 'Aún no hay organizaciones'}
            description={draft || typeCode ? 'Prueba con otro nombre o sigla.' : undefined} />} />
      )}
    </div>
  );
}
