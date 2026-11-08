'use client';

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
  const tab = oneOf(values.tab, TABS, 'organizaciones');
  const page = Math.max(0, Number.parseInt(values.page, 10) || 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Directorio"
        description="Unidades PUCP, empresas externas y sus personas de contacto, para elegirlas en los formularios en vez de escribirlas." />
      <div role="tablist" aria-label="Directorio" className="flex gap-2 border-b border-neutral-200">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t}
            onClick={() => setValues({ tab: t, search: '', type: '', sinOrg: '', page: '0' })}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t
              ? 'border-forest-700 text-forest-800' : 'border-transparent text-neutral-600 hover:text-neutral-900'}`}>
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
