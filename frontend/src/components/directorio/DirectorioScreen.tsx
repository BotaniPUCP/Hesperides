'use client';

import Link from 'next/link';
import { useCanMaintainDirectory } from '@/hooks/useDirectory';
import { useListUrlState } from '@/hooks/useListUrlState';
import { oneOf } from '@/lib/listUrl';
import { PageHeader } from '@/components/layouts/PageHeader';
import { ContactsTab } from './ContactsTab';
import { OrganizationsTab } from './OrganizationsTab';

const LIST_PATH = '/directorio';
const TABS = ['organizaciones', 'contactos'] as const;
const DEFAULTS = { tab: 'organizaciones', search: '', type: '', sinOrg: '', page: '0' };

/**
 * El Directorio (SPEC-106 §7): dos pestañas, Organizaciones y Contactos. Los
 * filtros viven en la URL para encontrarlos igual al volver de una ficha.
 */
export function DirectorioScreen() {
  const { values, setValues } = useListUrlState(LIST_PATH, DEFAULTS);
  const canMaintain = useCanMaintainDirectory();
  const tab = oneOf(values.tab, TABS, 'organizaciones');
  const page = Math.max(0, Number.parseInt(values.page, 10) || 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Directorio"
        description="Unidades PUCP, empresas externas y sus personas de contacto, para elegirlas en los formularios en vez de escribirlas."
        actions={canMaintain && (
          <Link href="/directorio/registrar"
            className="rounded-md bg-forest-700 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-800">
            Registrar
          </Link>
        )} />
      <div role="tablist" aria-label="Directorio"
        className="grid auto-cols-fr grid-flow-col rounded-xl border border-neutral-200 bg-neutral-0 px-2 sm:flex sm:gap-2">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t}
            onClick={() => setValues({ tab: t, search: '', type: '', sinOrg: '', page: '0' })}
            className={`min-h-11 border-b-2 px-3 py-2 text-sm font-semibold transition-colors sm:px-4 sm:text-base ${tab === t
              ? 'border-brand-600 text-brand-700' : 'border-transparent text-neutral-700 hover:text-neutral-900'}`}>
            {t === 'organizaciones' ? 'Organizaciones' : 'Contactos'}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'organizaciones' ? (
          <OrganizationsTab search={values.search} typeCode={values.type} page={page}
            onChange={(patch) => setValues({ page: '0', ...patch })} />
        ) : (
          <ContactsTab search={values.search} withoutOrganization={values.sinOrg === 'true'} page={page}
            onChange={(patch) => setValues({ page: '0', ...patch })} />
        )}
      </div>
    </div>
  );
}
