'use client';

import Link from 'next/link';
import type { ContactSummary } from '@shared/types';
import { DataTable, EmptyState, type DataTableColumn } from '@/components/ui';
import { useContacts } from '@/hooks/useDirectory';
import { useSearchDraft } from '@/hooks/useSearchDraft';
import { DIRECTORY_PAGE_SIZE } from '@/lib/directory-api';

interface ContactsTabProps {
  search: string;
  withoutOrganization: boolean;
  page: number;
  onChange: (patch: { search?: string; sinOrg?: string; page?: string }) => void;
}

const COLUMNS: DataTableColumn<ContactSummary>[] = [
  { key: 'name', header: 'Nombre', render: (c) => (
    <Link href={`/directorio/contactos/${c.code}`} className="font-medium text-forest-800 hover:underline">{c.fullName}</Link>
  ) },
  { key: 'organizations', header: 'Organizaciones', render: (c) => {
    const vigentes = c.organizations.filter((o) => o.active);
    return vigentes.length > 0 ? vigentes.map((o) => o.name).join(', ')
      : <span className="text-alert-warning-fg">Sin organización vigente</span>;
  } },
  { key: 'extension', header: 'Anexo', render: (c) => c.extension ?? '—', hideOnMobile: true },
  { key: 'mobile', header: 'Celular', render: (c) => c.mobile ?? '—', hideOnMobile: true },
];

/**
 * Contactos vigentes. «Sin organización vigente» reúne a los que quedaron sin
 * unidad tras una baja, para que coordinación los reasigne (SPEC-106 §5.5).
 * Se registran desde la ficha de su organización o desde un formulario.
 */
export function ContactsTab({ search, withoutOrganization, page, onChange }: ContactsTabProps) {
  const [draft, setDraft] = useSearchDraft(search, (next) => onChange({ search: next }));
  const { result, loading, errorMessage } = useContacts({ search, withoutOrganization }, page);

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm text-neutral-800">
        <input type="checkbox" checked={withoutOrganization}
          onChange={(e) => onChange({ sinOrg: e.target.checked ? 'true' : '' })} />
        Sin organización vigente
      </label>
      {errorMessage ? (
        <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">
          No se pudo cargar el directorio. {errorMessage}
        </p>
      ) : (
        <DataTable columns={COLUMNS} rows={result.items} rowKey={(c) => c.code} totalElements={result.total}
          page={page} pageSize={DIRECTORY_PAGE_SIZE} onPageChange={(p) => onChange({ page: String(p) })}
          searchValue={draft} onSearchChange={setDraft} loading={loading}
          emptyState={<EmptyState title={search || withoutOrganization ? 'No hay contactos que coincidan' : 'Aún no hay contactos'}
            description={search || withoutOrganization ? undefined
              : 'Regístralos desde la ficha de su organización.'} />} />
      )}
    </div>
  );
}
