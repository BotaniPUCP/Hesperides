'use client';

import Link from 'next/link';
import type { OrganizationSummary } from '@shared/types';
import { Button, DataTable, EmptyState, type DataTableColumn } from '@/components/ui';
import { useOrganizations } from '@/hooks/useDirectory';
import { useSearchDraft } from '@/hooks/useSearchDraft';
import { DIRECTORY_PAGE_SIZE } from '@/lib/directory-api';

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

/** Organizaciones vigentes, con buscador por nombre o alias y filtro por tipo. */
export function OrganizationsTab({ search, typeCode, page, onChange }: OrganizationsTabProps) {
  const [draft, setDraft] = useSearchDraft(search, (next) => onChange({ search: next }));
  const { result, loading, errorMessage } = useOrganizations({ search, typeCode }, page);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de organización">
          {TYPE_FILTERS.map((t) => (
            <Button key={t.code} size="sm" variant={typeCode === t.code ? 'primary' : 'secondary'}
              onClick={() => onChange({ type: t.code })}>{t.label}</Button>
          ))}
        </div>
      </div>
      {errorMessage ? (
        <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">
          No se pudo cargar el directorio. {errorMessage}
        </p>
      ) : (
        <DataTable columns={COLUMNS} rows={result.items} rowKey={(o) => o.code} totalElements={result.total}
          page={page} pageSize={DIRECTORY_PAGE_SIZE} onPageChange={(p) => onChange({ page: String(p) })}
          searchValue={draft} onSearchChange={setDraft} loading={loading}
          emptyState={<EmptyState title={search || typeCode ? 'No hay organizaciones que coincidan' : 'Aún no hay organizaciones'}
            description={search || typeCode ? 'Prueba con otro nombre o sigla.' : undefined} />} />
      )}
    </div>
  );
}
