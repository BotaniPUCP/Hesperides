'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { ContactSummary } from '@shared/types';
import { DataTable, EmptyState, type DataTableColumn } from '@/components/ui';
import { useContactList } from '@/hooks/useDirectory';
import { useSearchDraft } from '@/hooks/useSearchDraft';
import { DIRECTORY_PAGE_SIZE } from '@/lib/directory-api';
import { pageOf } from '@/lib/search/pageOf';
import { filterByText } from '@/lib/search/searchText';

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
 * Se registran en «Registro individual», desde la ficha de su organización o desde un formulario.
 * La lista se carga una vez y se filtra en el navegador mientras se escribe (SPEC-119).
 */
export function ContactsTab({ search, withoutOrganization, page, onChange }: ContactsTabProps) {
  const [draft, setDraft] = useSearchDraft(search, (next) => onChange({ search: next }));
  const { items, loaded, errorMessage } = useContactList();
  const matching = useMemo(() => filterByText(items, draft)
    // La tabla es de vigentes; los dados de baja solo siguen en los buscadores.
    .filter((c) => c.active && (!withoutOrganization || !c.organizations.some((o) => o.active))),
  [items, draft, withoutOrganization]);
  const shown = pageOf(matching, page, DIRECTORY_PAGE_SIZE);

  return (
    <div className="surface-card space-y-4">
      <label className="flex items-center gap-2 text-sm text-neutral-800">
        <input type="checkbox" checked={withoutOrganization}
          onChange={(e) => onChange({ sinOrg: e.target.checked ? 'true' : '' })} />
        Sin organización vigente
      </label>
      {errorMessage && !loaded ? (
        <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">
          No se pudo cargar el directorio. {errorMessage}
        </p>
      ) : (
        <DataTable columns={COLUMNS} rows={shown.rows} rowKey={(c) => c.code} totalElements={matching.length}
          page={shown.page} pageSize={DIRECTORY_PAGE_SIZE} onPageChange={(p) => onChange({ page: String(p) })}
          searchValue={draft} onSearchChange={setDraft} loading={!loaded}
          emptyState={<EmptyState title={draft || withoutOrganization ? 'No hay contactos que coincidan' : 'Aún no hay contactos'}
            description={draft || withoutOrganization ? undefined
              : 'Regístralos en «Registro individual» o desde la ficha de su organización.'} />} />
      )}
    </div>
  );
}
